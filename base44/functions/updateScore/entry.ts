import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { sheetsEnabled } from "../../shared/sheetSwitch.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Not signed in' }, { status: 401 });
    }

    // The night is sent with the edit: a net and match number repeat every week,
    // so without the date the correction could land on another night's game.
    const { net, game, rounds, date } = await req.json();
    if (!Array.isArray(rounds) || !rounds.length) {
      return Response.json({ error: 'No rounds supplied' }, { status: 400 });
    }
    const slot: any = { net: Number(net), game: Number(game) };
    if (date) slot.date = String(date);

    // Sheet switched off: correct the app's own copy of the result.
    if (!(await sheetsEnabled(base44))) {
      const total1 = rounds.reduce((s, r) => s + Number(r.score1), 0);
      const total2 = rounds.reduce((s, r) => s + Number(r.score2), 0);
      const existing = await base44.asServiceRole.entities.MatchResult.filter(
        slot,
        { limit: 5, sort: "-created_date" }
      );
      const latest = (existing.items || [])[0];
      if (!latest) {
        return Response.json({ error: 'Score entry not found' }, { status: 404 });
      }
      await base44.asServiceRole.entities.MatchResult.update(latest.id, {
        score1: total1,
        score2: total2,
        rounds,
      });
      return Response.json({ success: true });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    // Find the row in the Scores sheet
    const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`;
    const fetchRes = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const fetchData = await fetchRes.json();
    const rows = fetchData.values || [];

    // Find matching row (1-indexed, row 1 is header)
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(net) && String(rows[i][1]).trim() === String(game)) {
        rowIndex = i + 1; // 1-indexed sheet row
        break;
      }
    }

    if (rowIndex === -1) {
      return Response.json({ error: 'Score entry not found' }, { status: 404 });
    }

    const total1 = rounds.reduce((s, r) => s + Number(r.score1), 0);
    const total2 = rounds.reduce((s, r) => s + Number(r.score2), 0);
    const timestamp = new Date().toISOString();

    // Update columns D-K (scores, totals, timestamp) — keeping net/game/team names
    const updateRange = `Scores!E${rowIndex}:K${rowIndex}`;
    const values = [[
      rounds[0].score1, rounds[0].score2,
      rounds[1].score1, rounds[1].score2,
      total1, total2, timestamp
    ]];

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json();
      return Response.json({ error: err.error?.message || 'Failed to update' }, { status: 500 });
    }

    // Keep the app's own copy of the result in step so the correction shows up in
    // the app ratings immediately instead of after the next import.
    try {
      const appRows = await base44.asServiceRole.entities.MatchResult.filter(
        slot,
        { limit: 5, sort: "-created_date" }
      );
      const latest = (appRows.items || [])[0];
      if (latest) {
        await base44.asServiceRole.entities.MatchResult.update(latest.id, {
          score1: total1,
          score2: total2,
          rounds,
        });
      }
    } catch (e) {
      // The sheet row is already updated; the app copy is best effort.
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
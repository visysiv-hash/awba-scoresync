import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { net, game, rounds } = await req.json();

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

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
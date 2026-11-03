import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeAppRatings } from "../../shared/appRatings.ts";

const MAIN_SHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

// Ratings as at a round, calculated from app-stored results and round groups only.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { round } = await req.json().catch(() => ({}));

    // All stored match results (paged)
    let rows: any[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 6; i++) {
      const options: any = { sort: "round", limit: 1000 };
      if (cursor) options.cursor = cursor;
      const page = await base44.asServiceRole.entities.MatchResult.filter({}, options);
      rows = rows.concat(page.items || []);
      if (!page.has_more) break;
      cursor = page.next_cursor;
    }
    if (rows.length === 0) {
      return Response.json({ round: null, rounds: [], players: [] });
    }

    const groupPage = await base44.asServiceRole.entities.RoundGroup.filter({}, { limit: 200 });
    const groupRows = groupPage.items || [];

    const roundGroups: Record<string, number> = {};
    const startGroups: Record<string, number> = {};
    const roundDates: Record<number, string> = {};
    for (const r of groupRows) {
      const rd = Number(r.round);
      if (r.date) roundDates[rd] = r.date;
      for (const e of r.entries || []) {
        if (!e || !e.player) continue;
        const key = String(e.player).trim().toLowerCase();
        if (rd === 0) startGroups[key] = Number(e.group);
        else roundGroups[`${key}|${rd}`] = Number(e.group);
      }
    }

    // The Players tab's "Rating Base Group" re-bases a player's whole rating, which
    // is how a wrong starting group gets corrected. Read it live so an edit applies
    // straight away instead of waiting for the next import.
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
      const sheetId = Deno.env.get("STANDINGS_SPREADSHEET_ID") || MAIN_SHEET_ID;
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Players!A:G")}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await res.json();
      for (const row of (json.values || []).slice(1)) {
        const name = String(row[0] || "").trim().toLowerCase();
        const active = String(row[1] || "").trim().toLowerCase();
        const group = parseInt(row[6]);
        if (!name || active === "no" || !group) continue;
        startGroups[name] = group;
      }
    } catch (_) {
      // Sheet unavailable: fall back to the base groups from the last import.
    }

    // Scores entered in the app are stored without a round number, so give them one
    // here: the round played on that date, otherwise the next round after the last
    // known one. That makes tonight's results count immediately.
    const dateToRound: Record<string, number> = {};
    for (const [rd, date] of Object.entries(roundDates)) {
      if (date) dateToRound[date] = Number(rd);
    }
    const maxKnown = Math.max(
      0,
      ...groupRows.map((g: any) => Number(g.round) || 0),
      ...rows.map((r: any) => Number(r.round) || 0)
    );
    const pendingDates = [...new Set(rows.filter((r: any) => !(Number(r.round) > 0)).map((r: any) => r.date).filter(Boolean))].sort();
    const pendingRound: Record<string, number> = {};
    pendingDates.forEach((d: any, i) => {
      pendingRound[d] = dateToRound[d] ?? maxKnown + 1 + i;
    });
    for (const r of rows) {
      if (Number(r.round) > 0) continue;
      r.round = (r.date && pendingRound[r.date]) || maxKnown + 1;
    }

    const summary: Record<number, any> = {};
    for (const r of rows) {
      const rd = Number(r.round);
      if (!summary[rd]) summary[rd] = { round: rd, date: r.date || roundDates[rd] || null, matches: 0 };
      summary[rd].matches++;
      if (!summary[rd].date && r.date) summary[rd].date = r.date;
    }
    const rounds = Object.values(summary).sort((a: any, b: any) => b.round - a.round);

    const wanted = round && summary[Number(round)] ? Number(round) : rounds[0].round;

    const { players } = computeAppRatings(rows, roundGroups, wanted, startGroups);

    return Response.json({
      round: wanted,
      roundDate: summary[wanted]?.date || null,
      matchCount: summary[wanted]?.matches || 0,
      rounds,
      players,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
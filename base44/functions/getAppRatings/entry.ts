import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeAppRatings } from "../../shared/appRatings.ts";

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
    rows = rows.filter((r) => Number(r.round) > 0);

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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeAppRatings } from "../../shared/appRatings.ts";
import { loadAppMatchResults } from "../../shared/appMatchResults.ts";

// Ratings as at a round, calculated from app-stored results and round groups only.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { round } = await req.json().catch(() => ({}));

    // Stored results, with any sheet-only game for the current night picked up first
    const rows: any[] = await loadAppMatchResults(base44);
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

    // Base groups live in the app itself (key "base_group:<player>"), so a player's
    // starting group can be corrected without the spreadsheet, and ratings never
    // depend on the sheet being reachable. They win over imported round-0 entries.
    const baseGroups: Record<string, number> = {};
    const settingPage = await base44.asServiceRole.entities.AppSetting.filter({}, { limit: 500 });
    for (const s of settingPage.items || []) {
      const m = String(s.key || "").match(/^base_group:(.+)$/);
      const group = parseInt(s.value);
      if (!m || !group) continue;
      const name = m[1].trim().toLowerCase();
      baseGroups[name] = group;
      startGroups[name] = group;
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
      baseGroups,
      rounds,
      players,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
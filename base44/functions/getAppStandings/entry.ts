import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { loadAppMatchResults } from "../../shared/appMatchResults.ts";
import { computeAppStandings } from "../../shared/appStandings.ts";

// The app-only counterpart of getStandings: the same ladder, built from results
// stored in the app, so the leaderboard no longer needs the spreadsheet.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const rows = await loadAppMatchResults(base44);
    if (rows.length === 0) {
      return Response.json({ groups: {}, matchCount: 0 });
    }

    const groupPage = await base44.asServiceRole.entities.RoundGroup.filter({}, { limit: 200 });
    const roundGroups: Record<string, number> = {};
    const startGroups: Record<string, number> = {};
    const names: Record<string, string> = {};

    for (const r of groupPage.items || []) {
      const round = Number(r.round);
      for (const e of r.entries || []) {
        if (!e || !e.player) continue;
        const group = Number(e.group);
        if (!group) continue;
        const key = String(e.player).trim().toLowerCase();
        names[key] = String(e.player).trim();
        if (round === 0) startGroups[key] = group;
        else roundGroups[`${key}|${round}`] = group;
      }
    }

    // The app's own base groups win over imported round-0 entries, so a player's
    // starting group can be corrected without the spreadsheet.
    const settingPage = await base44.asServiceRole.entities.AppSetting.filter({}, { limit: 500 });
    for (const s of settingPage.items || []) {
      const m = String(s.key || "").match(/^base_group:(.+)$/);
      const group = parseInt(s.value);
      if (!m || !group) continue;
      const key = m[1].trim().toLowerCase();
      startGroups[key] = group;
      if (!names[key]) names[key] = m[1].trim();
    }

    const { groups } = computeAppStandings(rows, roundGroups, startGroups, names);

    return Response.json({ groups, matchCount: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
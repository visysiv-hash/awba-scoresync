import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { loadAppMatchResults } from "../../shared/appMatchResults.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player } = await req.json();

    if (!player) {
      return Response.json({ error: 'Player name required' }, { status: 400 });
    }

    // Pairings are counted from the app's stored results in both sheet modes: the
    // sheet's games tab stops at the old season, so it left every current player
    // with no partners or opponents at all.
    const rows = await loadAppMatchResults(base44);
    const target = String(player).trim().toLowerCase();
    const partnerCounts: Record<string, number> = {};
    const opponentCounts: Record<string, number> = {};

    for (const r of rows) {
      const team1 = (Array.isArray(r.team1_players) ? r.team1_players : []).map((n: string) => String(n).trim());
      const team2 = (Array.isArray(r.team2_players) ? r.team2_players : []).map((n: string) => String(n).trim());
      const inTeam1 = team1.some((n: string) => n.toLowerCase() === target);
      const inTeam2 = team2.some((n: string) => n.toLowerCase() === target);
      if (!inTeam1 && !inTeam2) continue;
      const own = inTeam1 ? team1 : team2;
      const other = inTeam1 ? team2 : team1;
      for (const p of own) {
        if (p && p.toLowerCase() !== target) partnerCounts[p] = (partnerCounts[p] || 0) + 1;
      }
      for (const p of other) {
        if (p) opponentCounts[p] = (opponentCounts[p] || 0) + 1;
      }
    }

    return Response.json({
      partners: Object.entries(partnerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      opponents: Object.entries(opponentCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      totalPartners: Object.keys(partnerCounts).length,
      totalOpponents: Object.keys(opponentCounts).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
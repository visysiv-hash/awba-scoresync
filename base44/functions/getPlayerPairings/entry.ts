import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { sheetFetch } from "../../shared/sheetCache.ts";
import { sheetsEnabled } from "../../shared/sheetSwitch.ts";
import { loadAppMatchResults } from "../../shared/appMatchResults.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player, group } = await req.json();

    if (!player) {
      return Response.json({ error: 'Player name required' }, { status: 400 });
    }

    // Sheet switched off: pairings are counted from the results stored in the app.
    if (!(await sheetsEnabled(base44))) {
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
    }

    const conn = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const sheetId = '1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U';
    
    const gamesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/games!A:Z`;
    const gamesRes = await sheetFetch(gamesUrl, conn.accessToken);
    const gamesData = await gamesRes.json();
    const rows = gamesData.values || [];

    const partnerCounts = {};
    const opponentCounts = {};

    rows.slice(1).forEach(row => {
      // Column G is index 6, Column H is index 7
      const team1Str = row[6];
      const team2Str = row[7];
      if (!team1Str || !team2Str) return;

      const team1 = team1Str.split(' & ').map(p => p.trim());
      const team2 = team2Str.split(' & ').map(p => p.trim());

      const playerInTeam1 = team1.some(p => p.toLowerCase() === player.toLowerCase());
      const playerInTeam2 = team2.some(p => p.toLowerCase() === player.toLowerCase());

      if (playerInTeam1) {
        team1.forEach(p => {
          if (p.toLowerCase() !== player.toLowerCase()) {
            partnerCounts[p] = (partnerCounts[p] || 0) + 1;
          }
        });
        team2.forEach(p => {
          opponentCounts[p] = (opponentCounts[p] || 0) + 1;
        });
      } else if (playerInTeam2) {
        team2.forEach(p => {
          if (p.toLowerCase() !== player.toLowerCase()) {
            partnerCounts[p] = (partnerCounts[p] || 0) + 1;
          }
        });
        team1.forEach(p => {
          opponentCounts[p] = (opponentCounts[p] || 0) + 1;
        });
      }
    });

    return Response.json({
      partners: Object.entries(partnerCounts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      opponents: Object.entries(opponentCounts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      totalPartners: Object.keys(partnerCounts).length,
      totalOpponents: Object.keys(opponentCounts).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
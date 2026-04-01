import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player, group } = await req.json();

    if (!player) {
      return Response.json({ error: 'Player name required' }, { status: 400 });
    }

    const conn = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const sheetId = '1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U';
    
    const gamesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/games!A:Z`;
    const gamesRes = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${conn.accessToken}` }
    });
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player, group } = await req.json();

    if (!player) {
      return Response.json({ error: 'Player name required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const sheetId = Deno.env.get('SPREADSHEET_ID');
    
    const gamesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Games!A:J`;
    const gamesRes = await fetch(`${gamesUrl}?key=${Deno.env.get('GOOGLE_API_KEY')}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const gamesData = await gamesRes.json();
    const rows = gamesData.values || [];

    const partners = new Set();
    const opponents = new Set();

    rows.slice(1).forEach(row => {
      const [netId, matchId, round, team1Str, team2Str, , , , , ] = row;
      if (!team1Str || !team2Str) return;

      const team1 = team1Str.split(' vs ')[0]?.split(' & ') || [];
      const team2 = team2Str.split(' vs ')[0]?.split(' & ') || [];

      const playerInTeam1 = team1.some(p => p.trim().toLowerCase() === player.toLowerCase());
      const playerInTeam2 = team2.some(p => p.trim().toLowerCase() === player.toLowerCase());

      if (playerInTeam1) {
        team1.forEach(p => {
          const name = p.trim();
          if (name.toLowerCase() !== player.toLowerCase()) partners.add(name);
        });
        team2.forEach(p => opponents.add(p.trim()));
      } else if (playerInTeam2) {
        team2.forEach(p => {
          const name = p.trim();
          if (name.toLowerCase() !== player.toLowerCase()) partners.add(name);
        });
        team1.forEach(p => opponents.add(p.trim()));
      }
    });

    return Response.json({
      partners: Array.from(partners).sort(),
      opponents: Array.from(opponents).sort(),
      totalPartners: partners.size,
      totalOpponents: opponents.size
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player, group } = await req.json();

    // Helper to get group number
    const getGroupNum = (groupName) => {
      const match = groupName?.match(/\d+/);
      return match ? Number(match[0]) : null;
    };

    // Get all players from standings to find group members
    const standingsRes = await base44.asServiceRole.functions.invoke('getStandings', {});
    const allGroups = standingsRes?.groups || {};
    const currentGroupNum = getGroupNum(group);
    const groupsToCheck = {};
    if (currentGroupNum) {
      [currentGroupNum - 1, currentGroupNum, currentGroupNum + 1].forEach(num => {
        if (num >= 1 && num <= 6) {
          const groupKey = Object.keys(allGroups).find(k => getGroupNum(k) === num);
          if (groupKey) {
            groupsToCheck[num] = allGroups[groupKey].map(r => r.player);
          }
        }
      });
    }

    if (!player) {
      return Response.json({ error: 'Player name required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const sheetId = '1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U';
    
    const gamesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/games!A:Z`;
    const gamesRes = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
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

    // Find missing partners and opponents
    const missingPartners = {};
    const missingOpponents = {};
    Object.entries(groupsToCheck).forEach(([groupNum, players]) => {
      const missing = players.filter(p => {
        const lowerP = p.toLowerCase();
        const lowerPlayer = player.toLowerCase();
        return lowerP !== lowerPlayer && !Object.keys(partnerCounts).some(k => k.toLowerCase() === lowerP);
      });
      if (missing.length > 0) missingPartners[groupNum] = missing;
    });
    Object.entries(groupsToCheck).forEach(([groupNum, players]) => {
      const missing = players.filter(p => {
        const lowerP = p.toLowerCase();
        const lowerPlayer = player.toLowerCase();
        return lowerP !== lowerPlayer && !Object.keys(opponentCounts).some(k => k.toLowerCase() === lowerP);
      });
      if (missing.length > 0) missingOpponents[groupNum] = missing;
    });

    return Response.json({
      partners: Object.entries(partnerCounts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      opponents: Object.entries(opponentCounts).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      missingPartners,
      missingOpponents,
      totalPartners: Object.keys(partnerCounts).length,
      totalOpponents: Object.keys(opponentCounts).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
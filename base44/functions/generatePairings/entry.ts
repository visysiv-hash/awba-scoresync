import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { availablePlayers } = await req.json();

    if (!availablePlayers || availablePlayers.length < 4) {
      return Response.json({ error: "Need at least 4 players" }, { status: 400 });
    }

    // Fetch all games to calculate head-to-head history
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const sid = Deno.env.get("SPREADSHEET_ID");
    const range = encodeURIComponent("Raw_Responses!A2:K2000");

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const rows = data.values || [];

    // Build partnership history (players who played together)
    const partnerships = {};
    const h2h = {}; // head-to-head matchups

    for (const row of rows) {
      const gameChoice = (row[1] || "").trim();
      const parts = gameChoice.split("|");
      const teamsStr = (parts[1]?.trim() || gameChoice);
      const players = teamsStr.split("&").map(p => p.trim()).filter(Boolean);
      
      if (players.length < 4) continue;

      const team1 = [players[0], players[1]];
      const team2 = [players[2], players[3]];
      const score1 = Number(row[2] || 0);
      const score2 = Number(row[3] || 0);

      // Track partnerships
      const addPartnership = (p1, p2) => {
        const key = [p1, p2].sort().join("|");
        if (!partnerships[key]) partnerships[key] = 0;
        partnerships[key]++;
      };

      addPartnership(team1[0], team1[1]);
      addPartnership(team2[0], team2[1]);

      // Track head-to-head
      const matchup1 = [team1.join("|"), team2.join("|")].sort().join("|||");
      if (!h2h[matchup1]) h2h[matchup1] = { team1Wins: 0, team2Wins: 0 };
      if (score1 === 42) h2h[matchup1].team1Wins++;
      else if (score2 === 42) h2h[matchup1].team2Wins++;
    }

    // Generate pairings trying to balance partnerships and avoid recent matchups
    const matches = [];
    const used = new Set();
    const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length - 3; i += 4) {
      if (used.has(shuffled[i]) || used.has(shuffled[i + 1]) || 
          used.has(shuffled[i + 2]) || used.has(shuffled[i + 3])) continue;

      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      const p3 = shuffled[i + 2];
      const p4 = shuffled[i + 3];

      // Try different team combinations
      const combos = [
        { team1: [p1, p2], team2: [p3, p4] },
        { team1: [p1, p3], team2: [p2, p4] },
        { team1: [p1, p4], team2: [p2, p3] },
      ];

      // Pick combo with least recent matchup history
      let bestCombo = combos[0];
      let leastMatches = Infinity;

      for (const combo of combos) {
        const matchupKey = [combo.team1.join("|"), combo.team2.join("|")].sort().join("|||");
        const matchCount = h2h[matchupKey]?.team1Wins || 0 + h2h[matchupKey]?.team2Wins || 0;
        if (matchCount < leastMatches) {
          leastMatches = matchCount;
          bestCombo = combo;
        }
      }

      // Add reasoning
      const p1p2Key = [bestCombo.team1[0], bestCombo.team1[1]].sort().join("|");
      const partnershipsCount = partnerships[p1p2Key] || 0;
      let reasoning = "";
      if (partnershipsCount > 2) {
        reasoning = "Strong existing partnership";
      } else if (leastMatches === 0) {
        reasoning = "First matchup between these teams";
      } else {
        reasoning = `${leastMatches} previous matchups between these teams`;
      }

      matches.push({
        team1: bestCombo.team1,
        team2: bestCombo.team2,
        reasoning,
      });

      [p1, p2, p3, p4].forEach(p => used.add(p));
    }

    return Response.json({ matches });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player, opponent } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const sid = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
    const range = encodeURIComponent("Raw_Responses!A2:K2000");

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const rows = data.values || [];

    const playerLower = (player || "").toLowerCase();

    const playerGames = [];
    for (const row of rows) {
      const gameChoice = (row[1] || "").trim(); // "netId | P1 & P2 & P3 & P4"
      const parts = gameChoice.split("|");
      const teamsStr = (parts[1]?.trim() || gameChoice);
      // Split by both "Vs" and "&" to handle all name formats
      const players = teamsStr.split(/\s*Vs\s*/i).flatMap(side => side.split("&")).map(p => p.trim());

      // Exact name match (case-insensitive)
      const myIdx = players.findIndex(p => p.toLowerCase() === playerLower);
      if (myIdx === -1) continue;

      const team1Score = Number(row[2] || 0);
      const team2Score = Number(row[3] || 0);
      const isTeam1 = myIdx < 2;
      const myScore = isTeam1 ? team1Score : team2Score;
      const oppScore = isTeam1 ? team2Score : team1Score;
      const myTeam = isTeam1 ? players.slice(0, 2).join(" & ") : players.slice(2).join(" & ");
      const oppTeam = isTeam1 ? players.slice(2).join(" & ") : players.slice(0, 2).join(" & ");
      const result = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "D";

      playerGames.push({
        net: parts[0]?.trim() || "",
        myTeam,
        opponent: oppTeam,
        myScore,
        oppScore,
        result,
        round: (row[10] || "").trim(),
        timestamp: (row[0] || ""),
      });
    }

    playerGames.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let h2h = null;
    if (opponent) {
      const h2hGames = playerGames.filter(g => g.opponent.toLowerCase().includes(opponent.toLowerCase()));
      const wins = h2hGames.filter(g => g.result === "W").length;
      const losses = h2hGames.filter(g => g.result === "L").length;
      const draws = h2hGames.filter(g => g.result === "D").length;
      h2h = { games: h2hGames, wins, losses, draws, total: h2hGames.length };
    }

    return Response.json({ games: playerGames, h2h });
  } catch (error) {
    return Response.json({ error: error.message });
  }
});
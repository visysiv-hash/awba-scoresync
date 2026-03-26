import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { player, opponent } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await response.json();
    const rows = (data.values || []).slice(1);

    const includes = (str, name) => str && str.toLowerCase().includes(name.toLowerCase());

    // All games where the player participated
    const playerGames = rows
      .filter(row => includes(row[2], player) || includes(row[3], player))
      .map(row => {
        const isTeam1 = includes(row[2], player);
        const myScore = isTeam1 ? Number(row[8]) : Number(row[9]);
        const oppScore = isTeam1 ? Number(row[9]) : Number(row[8]);
        const opponent = isTeam1 ? row[3] : row[2];
        const result = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "D";
        return {
          net: row[0],
          game: row[1],
          myTeam: isTeam1 ? row[2] : row[3],
          opponent,
          myScore,
          oppScore,
          result,
          timestamp: row[10] || "",
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Head-to-head if opponent provided
    let h2h = null;
    if (opponent) {
      const h2hGames = playerGames.filter(g => includes(g.opponent, opponent));
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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const { player, round } = await req.json();

    const sid = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
    const range = encodeURIComponent("Raw_Responses!A2:K5000");
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return Response.json({ error: await res.text() }, { status: 500 });
    }

    const json = await res.json();
    const rows = json.values || [];

    const playerLower = (player || "").toLowerCase();
    const games = [];

    for (const row of rows) {
      const rowRound = (row[10] || "").trim(); // col K
      const gameChoice = (row[1] || "").trim(); // col B e.g. "310 | Saideep & Ravi & Russell & Suryan"
      if (rowRound !== String(round)) continue;
      const parts0 = gameChoice.split("|");
      const teamsStr0 = (parts0[1]?.trim() || gameChoice);
      // Split by both "Vs" and "&" to handle all name formats
      const gamePlayers = teamsStr0.split(/\s*Vs\s*/i).flatMap(side => side.split("&")).map(p => p.trim().toLowerCase());
      if (!gamePlayers.includes(playerLower)) continue;

      // Parse: "310 | Team1 & Player & ... vs Team2..." — col B format: "netId | all players listed"
      // Scores: col C = team1 score, col D = team2 score
      const parts = gameChoice.split("|");
      const netId = parts[0]?.trim() || "";
      const teamsStr = parts[1]?.trim() || gameChoice;

      games.push({
        netId,
        gameChoice: teamsStr,
        team1Score: row[2] || "—",
        team2Score: row[3] || "—",
        timestamp: (row[0] || "").split(" ")[0],
      });
    }

    return Response.json({ games });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
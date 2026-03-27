import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const spreadsheetId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    const range = encodeURIComponent("Group_Leaderboards!A1:K500");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    const rows = json.values || [];

    // Parse the same way as getStandings
    const stats = {};
    let skipNextRow = false;

    for (const row of rows) {
      const firstCell = (row[0] || "").trim();

      if (firstCell.includes("Leaderboard") && row.filter(c => c.trim()).length <= 1) {
        skipNextRow = true;
        continue;
      }
      if (skipNextRow) { skipNextRow = false; continue; }
      if (!firstCell) continue;

      const player = row[0] || "";
      const gp = Number(row[1]) || 0;
      const wins = Number(row[2]) || 0;
      // pointsFor (col 6) and pointsAgainst (col 7) are total points across all games
      const pointsFor = Number(row[6]) || 0;
      const pointsAgainst = Number(row[7]) || 0;

      // Each game = 2 rounds. Total rounds played = gp * 2.
      // Reverse-calculate rounds won: each game the winner takes more points.
      // Best estimate: rounds won = wins (games won) * 2 - losses in rounds
      // Since we only have total points, use: roundsWon ≈ wins (each win = at least 1 round won)
      // More accurate: total points scored vs 21*rounds gives round wins
      // With 2 rounds per game and max 21 per round:
      //   roundsWon = floor(pointsFor / 21) is not reliable either.
      // Best available: use wins as rounds won (each match win = winning more rounds).
      // If total points available, rounds won = wins since each game-win means winning more rounds.

      const key = player.toLowerCase();
      if (!stats[key]) {
        stats[key] = { player, roundsWon: wins, roundsPlayed: gp, pointsFor, pointsAgainst };
      } else {
        // player appears in multiple groups, sum them
        stats[key].roundsWon += wins;
        stats[key].roundsPlayed += gp;
        stats[key].pointsFor += pointsFor;
        stats[key].pointsAgainst += pointsAgainst;
      }
    }

    return Response.json({ stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
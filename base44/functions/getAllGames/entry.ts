import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    // Fetch schedule and scores in parallel
    const [scheduleRes, scoresRes] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:E`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    ]);

    const scheduleData = await scheduleRes.json();
    const scoresData = await scoresRes.json();
    const scheduleRows = (scheduleData.values || []).slice(1);
    const scoresRows = (scoresData.values || []).slice(1);

    const games = scheduleRows
      .filter(row => row[0] && row[1])
      .map(row => {
        const net = String(row[0]).trim();
        const game = String(row[1]).trim();
        const team1 = row[2] || "";
        const team2 = row[3] || "";

        const scoreRow = scoresRows.find(s =>
          String(s[0]).trim() === net && String(s[1]).trim() === game
        );

        if (scoreRow) {
          return {
            net, game, team1, team2,
            scored: true,
            rounds: [
              { score1: scoreRow[4], score2: scoreRow[5] },
              { score1: scoreRow[6], score2: scoreRow[7] },
            ],
            total1: scoreRow[8],
            total2: scoreRow[9],
            timestamp: scoreRow[10],
          };
        }

        return { net, game, team1, team2, scored: false };
      })
      .sort((a, b) => Number(a.net) - Number(b.net) || Number(a.game) - Number(b.game));

    return Response.json({ games });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
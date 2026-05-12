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

        // Match by net+game (col A/B for app-submitted, or col B/C for manually-entered rows with blank col A)
        const scoreRow = scoresRows.find(s =>
          (String(s[0]).trim() === net && String(s[1]).trim() === game) ||
          (!s[0]?.trim() && String(s[1]).trim() === net && String(s[2]).trim() === game)
        );

        if (scoreRow) {
          const offset = !scoreRow[0]?.trim() ? 1 : 0;
          return {
            net, game, team1, team2,
            scored: true,
            rounds: [
              { score1: scoreRow[4 + offset], score2: scoreRow[5 + offset] },
              { score1: scoreRow[6 + offset], score2: scoreRow[7 + offset] },
            ],
            total1: scoreRow[8 + offset],
            total2: scoreRow[9 + offset],
            timestamp: scoreRow[10 + offset],
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
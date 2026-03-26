import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    // Fetch schedule sheet
    const scheduleUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:E`;
    const scheduleRes = await fetch(scheduleUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const scheduleData = await scheduleRes.json();
    const scheduleRows = (scheduleData.values || []).slice(1); // skip header

    // Fetch scores sheet
    const scoresUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`;
    const scoresRes = await fetch(scoresUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const scoresData = await scoresRes.json();
    const scoresRows = (scoresData.values || []).slice(1); // skip header

    const q = query.toLowerCase();

    // Filter schedule rows matching query
    const matched = scheduleRows.filter(row => {
      const team1 = String(row[2] || "").toLowerCase();
      const team2 = String(row[3] || "").toLowerCase();
      return team1.includes(q) || team2.includes(q);
    });

    // Build results with score data if available
    const results = matched.map(row => {
      const net = String(row[0]).trim();
      const game = String(row[1]).trim();
      const team1 = row[2];
      const team2 = row[3];

      // Find matching score row
      const scoreRow = scoresRows.find(s =>
        String(s[0]).trim() === net && String(s[1]).trim() === game
      );

      if (scoreRow) {
        return {
          net, game, team1, team2,
          submitted: true,
          rounds: [
            { score1: scoreRow[4], score2: scoreRow[5] },
            { score1: scoreRow[6], score2: scoreRow[7] },
          ],
          total1: scoreRow[8],
          total2: scoreRow[9],
          timestamp: scoreRow[10],
        };
      }

      return { net, game, team1, team2, submitted: false };
    });

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message });
  }
});
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

    // Filter schedule rows matching query - full word/name match only
    const matched = scheduleRows.filter(row => {
      const team1 = String(row[2] || "").toLowerCase().trim();
      const team2 = String(row[3] || "").toLowerCase().trim();
      // Split teams by " / " or "," and check if any individual name matches exactly
      const names1 = team1.split(/[/,&]/).map(n => n.trim());
      const names2 = team2.split(/[/,&]/).map(n => n.trim());
      const allNames = [...names1, ...names2];
      return allNames.some(name => name.includes(q)) || team1.includes(q) || team2.includes(q);
    });

    // Build results with score data if available, sorted by game number
    const results = matched.map(row => {
      const net = String(row[0]).trim();
      const game = String(row[1]).trim();
      const team1 = row[2];
      const team2 = row[3];

      const scoreRow = scoresRows.find(s =>
        (String(s[0]).trim() === net && String(s[1]).trim() === game) ||
        (!s[0]?.trim() && String(s[1]).trim() === net && String(s[2]).trim() === game)
      );

      if (scoreRow) {
        const offset = !scoreRow[0]?.trim() ? 1 : 0;
        return {
          net, game, team1, team2,
          submitted: true,
          rounds: [
            { score1: scoreRow[4 + offset], score2: scoreRow[5 + offset] },
            { score1: scoreRow[6 + offset], score2: scoreRow[7 + offset] },
          ],
          total1: scoreRow[8 + offset],
          total2: scoreRow[9 + offset],
          timestamp: scoreRow[10 + offset],
        };
      }

      return { net, game, team1, team2, submitted: false };
    }).sort((a, b) => Number(a.game) - Number(b.game));

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message });
  }
});
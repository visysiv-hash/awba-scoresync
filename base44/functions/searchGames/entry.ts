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

    // Fetch schedule + scores sheets in parallel
    const scheduleUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:E`;
    const scoresUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`;
    const [scheduleRes, scoresRes] = await Promise.all([
      fetch(scheduleUrl, { headers: { Authorization: `Bearer ${accessToken}` } } ),
      fetch(scoresUrl, { headers: { Authorization: `Bearer ${accessToken}` } } ),
    ]);
    const [scheduleData, scoresData] = await Promise.all([scheduleRes.json(), scoresRes.json()]);
    const scheduleRows = (scheduleData.values || []).slice(1); // skip header
    const scoresRows = (scoresData.values || []); // no header row in Scores sheet

    // Build a hash map of scores for O(1) lookup
    const norm = (v) => String(v || "").trim().toLowerCase();
    const scoreMap = new Map();
    for (const s of scoresRows) {
      const net = String(s[0]).trim();
      const game = String(s[1]).trim();
      const a = norm(s[2]);
      const b = norm(s[3]);
      if (!net || !game) continue;
      scoreMap.set(`${net}|${game}|${a}|${b}`, s);
      scoreMap.set(`${net}|${game}|${b}|${a}`, s);
    }

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

      // Match by net+game AND team names — prevents cross-round collisions
      const t1 = norm(team1);
      const t2 = norm(team2);
      const scoreRow = scoreMap.get(`${net}|${game}|${t1}|${t2}`);

      if (scoreRow) {
        // App-submitted: E=r1s1. Manually-entered: E=blank, F=r1s1
        const isManual = !scoreRow[4]?.trim();
        return {
          net, game, team1, team2,
          submitted: true,
          rounds: isManual ? [
            { score1: scoreRow[5], score2: scoreRow[6] },
            { score1: scoreRow[7], score2: scoreRow[8] },
          ] : [
            { score1: scoreRow[4], score2: scoreRow[5] },
            { score1: scoreRow[6], score2: scoreRow[7] },
          ],
          total1: isManual ? scoreRow[9] : scoreRow[8],
          total2: isManual ? scoreRow[10] : scoreRow[9],
          timestamp: isManual ? null : scoreRow[10],
        };
      }

      return { net, game, team1, team2, submitted: false };
    }).sort((a, b) => Number(a.game) - Number(b.game));

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message });
  }
});
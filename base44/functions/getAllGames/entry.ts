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
    const scoresRows = (scoresData.values || []); // no header row in Scores sheet

    // Build a hash map of scores for O(1) lookup (keyed by net|game|teamA|teamB, both orderings)
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

    const games = scheduleRows
      .filter(row => row[0] && row[1])
      .map(row => {
        const net = String(row[0]).trim();
        const game = String(row[1]).trim();
        const team1 = row[2] || "";
        const team2 = row[3] || "";

        const t1 = norm(team1);
        const t2 = norm(team2);
        const scoreRow = scoreMap.get(`${net}|${game}|${t1}|${t2}`);

        if (scoreRow) {
          // App-submitted: A=net,B=game,C=t1,D=t2,E=r1s1,F=r1s2,G=r2s1,H=r2s2,I=tot1,J=tot2,K=ts
          // Manually-entered: A=net,B=game,C=t1,D=t2,E=blank,F=r1s1,G=r1s2,H=r2s1,I=r2s2,J=tot1,K=tot2
          const isManual = !scoreRow[4]?.trim();
          return {
            net, game, team1, team2,
            scored: true,
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

        return { net, game, team1, team2, scored: false };
      })
      .sort((a, b) => Number(a.net) - Number(b.net) || Number(a.game) - Number(b.game));

    return Response.json({ games });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
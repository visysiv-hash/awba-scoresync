import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { sheetsEnabled } from "../../shared/sheetSwitch.ts";
import { deadlinePassed, isNoResult } from "../../shared/noResult.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, date: wantedDate } = await req.json();

    // Tonight's games come from the app's own saved schedule (the Schedule page) and
    // the app's stored scores, so the search no longer depends on the spreadsheet.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
    const nightRows: any = await base44.asServiceRole.entities.DrawNight.filter({});
    const all: any[] = Array.isArray(nightRows) ? nightRows : nightRows.items || [];

    // A draw deleted from the Schedule, or one the committee hasn't published yet,
    // is left out completely — so no games linger here without a draw.
    const nights = all.filter((n: any) => !n.archived && n.published !== false);

    const days = (iso: string) =>
      Math.abs(new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000;
    // A specific night can be asked for (e.g. testing another session); otherwise only
    // a night that is still open for scoring is used, so a missing draw tonight never
    // shows another week's games.
    const wanted = String(wantedDate || "").trim();
    const night = wanted
      ? nights.find((n: any) => String(n.date) === wanted)
      : [...nights]
          .filter((n: any) => !deadlinePassed(String(n.date)))
          .sort((a: any, b: any) => days(a.date) - days(b.date))[0];
    const date = night?.date || wanted || today;

    if (!night) return Response.json({ results: [], date });

    if (night) {
      const q = String(query || "").trim().toLowerCase();
      // After Thursday 11:59pm the night is closed and a missing score counts as
      // the no-submission penalty, so entry is no longer offered.
      const closed = deadlinePassed(date);
      const results = (night.matches || [])
        .filter((m: any) =>
          [...(m.team1 || []), ...(m.team2 || [])].some((n: string) =>
            String(n || "").toLowerCase().includes(q)
          )
        )
        .map((m: any): any => {
          const game = {
            net: String(m.net),
            game: String(m.game),
            team1: (m.team1 || []).join(" & "),
            team2: (m.team2 || []).join(" & "),
          };
          return { ...game, submitted: false, closed };
        })
        .sort((a: any, b: any) => Number(a.game) - Number(b.game));

      const scoreRows: any = await base44.asServiceRole.entities.MatchResult.filter({ date });
      const scored: any[] = Array.isArray(scoreRows) ? scoreRows : scoreRows.items || [];
      const bySlot = new Map<string, any>();
      for (const r of scored) bySlot.set(`${Number(r.net)}|${Number(r.game)}`, r);

      for (const result of results) {
        const stored = bySlot.get(`${Number(result.net)}|${Number(result.game)}`);
        if (!stored) continue;
        const rounds = Array.isArray(stored.rounds) ? stored.rounds : [];
        result.submitted = true;
        result.noResult = isNoResult(stored);
        result.rounds = rounds;
        result.total1 = stored.score1 ?? rounds.reduce((t, r) => t + (Number(r.score1) || 0), 0);
        result.total2 = stored.score2 ?? rounds.reduce((t, r) => t + (Number(r.score2) || 0), 0);
      }

      return Response.json({ results, date });
    }

    // Sheet switched off: with no saved draw for that night there is nothing to show.
    if (!(await sheetsEnabled(base44))) return Response.json({ results: [], date });

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
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { sheetFetch, LIVE_TTL_MS } from "../../shared/sheetCache.ts";
import { sheetsEnabled } from "../../shared/sheetSwitch.ts";
import { appGamesFor } from "../../shared/appNight.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Sheet switched off: today's results come from the app's own saved scores.
    if (!(await sheetsEnabled(base44))) {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date());
      const { games } = await appGamesFor(base44, today);
      const results = games
        .filter((g: any) => g.scored)
        .map((g: any) => ({
          net: g.net,
          game: g.game,
          team1: g.team1,
          team2: g.team2,
          rounds: g.rounds,
          total1: g.total1,
          total2: g.total2,
          timestamp: g.timestamp,
        }));
      return Response.json({ results });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`;
    const response = await sheetFetch(url, accessToken, LIVE_TTL_MS);
    const data = await response.json();
    const rows = (data.values || []); // no header row in Scores sheet

    // Filter to today's results (Australia/Sydney timezone)
    const todayStr = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' });

    const filtered = rows.filter(row => {
      if (!row[10]) return false;
      const rowDate = new Date(row[10]).toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' });
      return rowDate === todayStr;
    });

    const results = filtered.map(row => ({
      net: row[0],
      game: row[1],
      team1: row[2],
      team2: row[3],
      rounds: [
        { score1: row[4], score2: row[5] },
        { score1: row[6], score2: row[7] },
      ],
      total1: Number(row[8]),
      total2: Number(row[9]),
      timestamp: row[10],
    }));

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message });
  }
});
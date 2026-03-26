import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await response.json();
    const rows = (data.values || []).slice(1); // skip header

    const results = rows.map(row => ({
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
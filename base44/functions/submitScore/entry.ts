import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { netNumber, gameNumber, team1, team2, score1, score2 } = await req.json();

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
  const rawId = Deno.env.get("SPREADSHEET_ID") || "";
  const spreadsheetId = rawId.includes("/spreadsheets/d/")
    ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
    : rawId.split("/")[0].split("?")[0];

  const timestamp = new Date().toISOString();
  const values = [[netNumber, gameNumber, team1, team2, score1, score2, timestamp]];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:G:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: err }, { status: 500 });
  }

  return Response.json({ success: true });
});
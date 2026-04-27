import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { netNumber, gameNumber, team1, team2, rounds, total1, total2 } = await req.json();

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
  const rawId = Deno.env.get("SPREADSHEET_ID") || "";
  const spreadsheetId = rawId.includes("/spreadsheets/d/")
    ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
    : rawId.split("/")[0].split("?")[0];

  const now = new Date();
  const timestamp = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  // Build row: Net, Game, Team1, Team2, R1_T1, R1_T2, R2_T1, R2_T2, Total1, Total2, Timestamp
  const r1 = rounds[0] || { score1: 0, score2: 0 };
  const r2 = rounds[1] || { score1: 0, score2: 0 };
  const values = [[
    netNumber, gameNumber, team1, team2,
    r1.score1, r1.score2,
    r2.score1, r2.score2,
    total1, total2,
    timestamp
  ]];

  // Find the first empty row by reading column A only
  const colARes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:A`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const colAData = await colARes.json();
  const colAValues = colAData.values || [];
  const nextRow = colAValues.length + 1; // 1-indexed, next empty row

  // Write directly to that row in columns A:K
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A${nextRow}:K${nextRow}?valueInputOption=USER_ENTERED`;
  const response = await fetch(writeUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const err = await response.text();
    return Response.json({ error: err });
  }

  return Response.json({ success: true });
});
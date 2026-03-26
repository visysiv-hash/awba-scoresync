import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { netNumber, gameNumber } = await req.json();

  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
  const spreadsheetId = Deno.env.get("SPREADSHEET_ID");

  // Fetch all data from Sheet1 (schedule sheet)
  const range = "Sheet1!A:D";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await response.json();
  const rows = data.values || [];

  // Find matching row (skip header row 0)
  const match = rows.find((row, i) => {
    if (i === 0) return false; // skip header
    return String(row[0]).trim() === String(netNumber) && String(row[1]).trim() === String(gameNumber);
  });

  if (!match) {
    return Response.json({ error: "Game not found for the selected Net and Game number." }, { status: 404 });
  }

  return Response.json({
    net: match[0],
    game: match[1],
    team1: match[2],
    team2: match[3],
  });
});
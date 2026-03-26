import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { netNumber, gameNumber } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    // Strip any extra URL parts if user pasted full URL
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const range = "Sheet1!A:D";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Sheets API error:", text);
      return Response.json({ error: "Failed to fetch from Google Sheets: " + text });
    }

    const data = JSON.parse(text);
    const rows = data.values || [];

    // Find matching row (skip header row 0)
    // Sheet uses "Net 5" / "Game 1" format, so we match flexibly
    const match = rows.find((row, i) => {
      if (i === 0) return false;
      const rowNet = String(row[0]).trim().replace(/^net\s*/i, "");
      const rowGame = String(row[1]).trim().replace(/^game\s*/i, "");
      return rowNet === String(netNumber) && rowGame === String(gameNumber);
    });

    if (!match) {
      return Response.json({ error: `No game found for Net ${netNumber}, Game ${gameNumber}.` });
    }

    return Response.json({
      net: match[0],
      game: match[1],
      team1: match[2],
      team2: match[3],
    });
  } catch (error) {
    console.error("Error:", error.message);
    return Response.json({ error: error.message });
  }
});
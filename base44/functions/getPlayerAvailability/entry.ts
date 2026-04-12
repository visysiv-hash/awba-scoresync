import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const sheetId = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

    // Fetch player names from column B starting B17
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/PlayerAvailability!B17:B`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    const rows = json.values || [];

    const players = rows
      .map(row => (row[0] || "").trim())
      .filter(name => name.length > 0);

    return Response.json({ players });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
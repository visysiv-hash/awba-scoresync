import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const sid = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
    const range = encodeURIComponent("Players!A2:A500");

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const rows = data.values || [];
    const playerList = rows.map(row => (row[0] || "").trim()).filter(Boolean).sort();
    return Response.json({ players: playerList });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
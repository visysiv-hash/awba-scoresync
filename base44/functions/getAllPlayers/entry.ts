import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const sid = Deno.env.get("SPREADSHEET_ID");
    const range = encodeURIComponent("Raw_Responses!A2:K2000");

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const rows = data.values || [];

    const players = new Set();
    for (const row of rows) {
      const gameChoice = (row[1] || "").trim();
      const parts = gameChoice.split("|");
      const teamsStr = (parts[1]?.trim() || gameChoice);
      const playerNames = teamsStr.split("&").map(p => p.trim()).filter(Boolean);
      playerNames.forEach(name => players.add(name));
    }

    const playerList = Array.from(players).sort();
    return Response.json({ players: playerList });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
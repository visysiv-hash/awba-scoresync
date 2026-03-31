import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
  const spreadsheetId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

  const range = encodeURIComponent("Group_Round_Standings!A1:Z2000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: err }, { status: 500 });
  }

  const json = await res.json();
  const rows = json.values || [];

  if (rows.length === 0) return Response.json({ rounds: [], data: {} });

  // First row is headers
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  // Group by round
  const roundIndex = headers.indexOf("round");
  const rounds = new Set();
  const data = {}; // { round: [{ player, wins, losses, pointsFor, pointsAgainst, diff, ... }] }

  for (const row of dataRows) {
    const round = row[roundIndex] || "";
    if (!round) continue;
    rounds.add(round);
    if (!data[round]) data[round] = [];

    const entry = {};
    headers.forEach((h, i) => { entry[h] = row[i] || ""; });
    data[round].push(entry);
  }

  return Response.json({ rounds: Array.from(rounds), data });
});
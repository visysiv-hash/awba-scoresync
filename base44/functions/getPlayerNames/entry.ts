import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!C:D`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    const rows = (data.values || []).slice(1); // skip header

    const namesSet = new Set();
    for (const row of rows) {
      // team1 and team2 may contain "Name1 & Name2" or "Name1 / Name2"
      [row[0], row[1]].forEach(cell => {
        if (!cell) return;
        cell.split(/[&/,]/).forEach(n => {
          const name = n.trim();
          if (name) namesSet.add(name);
        });
      });
    }

    const names = [...namesSet].sort();
    return Response.json({ names });
  } catch (error) {
    return Response.json({ error: error.message });
  }
});
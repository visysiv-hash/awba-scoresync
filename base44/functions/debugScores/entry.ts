import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const rows = data.values || [];

    // Return first 10 rows with index and raw values
    return Response.json({
      header: rows[0],
      rows: rows.slice(1, 10).map((r, i) => ({
        rowIndex: i + 2,
        A: r[0], B: r[1], C: r[2], D: r[3], E: r[4], F: r[5], G: r[6], H: r[7], I: r[8], J: r[9], K: r[10],
        raw: r
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
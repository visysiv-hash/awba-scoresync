import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MEMBER_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Fetch columns A through K; we display A–I and skip J & K.
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${MEMBER_SPREADSHEET_ID}/values/MemberData!A:K`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    const allRows = data.values || [];

    const headerRow = allRows[0] || [];
    // Keep columns A–I (indices 0–8); exclude J (9) & K (10)
    const headers = headerRow.slice(0, 9);

    const rows = allRows.slice(1).map((r, i) => {
      const cells = r.slice(0, 9);
      return {
        row_number: i + 2, // sheet row number (header is row 1)
        paid: String(r[8] || "").trim(),
        cells,
      };
    }).filter(r => r.cells.some(c => String(c || "").trim() !== ""));

    return Response.json({ headers, rows });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
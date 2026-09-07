import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MEMBER_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const rowNumber = Number(body.row_number);
    if (!rowNumber || rowNumber < 2) {
      return Response.json({ error: "Invalid row number" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Write "Paid" into column I for the given row.
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${MEMBER_SPREADSHEET_ID}/values/MemberData!I${rowNumber}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [["Paid"]] }),
    });
    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: data.error?.message || "Sheets API error" }, { status: res.status });
    }

    return Response.json({ success: true, updated: data.updatedCells });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
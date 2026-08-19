import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MEMBER_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${MEMBER_SPREADSHEET_ID}/values/MemberData!A:D`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    const rows = (data.values || []).slice(1); // skip header

    const roster = rows
      .map(r => ({
        display_name: String(r[0] || "").trim(),
        email: String(r[1] || "").trim(),
        phone: String(r[2] || "").trim(),
        full_name: String(r[3] || "").trim(),
      }))
      .filter(m => m.display_name && m.email);

    return Response.json({ roster });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
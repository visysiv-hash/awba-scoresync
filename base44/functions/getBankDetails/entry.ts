import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/'Bank Account Details'!A:B`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    const rows = data.values || [];

    // Column A = label, Column B = value
    const map: Record<string, string> = {};
    for (const r of rows) {
      const key = String(r[0] || "").trim().toLowerCase();
      const val = String(r[1] || "").trim();
      if (key) map[key] = val;
    }

    const find = (...keys: string[]) => {
      for (const k of keys) if (map[k]) return map[k];
      return "";
    };

    const bank_details = {
      account_name: find("account name", "name", "account_name"),
      bsb: find("bsb"),
      account_number: find("account number", "account_number", "account no", "acct number", "account no."),
    };

    return Response.json({ bank_details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
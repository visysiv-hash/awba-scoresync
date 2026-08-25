import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MEMBER_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const SHEET = "MemberData";

/**
 * Sanitizes a raw phone input into a bare Australian mobile number (9 digits, leading 4).
 * - Strips whitespace, parentheses, dashes, spaces.
 * - Strips "+61" / "61" country code prefix.
 * - Strips a leading "0".
 * - Validates the result is exactly 9 digits starting with "4".
 * Returns { mobile, phone } where:
 *   mobile = bare 9-digit number (Column G)
 *   phone  = "0" + mobile (Column C)
 */
function sanitizeAustralianMobile(raw: string): { mobile: string; phone: string } | null {
  if (!raw) return null;
  let s = String(raw).replace(/[\s()\-\+]/g, "");

  // Strip country code 61 at the start
  if (s.startsWith("61")) s = s.slice(2);

  // Strip leading zeros
  s = s.replace(/^0+/, "");

  // Australian mobile: 9 digits starting with 4
  if (!/^4\d{8}$/.test(s)) return null;

  return { mobile: s, phone: "0" + s };
}

function normalizeDateOfBirth(s: string): string {
  if (!s) return "";
  const str = String(s).trim();
  // Accept dd/mm/yyyy or d/m/yyyy and keep as-is (matches existing sheet format)
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  // Accept yyyy-mm-dd and convert to dd/mm/yyyy
  const m2 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) return `${m2[3].padStart(2, "0")}/${m2[2].padStart(2, "0")}/${m2[1]}`;
  return str;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const body = await req.json();
    const display_name = String(body.display_name || "").trim();
    const email = String(body.email || "").trim();
    const full_name = String(body.full_name || "").trim();
    const dob = normalizeDateOfBirth(String(body.dob || ""));
    const gender = String(body.gender || "").trim();
    const bv_member = String(body.bv_member || "").trim();

    if (!display_name || !email || !full_name || !bv_member) {
      return Response.json({ error: "Display name, email, full name and BV member ID are required." }, { status: 400 });
    }

    const phoneResult = sanitizeAustralianMobile(body.phone || "");
    if (!phoneResult) {
      return Response.json({
        error: "Phone number must be a valid Australian mobile (e.g. 0412345678 or +61412345678)."
      }, { status: 400 });
    }

    // Column order: A display_name, B email, C phone, D full_name, E dob, F gender, G mobile, H bv_member
    const row = [
      display_name,
      email,
      phoneResult.phone,   // Column C — full number with leading 0
      full_name,
      dob,
      gender,
      phoneResult.mobile,  // Column G — bare mobile (no leading 0 / country code)
      bv_member,
    ];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${MEMBER_SPREADSHEET_ID}/values/${SHEET}!A:H:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Failed to add member: ${err}` }, { status: 500 });
    }

    return Response.json({
      success: true,
      member: {
        display_name,
        email,
        phone: phoneResult.phone,
        full_name,
        dob,
        gender,
        mobile: phoneResult.mobile,
        bv_member,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
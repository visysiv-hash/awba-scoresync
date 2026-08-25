import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MEMBER_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const SHEET = "MemberData";

function normalizeDate(s: string): string {
  if (!s) return "";
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const m2 = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  return String(s).trim();
}

function normalizePhone(s: string): string {
  return String(s || "").replace(/\s+/g, "").replace(/^0+/, "");
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${MEMBER_SPREADSHEET_ID}/values/${SHEET}!A:H`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    const rows = (data.values || []).slice(1);

    const members = rows.map(r => ({
      display_name: String(r[0] || "").trim(),
      email: String(r[1] || "").trim().toLowerCase(),
      phone: String(r[2] || "").trim(),
      full_name: String(r[3] || "").trim(),
      dob: String(r[4] || "").trim(),
      gender: String(r[5] || "").trim(),
      mobile: String(r[6] || "").trim(),
      bv_member: String(r[7] || "").trim(),
    })).filter(m => m.bv_member);

    const body = await req.json();

    // Mode 1: Verify by BV member ID
    if (body.memberId) {
      const member = members.find(m => m.bv_member === String(body.memberId).trim());
      if (member) {
        return Response.json({
          valid: true,
          member: {
            display_name: member.display_name,
            full_name: member.full_name,
            email: member.email,
            bv_member: member.bv_member,
          }
        });
      }
      return Response.json({ valid: false, error: "Member ID not found." });
    }

    // Mode 2: Recover by email, phone, DOB
    const email = String(body.email || "").trim().toLowerCase();
    const phone = normalizePhone(body.phone || "");
    const dob = normalizeDate(body.dob || "");

    if (email || phone || dob) {
      const member = members.find(m => {
        const emailMatch = email && m.email === email;
        const phoneMatch = phone && (normalizePhone(m.phone) === phone || normalizePhone(m.mobile) === phone);
        const dobMatch = dob && normalizeDate(m.dob) === dob;
        return emailMatch && phoneMatch && dobMatch;
      });

      if (member) {
        return Response.json({
          found: true,
          bv_member: member.bv_member,
          display_name: member.display_name,
        });
      }
      return Response.json({ found: false, error: "No matching member found. Check your details or register if you're new." });
    }

    return Response.json({ error: "Either memberId or email/phone/dob is required" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
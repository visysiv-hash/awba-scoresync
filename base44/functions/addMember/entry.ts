import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Sanitizes a raw phone input into a bare Australian mobile number (9 digits, leading 4).
 * Returns { mobile, phone } where:
 *   mobile = bare 9-digit number
 *   phone  = "0" + mobile
 */
function sanitizeAustralianMobile(raw: string): { mobile: string; phone: string } | null {
  if (!raw) return null;
  let s = String(raw).replace(/[\s()\-\+]/g, "");

  if (s.startsWith("61")) s = s.slice(2);
  s = s.replace(/^0+/, "");

  if (!/^4\d{8}$/.test(s)) return null;
  return { mobile: s, phone: "0" + s };
}

function normalizeDateOfBirth(s: string): string {
  if (!s) return "";
  const str = String(s).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  const m2 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) return `${m2[3].padStart(2, "0")}/${m2[2].padStart(2, "0")}/${m2[1]}`;
  return str;
}

// New members are saved in the app's own Member records.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const display_name = String(body.display_name || "").trim();
    const email = String(body.email || "").trim();
    const full_name = String(body.full_name || "").trim();
    const dob = normalizeDateOfBirth(String(body.dob || ""));
    const gender = String(body.gender || "").trim();
    const bv_member = String(body.bv_member || "").trim().replace(/^BV/i, "");

    if (!display_name || !email || !full_name || !bv_member) {
      return Response.json({ error: "Display name, email, full name and BV member ID are required." }, { status: 400 });
    }

    const phoneResult = sanitizeAustralianMobile(body.phone || "");
    if (!phoneResult) {
      return Response.json({
        error: "Phone number must be a valid Australian mobile (e.g. 0412345678 or +61412345678)."
      }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Member.filter({ bv_member }, { limit: 5 });
    if ((existing.items || []).length > 0) {
      return Response.json({ error: `BV member ID ${bv_member} already belongs to ${existing.items[0].display_name}.` }, { status: 400 });
    }

    const member = {
      display_name,
      email,
      phone: phoneResult.phone,
      full_name,
      dob,
      gender,
      mobile: phoneResult.mobile,
      bv_member,
      paid: false,
      is_admin: body.is_admin === true,
      active: true,
    };

    const created = await base44.asServiceRole.entities.Member.create(member);

    return Response.json({ success: true, member: { ...member, id: created.id } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
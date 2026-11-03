import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Member identity now lives in the app's own Member records (copied once from the
// MemberData sheet), so login no longer depends on the spreadsheet being reachable.

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

async function loadMembers(base44) {
  const page = await base44.asServiceRole.entities.Member.filter({}, { limit: 500 });
  const members = (page.items || []).map((m) => ({
    display_name: m.display_name || "",
    email: String(m.email || "").trim().toLowerCase(),
    phone: String(m.phone || "").trim(),
    mobile: String(m.mobile || "").trim(),
    full_name: m.full_name || "",
    dob: m.dob || "",
    bv_member: String(m.bv_member || "").trim(),
    is_admin: m.is_admin === true,
  }));

  const byId = new Map();
  for (const m of members) if (m.bv_member) byId.set(m.bv_member, m);
  return { members, byId };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Mode 0: Warm-up — the login screen calls this so nothing is cold on first keypress.
    if (body.warmup) return Response.json({ ok: true });

    const { members, byId } = await loadMembers(base44);

    // Mode 1: Verify by BV member ID — ignore a leading "BV" prefix
    if (body.memberId) {
      const id = String(body.memberId).trim().replace(/^BV/i, "");
      const member = byId.get(id);
      if (member) {
        return Response.json({
          valid: true,
          member: {
            display_name: member.display_name,
            full_name: member.full_name,
            email: member.email,
            dob: member.dob,
            bv_member: member.bv_member,
            is_admin: member.is_admin,
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
      const member = members.find((m) => {
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
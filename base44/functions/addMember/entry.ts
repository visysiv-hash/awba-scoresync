import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sanitizeAustralianMobile, normalizeDateOfBirth } from "../../shared/memberFields.ts";

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
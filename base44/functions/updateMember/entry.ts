import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sanitizeAustralianMobile, normalizeDateOfBirth } from "../../shared/memberFields.ts";

// Saves an admin's edits to a member's own details. Paid and admin flags have
// their own switches in the member list, so they are left alone here.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const memberId = String(body.member_id || "").trim();
    if (!memberId) {
      return Response.json({ error: "member_id is required" }, { status: 400 });
    }

    const display_name = String(body.display_name || "").trim();
    const email = String(body.email || "").trim();
    const full_name = String(body.full_name || "").trim();
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

    // A BV member ID belongs to exactly one member, so refuse one already in use.
    const clash = await base44.asServiceRole.entities.Member.filter({ bv_member }, { limit: 5 });
    const others = (clash.items || []).filter((m: any) => m.id !== memberId);
    if (others.length > 0) {
      return Response.json({ error: `BV member ID ${bv_member} already belongs to ${others[0].display_name}.` }, { status: 400 });
    }

    const changes = {
      display_name,
      email,
      full_name,
      bv_member,
      phone: phoneResult.phone,
      mobile: phoneResult.mobile,
      dob: normalizeDateOfBirth(String(body.dob || "")),
      gender: String(body.gender || "").trim(),
      active: body.active !== false,
    };

    const updated = await base44.asServiceRole.entities.Member.update(memberId, changes);
    return Response.json({ success: true, member: { id: updated.id, ...changes } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
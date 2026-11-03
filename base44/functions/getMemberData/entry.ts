import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Member list for the admin screen, straight from the app's own records.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const page = await base44.asServiceRole.entities.Member.filter({}, { limit: 500 });

    const members = (page.items || [])
      .map((m) => ({
        id: m.id,
        display_name: m.display_name || "",
        full_name: m.full_name || "",
        email: String(m.email || "").trim(),
        phone: String(m.phone || "").trim(),
        mobile: String(m.mobile || "").trim(),
        bv_member: String(m.bv_member || "").trim(),
        dob: m.dob || "",
        gender: m.gender || "",
        paid: m.paid === true,
        is_admin: m.is_admin === true,
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    return Response.json({ members });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
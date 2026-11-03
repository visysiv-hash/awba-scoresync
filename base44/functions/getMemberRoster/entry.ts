import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// The booking player pickers read the app's own Member records now.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const page = await base44.asServiceRole.entities.Member.filter({}, { limit: 500 });

    const roster = (page.items || [])
      .filter((m) => m.display_name)
      .map((m) => ({
        display_name: m.display_name || "",
        email: String(m.email || "").trim(),
        phone: String(m.phone || "").trim(),
        full_name: m.full_name || "",
        dob: m.dob || "",
        bv_member: String(m.bv_member || "").trim(),
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    return Response.json({ roster });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
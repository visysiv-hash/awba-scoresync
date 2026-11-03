import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Turns a member's admin access on or off.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const memberId = String(body.member_id || "").trim();
    if (!memberId) {
      return Response.json({ error: "member_id is required" }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Member.update(memberId, { is_admin: body.is_admin === true });
    return Response.json({ success: true, member: { id: updated.id, is_admin: updated.is_admin } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
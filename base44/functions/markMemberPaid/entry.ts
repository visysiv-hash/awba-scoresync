import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Marks a member paid (or unpaid) on their app record.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const memberId = String(body.member_id || "").trim();
    if (!memberId) {
      return Response.json({ error: "member_id is required" }, { status: 400 });
    }

    const paid = body.paid === false ? false : true;
    const updated = await base44.asServiceRole.entities.Member.update(memberId, { paid });
    return Response.json({ success: true, member: { id: updated.id, paid: updated.paid } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
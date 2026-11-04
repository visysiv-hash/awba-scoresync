import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Removes a member record from the member list.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const memberId = String(body.member_id || "").trim();
    if (!memberId) {
      return Response.json({ error: "member_id is required" }, { status: 400 });
    }

    const member = await base44.asServiceRole.entities.Member
      .get(memberId)
      .catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));

    if (!member) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    await base44.asServiceRole.entities.Member.delete(memberId);

    return Response.json({ success: true, deleted: member.display_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
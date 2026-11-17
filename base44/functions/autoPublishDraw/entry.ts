import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

// Publishes tonight's draw if the admin has not done it by 7pm. Run weekly by the
// "Publish Draw At 7pm" workflow, and safe to run again at any time: it only touches
// a saved draw for the night that is still a draft, and does nothing once published.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
    const date = String(body?.date || "").trim() || today;

    const found: any = await base44.asServiceRole.entities.DrawNight.filter({ date });
    const nights: any[] = Array.isArray(found) ? found : found.items || [];

    const drafts = nights.filter(
      (n: any) => !n.archived && n.published !== true && (n.matches || []).some((m: any) => (m.team1 || []).length && (m.team2 || []).length)
    );

    if (!drafts.length) {
      return Response.json({ date, published: 0, message: "Nothing left to publish for this night." });
    }

    await base44.asServiceRole.entities.DrawNight.bulkUpdate(
      drafts.map((n: any) => ({ id: n.id, published: true }))
    );

    return Response.json({ date, published: drafts.length, titles: drafts.map((n: any) => n.title || n.date) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
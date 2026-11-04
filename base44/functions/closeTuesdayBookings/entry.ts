import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

// Closes booking for today's session at 11:01am, so the draw is built from a settled
// list. Run weekly by the "Close Tuesday Bookings" workflow; an admin can still
// close or reopen any session by hand from Sessions.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const today = String(body?.date || '').trim() ||
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());

    const page: any = await base44.asServiceRole.entities.Session.filter({ date: today }, { limit: 50 });
    const sessions: any[] = Array.isArray(page) ? page : page.items || [];
    const open = sessions.filter((s: any) => s.bookings_open !== false);

    if (open.length) {
      await base44.asServiceRole.entities.Session.bulkUpdate(
        open.map((s: any) => ({ id: s.id, bookings_open: false }))
      );
    }

    return Response.json({
      date: today,
      closed: open.length,
      sessions: open.map((s: any) => s.title),
      alreadyClosed: sessions.length - open.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
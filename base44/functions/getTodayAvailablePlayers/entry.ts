import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Names of everyone confirmed in the app for today's sessions. This is the
// app-only counterpart of getPlayerAvailability (which reads the sheet), so the
// two scheduling methods can run side by side.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // YYYY-MM-DD

    const sessions = await base44.asServiceRole.entities.Session.filter({ date: today });
    const sessionIds = sessions.map((s) => s.id);

    const query: any = sessionIds.length
      ? { status: "confirmed", $or: [{ session_id: { $in: sessionIds } }, { session_date: today }] }
      : { status: "confirmed", session_date: today };

    const bookings = await base44.asServiceRole.entities.Booking.filter(query);

    const players = [...new Set(bookings.map((b: any) => String(b.user_name || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    return Response.json({ date: today, players });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
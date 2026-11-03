import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// An admin moves one waitlisted player onto the confirmed list and that player is
// emailed a confirmation. Guest bookings have no real email on file, so they are
// moved without a notification.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { bookingId } = await req.json().catch(() => ({}));

    if (!bookingId || !/^[a-f0-9]{24}$/i.test(String(bookingId))) {
      return Response.json({ error: "A valid booking is required." }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking
      .get(bookingId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

    if (booking.status === "confirmed") {
      return Response.json({ success: true, status: "confirmed", emailed: false, alreadyConfirmed: true });
    }

    await base44.asServiceRole.entities.Booking.update(bookingId, { status: "confirmed" });

    const email = String(booking.user_email || "").trim();
    let emailed = false;

    if (email && email.includes("@")) {
      const sessions = await base44.asServiceRole.entities.Session.filter({ id: booking.session_id });
      const session = sessions[0];

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `✅ You're Confirmed — ${booking.session_title}`,
          body: `Hi ${booking.user_name},\n\nGood news, you have been moved from the waitlist and your booking is now CONFIRMED for:\n\nSession: ${booking.session_title}\n\nDate: ${booking.session_date}\n\nTime: ${session?.start_time || 'TBA'}${session?.end_time ? ' – ' + session.end_time : ''}\n\nLocation: ${session?.location || 'TBA'}\n\nSee you on court!`,
        });
        emailed = true;
      } catch (e) {
        // Email is a side-effect — the promotion still stands
      }
    }

    return Response.json({ success: true, status: "confirmed", emailed });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
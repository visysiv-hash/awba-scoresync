import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { appendBookingToSheet } from "../../shared/bookingSheet.ts";

// Admins add a guest straight onto a session: no member record, no email address
// and no date of birth, and no email is sent to the guest.
//
// The booking is mirrored into the BookingData sheet, like every other booking,
// so the committee's spreadsheet always matches the app's booking list.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { sessionId, playerName } = await req.json().catch(() => ({}));

    const name = String(playerName || "").trim();
    if (!sessionId || !name) {
      return Response.json({ error: "Session and player name are required." }, { status: 400 });
    }

    const sessions = await base44.asServiceRole.entities.Session.filter({ id: sessionId });
    const session = sessions[0];
    if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

    const sessionBookings = await base44.asServiceRole.entities.Booking.filter({ session_id: sessionId });
    const confirmedCount = sessionBookings.filter((b) => b.status === "confirmed").length;
    const status = confirmedCount < (session.max_spots || 0) ? "confirmed" : "waitlisted";

    const booking = await base44.asServiceRole.entities.Booking.create({
      session_id: session.id,
      session_title: session.title,
      session_date: session.date,
      user_name: name,
      user_email: "guest",
      booked_by_email: "guest",
      status,
      paid: false,
    });

    const sheetOk = await appendBookingToSheet(base44, name, session.date);
    if (!sheetOk) console.warn(`Sheet write failed for guest booking ${booking.id} (${name} / ${session.date})`);

    return Response.json({ success: true, status, booking });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
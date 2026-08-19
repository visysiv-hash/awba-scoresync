import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { bookingId, playerEmail } = await req.json();

  const bookings = await base44.asServiceRole.entities.Booking.filter({ id: bookingId });
  const booking = bookings[0];
  if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

  // Admin check is optional — login may not be present for public booking
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    if (user && user.role === 'admin') isAdmin = true;
  } catch {}

  // Only the owner (by roster email) or admin can cancel
  if (booking.user_email !== playerEmail && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await base44.asServiceRole.entities.Booking.update(bookingId, { status: 'cancelled' });

  // Email the person who cancelled
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: booking.user_email,
    subject: `❌ Booking Cancelled — ${booking.session_title}`,
    body: `Hi ${booking.user_name},\n\nYour booking for the following session has been cancelled:\n\nSession: ${booking.session_title}\nDate: ${booking.session_date}\n\nIf this was a mistake, you can rebook via the app (subject to availability).`,
  });

  // If it was a confirmed booking, promote first waitlisted person
  if (booking.status === 'confirmed') {
    const allBookings = await base44.asServiceRole.entities.Booking.filter({ session_id: booking.session_id });
    const waitlisted = allBookings
      .filter(b => b.status === 'waitlisted')
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    if (waitlisted.length > 0) {
      const promote = waitlisted[0];
      await base44.asServiceRole.entities.Booking.update(promote.id, { status: 'confirmed' });

      // Email the promoted user
      const sessions = await base44.asServiceRole.entities.Session.filter({ id: booking.session_id });
      const session = sessions[0];

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: promote.user_email,
        subject: `✅ Spot Available — ${promote.session_title}`,
        body: `Hi ${promote.user_name},\n\nGreat news! A spot has opened up and your waitlist booking is now CONFIRMED for:\n\nSession: ${promote.session_title}\nDate: ${promote.session_date}\nTime: ${session?.start_time || ''}${session?.end_time ? ' – ' + session.end_time : ''}\nLocation: ${session?.location || 'TBA'}\n\nSee you there!`,
      });
    }
  }

  return Response.json({ success: true });
});
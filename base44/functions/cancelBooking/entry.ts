import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { bookingId } = await req.json();

  const bookings = await base44.asServiceRole.entities.Booking.filter({ id: bookingId });
  const booking = bookings[0];
  if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

  // Only the owner or admin can cancel
  if (booking.user_email !== user.email && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await base44.asServiceRole.entities.Booking.update(bookingId, { status: 'cancelled' });

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
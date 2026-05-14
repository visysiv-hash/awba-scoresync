import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json();

  const sessions = await base44.asServiceRole.entities.Session.filter({ id: sessionId });
  const session = sessions[0];
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  // Check if user already has an active booking for this session
  const existingBookings = await base44.asServiceRole.entities.Booking.filter({ session_id: sessionId, user_email: user.email });
  const active = existingBookings.find(b => b.status === 'confirmed' || b.status === 'waitlisted');
  if (active) return Response.json({ error: 'You already have a booking for this session.' }, { status: 400 });

  // Count confirmed and waitlisted bookings
  const allBookings = await base44.asServiceRole.entities.Booking.filter({ session_id: sessionId });
  const confirmedCount = allBookings.filter(b => b.status === 'confirmed').length;
  const waitlistedCount = allBookings.filter(b => b.status === 'waitlisted').length;

  let status;
  if (confirmedCount < session.max_spots) {
    status = 'confirmed';
  } else if (session.max_waitlist && waitlistedCount < session.max_waitlist) {
    status = 'waitlisted';
  } else if (!session.max_waitlist) {
    // No waitlist limit set — allow unlimited waitlist (legacy behaviour)
    status = 'waitlisted';
  } else {
    return Response.json({ error: 'This session is full and the waitlist is also full.' }, { status: 400 });
  }

  const booking = await base44.asServiceRole.entities.Booking.create({
    session_id: sessionId,
    session_title: session.title,
    session_date: session.date,
    user_email: user.email,
    user_name: user.full_name,
    status,
  });

  // Send confirmation email
  const subject = status === 'confirmed'
    ? `✅ Booking Confirmed — ${session.title}`
    : `⏳ Added to Waitlist — ${session.title}`;

  const body = status === 'confirmed'
    ? `Hi ${user.full_name},\n\nYour booking is confirmed!\n\nSession: ${session.title}\nDate: ${session.date}\nTime: ${session.start_time}${session.end_time ? ' – ' + session.end_time : ''}\nLocation: ${session.location || 'TBA'}\n${session.payment_required ? `\nPayment of $${session.price || '?'} is required. Please pay at the venue.` : '\nNo payment required.'}\n\nSee you there!`
    : `Hi ${user.full_name},\n\nThis session is currently full. You've been added to the waitlist for:\n\nSession: ${session.title}\nDate: ${session.date}\nTime: ${session.start_time}${session.end_time ? ' – ' + session.end_time : ''}\n\nWe'll email you if a spot opens up.`;

  await base44.asServiceRole.integrations.Core.SendEmail({ to: user.email, subject, body });

  return Response.json({ success: true, status, booking });
});
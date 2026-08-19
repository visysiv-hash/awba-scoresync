import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BOOKING_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const BOOKING_SHEET = "BookingData";

async function appendBookingToSheet(base44, name, date) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Read existing rows to check for duplicates (name + date)
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}/values/${BOOKING_SHEET}!A:B`;
    const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const readData = await readRes.json();
    const existing = (readData.values || []).slice(1); // skip header
    const isDuplicate = existing.some(r =>
      String(r[0] || "").trim().toLowerCase() === String(name).trim().toLowerCase() &&
      String(r[1] || "").trim() === String(date).trim()
    );
    if (isDuplicate) return; // already recorded

    // Append new row [name, date]
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}/values/${BOOKING_SHEET}!A:B:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [[name, date]] }),
    });
  } catch (e) {
    // Sheet write is a side-effect — don't fail the booking
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { sessionId, playerName, playerEmail, bookedByEmail } = await req.json();

  if (!playerName || !playerEmail) {
    return Response.json({ error: 'Player name and email are required.' }, { status: 400 });
  }

  const sessions = await base44.asServiceRole.entities.Session.filter({ id: sessionId });
  const session = sessions[0];
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  // Check if this person already has an active booking for this session
  // Key on name (not email) so family members sharing one email are distinct people
  const existingBookings = await base44.asServiceRole.entities.Booking.filter({ session_id: sessionId, user_name: playerName });
  const active = existingBookings.find(b => b.status === 'confirmed' || b.status === 'waitlisted');
  if (active) return Response.json({ error: `${playerName} is already booked for this session.` }, { status: 400 });

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
    user_email: playerEmail,
    user_name: playerName,
    booked_by_email: bookedByEmail || playerEmail,
    status,
  });

  // Record name + session date to the BookingData sheet (dedup by name + date)
  await appendBookingToSheet(base44, playerName, session.date);

  // Send confirmation email to the roster email
  const subject = status === 'confirmed'
    ? `✅ Booking Confirmed — ${session.title}`
    : `⏳ Added to Waitlist — ${session.title}`;

  const body = status === 'confirmed'
    ? `Hi ${playerName},\n\nYour booking is confirmed!\n\nSession: ${session.title}\nDate: ${session.date}\nTime: ${session.start_time}${session.end_time ? ' – ' + session.end_time : ''}\nLocation: ${session.location || 'TBA'}\n${session.payment_required ? `\nPayment of $${session.price || '?'} is required. Please pay at the venue.` : '\nNo payment required.'}\n\nSee you there!`
    : `Hi ${playerName},\n\nThis session is currently full. You've been added to the waitlist for:\n\nSession: ${session.title}\nDate: ${session.date}\nTime: ${session.start_time}${session.end_time ? ' – ' + session.end_time : ''}\n\nWe'll email you if a spot opens up.`;

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to: playerEmail, subject, body });
  } catch (e) {
    // Email is a side-effect — don't fail the booking if the email can't be sent
  }

  return Response.json({ success: true, status, booking });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BOOKING_SPREADSHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const BOOKING_SHEET = "BookingData";

async function deleteBookingFromSheet(base44, name, date) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Find the numeric sheetId for the BookingData tab
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}?fields=sheets.properties`, { headers });
    const meta = await metaRes.json();
    const sheetId = (meta.sheets || [])
      .find(s => s.properties?.title === BOOKING_SHEET)?.properties?.sheetId;
    if (sheetId === undefined) return;

    // Read existing rows to find the matching row index (name + date)
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}/values/${BOOKING_SHEET}!A:B`;
    const readRes = await fetch(readUrl, { headers });
    const readData = await readRes.json();
    const rows = readData.values || [];
    const matchIndex = rows.findIndex(r =>
      String(r[0] || "").trim().toLowerCase() === String(name).trim().toLowerCase() &&
      String(r[1] || "").trim() === String(date).trim()
    );
    if (matchIndex === -1) return; // nothing to delete

    // Delete that row (0-based startIndex)
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}:batchUpdate`;
    await fetch(batchUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: matchIndex,
              endIndex: matchIndex + 1,
            },
          },
        }],
      }),
    });
  } catch (e) {
    // Sheet update is a side-effect — don't fail the cancellation
  }
}

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

  // Only the attendee, the person who made the booking, or an admin can cancel
  if (booking.user_email !== playerEmail && booking.booked_by_email !== playerEmail && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await base44.asServiceRole.entities.Booking.update(bookingId, { status: 'cancelled' });

  // Remove the matching row from the BookingData sheet
  await deleteBookingFromSheet(base44, booking.user_name, booking.session_date);

  // Email the person who cancelled
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: booking.user_email,
      subject: `❌ Booking Cancelled — ${booking.session_title}`,
      body: `Hi ${booking.user_name},\n\nYour booking for the following session has been cancelled:\n\nSession: ${booking.session_title}\n\nDate: ${booking.session_date}\n\nIf this was a mistake, you can rebook via the app (subject to availability).`,
    });
  } catch (e) {
    // Email is a side-effect — don't fail the cancellation
  }

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

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: promote.user_email,
          subject: `✅ Spot Available — ${promote.session_title}`,
          body: `Hi ${promote.user_name},\n\nGreat news! A spot has opened up and your waitlist booking is now CONFIRMED for:\n\nSession: ${promote.session_title}\n\nDate: ${promote.session_date}\n\nTime: ${session?.start_time || ''}${session?.end_time ? ' – ' + session.end_time : ''}\n\nLocation: ${session?.location || 'TBA'}\n\nSee you there!`,
        });
      } catch (e) {
        // Email is a side-effect — don't fail the promotion
      }
    }
  }

  return Response.json({ success: true });
});
import { base44 } from "@/api/base44Client";

// Every booking that belongs to this player — as the booked player or the person who booked it.
// Paged, so older bookings are never cut off by a single page's record limit.
export async function loadMyBookings(email) {
  if (!email) return [];
  const query = { $or: [{ user_email: email }, { booked_by_email: email }] };
  const rows = [];
  let cursor;
  do {
    const page = await base44.entities.Booking.filter(
      query,
      { limit: 500, ...(cursor ? { cursor } : {}) }
    );
    rows.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return rows;
}
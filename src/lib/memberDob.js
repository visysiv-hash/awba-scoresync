import { base44 } from "@/api/base44Client";

const nameKey = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

// Resolve duplicate display names against the actual booking, not record order.
export async function memberDobs(date, names = []) {
  const page = await base44.entities.Member.filter({}, { sort: "display_name", limit: 500 });
  const byName = new Map();
  for (const member of page.items || []) {
    const key = nameKey(member.display_name);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(member);
  }
  const needed = new Set(names.map(nameKey));
  const duplicates = [...byName].filter(([key, rows]) => rows.length > 1 && needed.has(key));
  const bookings = duplicates.length && date
    ? await base44.entities.Booking.filter({ session_date: date, status: { $in: ["confirmed", "waitlisted"] } })
    : [];
  const map = {};
  for (const [key, rows] of byName) {
    let member = rows.length === 1 ? rows[0] : null;
    if (!member && needed.has(key)) {
      const emails = new Set(bookings.filter((b) => nameKey(b.user_name) === key).map((b) => nameKey(b.user_email)));
      const booked = rows.filter((m) => emails.has(nameKey(m.email)));
      if (booked.length !== 1) throw new Error(`Cannot identify which ${rows[0].display_name} is playing. Check their booking before re-pairing.`);
      member = booked[0];
    }
    if (member) map[key] = member.dob || "";
  }
  return map;
}

const parseDob = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const au = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (au) return new Date(Number(au[3]), Number(au[2]) - 1, Number(au[1]));
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

// A player counts as a junior until their 16th birthday.
export function isJunior(dob, on = new Date()) {
  const born = parseDob(dob);
  if (!born) return false;
  const sixteenth = new Date(born.getFullYear() + 16, born.getMonth(), born.getDate());
  return on < sixteenth;
}
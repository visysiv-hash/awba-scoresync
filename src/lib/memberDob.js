import { base44 } from "@/api/base44Client";

// Member records hold each player's date of birth, so the draw can tell which
// players are juniors. Names come from bookings, so the map is keyed by
// lower-cased display name.
export async function memberDobs() {
  const page = await base44.entities.Member.filter({}, { sort: "display_name", limit: 500 });
  const map = {};
  for (const m of page.items || []) {
    const name = String(m.display_name || "").trim().toLowerCase();
    if (name) map[name] = m.dob || "";
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
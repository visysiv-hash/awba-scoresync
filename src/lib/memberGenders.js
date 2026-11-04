import { base44 } from "@/api/base44Client";

// Member records hold each player's gender, which the draw uses to balance mixed
// pairs. Names come from bookings, so the map is keyed by lower-cased display name.
export async function memberGenders() {
  const page = await base44.entities.Member.filter({}, { sort: "display_name", limit: 500 });
  const map = {};
  for (const m of page.items || []) {
    const name = String(m.display_name || "").trim().toLowerCase();
    if (name) map[name] = m.gender || "";
  }
  return map;
}
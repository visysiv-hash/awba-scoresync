import { buildNightDraw, toRecord } from "./nightDraw";
import { memberGenders } from "./memberGenders";
import { appRatingMap, appBaseGroupMap } from "./appRatingMap";
import { memberDobs, isJunior } from "./memberDob";
import { lookupName } from "@/lib/nameMatch";

// Re-pairs a saved night using a new pairing scope. The players are the ones already
// on the schedule; ratings, genders and junior status come from the app, so a re-pair
// is balanced exactly like a freshly generated draw.
//
// The group list on the schedule is the admin's own arrangement, swaps included, so it
// is used as-is: re-pairing only rebuilds the games. Pass resetOrder to drop back to the
// rating order (strongest to weakest) before pairing.
export async function repairSchedule(record, poolGroups, { resetOrder = false } = {}) {
  const savedLists = (record.groups || []).map((g) => g.players || []);
  const names = [...new Set(savedLists.flat())];

  const [ratingMap, baseMap, genders, dobs] = await Promise.all([
    appRatingMap().catch(() => ({})),
    appBaseGroupMap().catch(() => ({})),
    memberGenders().catch(() => ({})),
    memberDobs(record.date, names),
  ]);

  const players = names.map((name) => {
    const key = String(name).toLowerCase();
    return {
      name,
      rating: ratingMap[key] ?? null,
      baseGroup: baseMap[key] ?? null,
      gender: genders[key] || null,
      junior: isJunior(lookupName(dobs, name), new Date(`${record.date}T12:00:00`)),
    };
  });

  // Keep whoever was nominated for American doubles and singles in those games.
  const options = { poolGroups, americanDoubles: record.american_doubles || [] };
  if (!resetOrder && savedLists.some((list) => list.length)) options.groupLists = savedLists;

  const payload = toRecord(buildNightDraw(players, options), record.date);
  return { groups: payload.groups, matches: payload.matches, variant: payload.variant, pairing_scope: payload.pairing_scope };
}
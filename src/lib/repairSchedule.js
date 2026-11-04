import { buildNightDraw, toRecord } from "./nightDraw";
import { memberGenders } from "./memberGenders";
import { appRatingMap } from "./appRatingMap";
import { memberDobs, isJunior } from "./memberDob";
import { lookupName } from "@/lib/nameMatch";

// Re-pairs a saved night using a new pairing scope. The players are the ones already
// on the schedule; ratings, genders and junior status come from the app, so a re-pair
// is balanced exactly like a freshly generated draw.
export async function repairSchedule(record, poolGroups) {
  const names = [...new Set((record.groups || []).flatMap((g) => g.players || []))];

  const [ratingMap, genders, dobs] = await Promise.all([
    appRatingMap().catch(() => ({})),
    memberGenders().catch(() => ({})),
    memberDobs(record.date, names),
  ]);

  const players = names.map((name) => {
    const key = String(name).toLowerCase();
    return {
      name,
      rating: ratingMap[key] ?? null,
      gender: genders[key] || null,
      junior: isJunior(lookupName(dobs, name), new Date(`${record.date}T12:00:00`)),
    };
  });

  const payload = toRecord(buildNightDraw(players, { poolGroups }), record.date);
  return { groups: payload.groups, matches: payload.matches, variant: payload.variant, pairing_scope: payload.pairing_scope };
}
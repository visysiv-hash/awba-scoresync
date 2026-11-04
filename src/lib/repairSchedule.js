import { buildNightDraw, toRecord } from "./nightDraw";
import { memberGenders } from "./memberGenders";
import { appRatingMap } from "./appRatingMap";

// Re-pairs a saved night using a new pairing scope. The players are the ones already
// on the schedule; ratings and genders come from the app, so a re-pair is balanced
// exactly like a freshly generated draw.
export async function repairSchedule(record, poolGroups) {
  const names = [...new Set((record.groups || []).flatMap((g) => g.players || []))];

  const [ratingMap, genders] = await Promise.all([
    appRatingMap().catch(() => ({})),
    memberGenders().catch(() => ({})),
  ]);

  const players = names.map((name) => {
    const key = String(name).toLowerCase();
    return { name, rating: ratingMap[key] ?? null, gender: genders[key] || null };
  });

  const payload = toRecord(buildNightDraw(players, { poolGroups }), record.date);
  return { groups: payload.groups, matches: payload.matches };
}
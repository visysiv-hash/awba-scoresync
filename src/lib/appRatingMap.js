import { base44 } from "@/api/base44Client";

// Every player's current app rating, keyed by lower-cased name. Ratings run lowest =
// strongest, so a pair's rating is simply the average of its two players.
export async function appRatingMap() {
  const res = await base44.functions.invoke("getAppRatings", {});
  const map = {};
  for (const p of res.data?.players || []) {
    map[String(p.player).toLowerCase()] = p.rating;
  }
  return map;
}

// Average rating of a pair; null when neither player has a rating yet.
export const pairAverage = (names, ratings) => {
  const values = (names || [])
    .map((n) => ratings[String(n).toLowerCase()])
    .filter((r) => r !== null && r !== undefined);
  if (!values.length) return null;
  return values.reduce((s, r) => s + r, 0) / values.length;
};
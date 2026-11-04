import { base44 } from "@/api/base44Client";
import { lookupName } from "./nameMatch";

// Every player's current app rating, keyed by lower-cased name. Ratings run lowest =
// strongest, so a pair's rating is simply the average of its two players. A player
// with no app results yet but a base group set starts from that group.
export async function appRatingMap() {
  const res = await base44.functions.invoke("getAppRatings", {});
  const map = {};
  for (const p of res.data?.players || []) {
    map[String(p.player).trim().toLowerCase()] = p.rating;
  }
  for (const [name, group] of Object.entries(res.data?.baseGroups || {})) {
    if (map[name] === undefined && group) map[name] = group;
  }
  return map;
}

// Average rating of a pair; null when neither player has a rating yet.
export const pairAverage = (names, ratings) => {
  const values = (names || [])
    .map((n) => lookupName(ratings, n))
    .filter((r) => r !== null && r !== undefined);
  if (!values.length) return null;
  return values.reduce((s, r) => s + r, 0) / values.length;
};
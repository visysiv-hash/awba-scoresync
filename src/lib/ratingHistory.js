// What players said about the games they have already played, kept for the draw
// review: a pair who partnered before and rated the night low, or two pairs who
// met and rated it low. Nothing here changes a draw — it only tells the admin it
// is worth a change before the night is published.
import { base44 } from "@/api/base44Client";

// A game averaging this or less counts as one the players did not enjoy.
export const LOW_AVERAGE = 2.5;

const norm = (n) => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
// The draw writes display names ("Gavin"), the sheet writes full names ("Gavin
// Chang"), so a pair is matched on the first name of each player.
const first = (n) => norm(n).split(" ")[0];
const pairKey = (a, b) => [first(a), first(b)].sort().join(" | ");

const splitTeam = (players, text) => {
  const list = Array.isArray(players) && players.length
    ? players
    : String(text || "").split(/\s*(?:&|\band\b|\/|,)\s*/i);
  return list.map((n) => String(n || "").trim()).filter(Boolean);
};

const gameRating = (m) => {
  if (Number(m.rating) > 0) return Number(m.rating);
  const stars = (m.player_ratings || []).map((r) => Number(r.rating)).filter((s) => s > 0);
  return stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null;
};

// Recent games that carry a rating, with the two pairs who played them.
export async function fetchRatedGames(limit = 300) {
  const page = await base44.entities.MatchResult.list({ sort: "-date", limit });
  const games = [];
  for (const m of page.items || []) {
    const rating = gameRating(m);
    if (rating === null) continue;
    const t1 = splitTeam(m.team1_players, m.team1);
    const t2 = splitTeam(m.team2_players, m.team2);
    if (t1.length < 2 || t2.length < 2) continue;
    games.push({ date: m.date, net: m.net, game: m.game, t1, t2, rating });
  }
  return games;
}

const add = (map, key, g) => {
  const cur = map.get(key) || { sum: 0, count: 0 };
  cur.sum += g.rating;
  cur.count += 1;
  map.set(key, cur);
};

// Averages for every pair who has partnered, and every two pairs who have met.
export function buildHistory(games) {
  const pairs = new Map();
  const meets = new Map();
  for (const g of games) {
    const k1 = pairKey(g.t1[0], g.t1[1]);
    const k2 = pairKey(g.t2[0], g.t2[1]);
    add(pairs, k1, g);
    add(pairs, k2, g);
    add(meets, [k1, k2].sort().join(" vs "), g);
  }
  return { pairs, meets };
}

const stat = (map, key) => {
  const found = map.get(key);
  return found ? { average: found.sum / found.count, count: found.count } : null;
};

// Every warning tonight's draw earns, one per game that has one.
export function ratingFlags(matches, history) {
  const flags = [];
  for (const m of matches || []) {
    const t1 = m.team1 || [];
    const t2 = m.team2 || [];
    if (t1.length !== 2 || t2.length !== 2) continue;
    const where = { net: m.net, game: m.game };
    const k1 = pairKey(t1[0], t1[1]);
    const k2 = pairKey(t2[0], t2[1]);

    const partners = [
      { names: t1.join(" & "), s: stat(history.pairs, k1) },
      { names: t2.join(" & "), s: stat(history.pairs, k2) },
    ].filter((p) => p.s && p.s.average <= LOW_AVERAGE);

    const met = stat(history.meets, [k1, k2].sort().join(" vs "));

    if (partners.length) {
      const first = partners[0];
      flags.push({
        ...where,
        kind: "partners",
        names: partners.map((p) => p.names).join(" and "),
        average: first.s.average,
        count: first.s.count,
        text:
          `${first.names} played together ${first.s.count} time` +
          `${first.s.count === 1 ? "" : "s"} and the game averaged ` +
          `${first.s.average.toFixed(1)} stars. Consider a different partner.`,
      });
    }

    if (met && met.average <= LOW_AVERAGE) {
      flags.push({
        ...where,
        kind: "meet",
        names: `${t1.join(" & ")} vs ${t2.join(" & ")}`,
        average: met.average,
        count: met.count,
        text:
          `These two pairs met ${met.count} time${met.count === 1 ? "" : "s"} and the game ` +
          `averaged ${met.average.toFixed(1)} stars. Consider splitting them up.`,
      });
    }
  }
  return flags.sort((a, b) => a.average - b.average);
}
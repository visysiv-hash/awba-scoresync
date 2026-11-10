// Reviews a draw that has already been arranged by hand (or generated) and says
// what is worth a second look: a game whose two pairs are too far apart to be a
// contest, a pairing the night has already used, or a player short of three games.
// Where four players can be split closer, it names the better split; where a pair
// has met once too often, it names one swap that breaks the repeat without
// wrecking the balance of either game.
import { pairAverage } from "./appRatingMap";
import { scheduleUniqueness } from "./scheduleUniqueness";

// Distance between two pair averages at which a game stops feeling even. Real
// nights sit around 0.1–0.5, so anything over this is worth the admin's eye.
export const WIDE_GAP = 0.8;

// A suggested fix is only offered when it gains this much, so the card never
// asks for a pointless reshuffle.
const WORTH_FIXING = 0.15;

const low = (name) => String(name || "").trim().toLowerCase();
const key = (a, b) => [low(a), low(b)].sort().join("|");
const same = (x, y) => low(x) === low(y);

const gapOf = (team1, team2, ratings) => {
  const a = pairAverage(team1, ratings);
  const b = pairAverage(team2, ratings);
  return a === null || b === null ? null : Math.abs(a - b);
};

const worstGap = (matches, ratings) => {
  let worst = null;
  for (const m of matches) {
    const g = gapOf(m.team1 || [], m.team2 || [], ratings);
    if (g !== null && (worst === null || g > worst)) worst = g;
  }
  return worst;
};

// The three ways four players make two pairs. The split as drawn comes first.
function splits(team1, team2) {
  if (team1.length !== 2 || team2.length !== 2) return [];
  const [a, b] = team1;
  const [c, d] = team2;
  return [
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

// Every pair in the night, with the games they partnered in and the games they
// faced each other in, in draw order.
export function pairOccurrences(matches) {
  const map = new Map();
  const entry = (a, b) => {
    const k = key(a, b);
    if (!map.has(k)) map.set(k, { key: k, a, b, partner: [], opponent: [] });
    return map.get(k);
  };
  matches.forEach((m, index) => {
    const team1 = m.team1 || [];
    const team2 = m.team2 || [];
    const where = { index, net: Number(m.net), game: Number(m.game) };
    for (const team of [team1, team2]) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) entry(team[i], team[j]).partner.push(where);
      }
    }
    for (const a of team1) for (const b of team2) entry(a, b).opponent.push(where);
  });
  return [...map.values()];
}

// How often the night repeats itself. A second partnership is weighted hardest,
// then a second meeting as opponents, then a pair that switches between the two.
export function repeatScore(matches) {
  let score = 0;
  for (const p of pairOccurrences(matches)) {
    score += Math.max(0, p.partner.length - 1) * 3;
    score += Math.max(0, p.opponent.length - 1);
    if (p.partner.length && p.opponent.length) score += 0.5;
  }
  return score;
}

// Trade two players between two games of the same round: both games keep their
// shape, so nobody gains or loses a game and no other court moves.
function withSwap(matches, indexA, indexB, a, b) {
  const swap = (names) => (names || []).map((n) => (same(n, a) ? b : same(n, b) ? a : n));
  return matches.map((m, i) =>
    i === indexA || i === indexB ? { ...m, team1: swap(m.team1), team2: swap(m.team2) } : m
  );
}

// One swap that breaks a pair's repeat, moving the first player out of the game
// they met in and back in elsewhere in the same round.
function repeatFix(matches, ratings, pair, baseScore, baseWorst) {
  const spots = [...pair.partner, ...pair.opponent].sort((x, y) => x.index - y.index);
  const anchor = spots[0];
  if (!anchor) return null;
  const source = matches[anchor.index];
  if (!source || (source.team1 || []).length + (source.team2 || []).length !== 4) return null;
  // A swap may not unbalance either game it touches: each may only reach the gap
  // it already had, or the point where a game stops feeling even.
  const limit = (gap) => Math.max(gap ?? 0, WIDE_GAP) + 0.15;
  const sourceGap = gapOf(source.team1 || [], source.team2 || [], ratings);

  let best = null;
  matches.forEach((target, j) => {
    if (j === anchor.index) return;
    if (Number(target.game) !== Number(anchor.game)) return;
    if ((target.team1 || []).length + (target.team2 || []).length !== 4) return;
    const targetGap = gapOf(target.team1 || [], target.team2 || [], ratings);
    for (const other of [...(target.team1 || []), ...(target.team2 || [])]) {
      if (same(other, pair.b)) continue;
      const next = withSwap(matches, anchor.index, j, pair.a, other);
      const score = repeatScore(next);
      // It has to actually remove this repeat, not just shuffle it.
      if (score > baseScore - 0.9) continue;
      const nextSourceGap = gapOf(next[anchor.index].team1, next[anchor.index].team2, ratings);
      const nextTargetGap = gapOf(next[j].team1, next[j].team2, ratings);
      if (nextSourceGap !== null && nextSourceGap > limit(sourceGap)) continue;
      if (nextTargetGap !== null && nextTargetGap > limit(targetGap)) continue;
      const worst = worstGap(next, ratings);
      if (worst !== null && baseWorst !== null && worst > Math.max(baseWorst, WIDE_GAP) + 0.001) continue;
      if (!best || score < best.score) {
        best = {
          indexA: anchor.index,
          indexB: j,
          a: pair.a,
          b: other,
          score,
          worst,
          label: `Move ${pair.a} to Net ${target.net} Game ${target.game} in place of ${other}`,
        };
      }
    }
  });
  return best;
}

// Pairs already partnered or faced in the other games of the night, so a closer
// split is never one that hands someone the same partner twice.
function history(matches) {
  const partners = new Map();
  const opponents = new Map();
  const add = (map, a, b) => map.set(key(a, b), (map.get(key(a, b)) || 0) + 1);
  for (const m of matches) {
    for (const team of [m.team1 || [], m.team2 || []]) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) add(partners, team[i], team[j]);
      }
    }
    for (const a of m.team1 || []) for (const b of m.team2 || []) add(opponents, a, b);
  }
  return { partners, opponents };
}

function scoreSplit(team1, team2, ratings, seen) {
  const gap = gapOf(team1, team2, ratings);
  if (gap === null) return null;
  const repeatPartner =
    (team1.length === 2 && seen.partners.has(key(team1[0], team1[1]))) ||
    (team2.length === 2 && seen.partners.has(key(team2[0], team2[1])));
  const repeatOpponent = team1.some((a) => team2.some((b) => seen.opponents.has(key(a, b))));
  return {
    team1,
    team2,
    gap,
    // A repeat partner costs more than any closeness is worth; a repeat opponent
    // is a mild nudge away.
    cost: gap + (repeatPartner ? 0.6 : 0) + (repeatOpponent ? 0.15 : 0),
    repeatPartner,
  };
}

export function reviewDraw(record, ratings = {}) {
  const matches = record?.matches || [];
  const uniqueness = scheduleUniqueness(record);

  const rows = matches.map((m, index) => {
    const team1 = m.team1 || [];
    const team2 = m.team2 || [];
    const otherGames = matches.filter((_, i) => i !== index);
    const seen = history(otherGames);
    const gap = gapOf(team1, team2, ratings);

    let better = null;
    for (const [t1, t2] of splits(team1, team2)) {
      const candidate = scoreSplit(t1, t2, ratings, seen);
      if (!candidate || candidate.repeatPartner) continue;
      if (gap === null || candidate.cost + WORTH_FIXING > gap) continue;
      if (!better || candidate.cost < better.cost) better = candidate;
    }

    return {
      net: Number(m.net),
      game: Number(m.game),
      team1,
      team2,
      gap,
      better,
      flagged: gap !== null && gap > WIDE_GAP,
    };
  });

  const gaps = rows.map((r) => r.gap).filter((g) => g !== null);
  const flagged = rows
    .filter((r) => r.flagged)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));

  // Repeats, worst first, each with the swap that would break it where one exists.
  const baseScore = repeatScore(matches);
  const baseWorst = worstGap(matches, ratings);
  const repeatItems = pairOccurrences(matches)
    .filter((p) => p.partner.length > 1 || p.opponent.length > 1)
    .sort((a, b) => (b.partner.length - a.partner.length) || (b.opponent.length - a.opponent.length))
    .slice(0, 6)
    .map((p) => ({
      key: p.key,
      a: p.a,
      b: p.b,
      partnerAt: p.partner,
      opponentAt: p.opponent,
      fix: repeatFix(matches, ratings, p, baseScore, baseWorst),
    }));

  return {
    rows,
    flagged,
    fixes: flagged.filter((r) => r.better).length,
    worst: gaps.length ? Math.max(...gaps) : null,
    average: gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null,
    uniqueness,
    repeatItems,
  };
}
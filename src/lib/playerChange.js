// Player changes on a saved night: someone doesn't turn up and a stand-in steps in.
// A stand-in is rarely the same level, so the games the absent player was in are
// re-formed around them — and only those, unless a single extra game has to be
// touched to keep a contest even. Every other game on the night stays exactly as it
// was, so the schedule changes as little as possible.
import { teamAvg } from "./teamRating";
import { lookupName } from "./nameMatch";

// Balance is the point: a gap of 1.0 between the two pairs costs 100, while a
// familiar pairing costs a fraction of that.
const BALANCE = 100;
const PARTNER_REPEAT = 20;
const PARTNER_AS_OPPONENT = 6;
const THIRD_MEETING = 60;

// Above this gap a game is worth one extra trade elsewhere to straighten it out.
export const LOOSE_GAP = 0.45;

const norm = (value) => String(value || "").trim().toLowerCase();

const pairKey = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

export const gamesInvolving = (record, name) => {
  const out = [];
  (record?.matches || []).forEach((m, i) => {
    if ([...(m.team1 || []), ...(m.team2 || [])].includes(name)) out.push(i);
  });
  return out;
};

// The stand-in simply takes every slot the absent player had.
export function withReplacement(record, missing, replacement) {
  const swap = (names) => (names || []).map((n) => (n === missing ? replacement : n));
  return {
    ...record,
    groups: (record.groups || []).map((g) => ({
      ...g,
      players: swap(g.players),
      top4: swap(g.top4),
      bottom4: swap(g.bottom4),
    })),
    matches: (record.matches || []).map((m) => ({
      ...m,
      team1: swap(m.team1),
      team2: swap(m.team2),
    })),
  };
}

const profileOf = (profiles) => (name) => ({
  name,
  rating: lookupName(profiles?.ratings || {}, name) ?? null,
  gender: lookupName(profiles?.genders || {}, name) || null,
});

const gapOf = (A, B, profile) => {
  const a = teamAvg((A || []).map(profile));
  const b = teamAvg((B || []).map(profile));
  if (a === null || b === null) return 0;
  return Math.abs(a - b);
};

const addToSeen = (seen, A, B) => {
  if (A.length === 2) seen.partners.add(pairKey(A[0], A[1]));
  if (B.length === 2) seen.partners.add(pairKey(B[0], B[1]));
  const all = [...A, ...B];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const k = pairKey(all[i], all[j]);
      seen.meets.set(k, (seen.meets.get(k) || 0) + 1);
    }
  }
};

// Everything the night already pairs up, ignoring the games being re-formed.
const seenFrom = (matches, exclude) => {
  const seen = { partners: new Set(), meets: new Map() };
  (matches || []).forEach((m, i) => {
    if (exclude.has(i)) return;
    addToSeen(seen, m.team1 || [], m.team2 || []);
  });
  return seen;
};

const repeatCost = (A, B, seen) => {
  let c = 0;
  if (A.length === 2 && seen.partners.has(pairKey(A[0], A[1]))) c += PARTNER_REPEAT;
  if (B.length === 2 && seen.partners.has(pairKey(B[0], B[1]))) c += PARTNER_REPEAT;
  for (const x of A) {
    for (const y of B) {
      if (seen.partners.has(pairKey(x, y))) c += PARTNER_AS_OPPONENT;
      else if ((seen.meets.get(pairKey(x, y)) || 0) >= 2) c += THIRD_MEETING;
    }
  }
  return c;
};

const SPLITS = (players) => {
  const [a, b, c, d] = players;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
};

const bestSplit = (players, profile, seen) => {
  // A night's players meet again in other rounds, so a line-up must never hold the
  // same name twice.
  if (new Set(players).size !== players.length) return null;
  let best = null;
  for (const [A, B] of SPLITS(players)) {
    const gap = gapOf(A, B, profile);
    const cost = gap * gap * BALANCE + repeatCost(A, B, seen);
    if (!best || cost < best.cost) best = { A, B, gap, cost };
  }
  return best;
};

const samePair = (team, other) => {
  const a = [...(team || [])].sort();
  const b = [...(other || [])].sort();
  return a.length === b.length && a.every((n, i) => n === b[i]);
};

const labelOf = (match) => `Net ${match.net} · Game ${match.game}`;

// One trade with a game that is otherwise untouched, only when it visibly evens out
// the stand-in's game without spoiling the other one.
function findTrade({ index, matches, touched, profile, replacement }) {
  const here = matches[index];
  const hereNames = [...(here.team1 || []), ...(here.team2 || [])];
  if (hereNames.length !== 4) return null;
  const gapNow = gapOf(here.team1, here.team2, profile);
  let best = null;

  for (let j = 0; j < matches.length; j++) {
    if (j === index || touched.has(j)) continue;
    const other = matches[j];
    const otherNames = [...(other.team1 || []), ...(other.team2 || [])];
    if (otherNames.length !== 4) continue;

    const seenJ = seenFrom(matches, new Set([...touched, j]));
    const nowGap = gapOf(other.team1, other.team2, profile);
    const nowCost =
      (gapNow * gapNow + nowGap * nowGap) * BALANCE +
      repeatCost(here.team1 || [], here.team2 || [], seenJ) +
      repeatCost(other.team1 || [], other.team2 || [], seenJ);

    for (const p of hereNames) {
      if (p === replacement) continue;
      // Everyone plays several games a night, so a trade only works when neither
      // player is already in the other game.
      if (otherNames.includes(p)) continue;
      for (const q of otherNames) {
        if (hereNames.includes(q)) continue;
        const nextHere = hereNames.map((n) => (n === p ? q : n));
        const nextThere = otherNames.map((n) => (n === q ? p : n));
        const a = bestSplit(nextHere, profile, seenJ);
        const b = bestSplit(nextThere, profile, seenJ);
        if (!a || !b) continue;
        if (a.gap > gapNow - 0.05) continue;
        if (b.gap > Math.max(LOOSE_GAP, nowGap + 0.1)) continue;
        const cost = a.cost + b.cost;
        if (cost >= nowCost - 1) continue;
        if (!best || cost < best.cost) {
          best = {
            cost,
            index: j,
            here: { ...here, team1: a.A, team2: a.B },
            match: { ...other, team1: b.A, team2: b.B },
          };
        }
      }
    }
  }

  return best;
}

export function rebalanceMissingGames(record, { missing, replacement, profiles }) {
  const profile = profileOf(profiles);
  const affected = gamesInvolving(record, missing);
  const out = withReplacement(record, missing, replacement);
  if (!affected.length) return { record: out, changed: [], extra: [], worstGap: 0 };

  const matches = [...(out.matches || [])];
  const touched = new Set(affected);
  const seen = seenFrom(matches, touched);

  // Only the absent player's games are re-formed: the same four players, put
  // together the most even way, so nothing on the night moves unless it must.
  for (const index of affected) {
    const match = matches[index];
    const players = [...(match.team1 || []), ...(match.team2 || [])];
    if (players.length !== 4) continue;
    const best = bestSplit(players, profile, seen);
    if (!best) continue;
    const keep = samePair(match.team1, best.A) && samePair(match.team2, best.B);
    const next = keep ? match : { ...match, team1: best.A, team2: best.B };
    matches[index] = next;
    addToSeen(seen, next.team1 || [], next.team2 || []);
  }

  // A game that is still lopsided gets one trade with a game nobody has touched yet.
  const extra = [];
  for (const index of affected) {
    if (extra.length >= 2) break;
    const match = matches[index];
    if ([...(match.team1 || []), ...(match.team2 || [])].length !== 4) continue;
    if (gapOf(match.team1, match.team2, profile) <= LOOSE_GAP) continue;
    const trade = findTrade({ index, matches, touched, profile, replacement });
    if (!trade) continue;
    matches[trade.index] = trade.match;
    matches[index] = trade.here;
    touched.add(trade.index);
    extra.push(trade.index);
  }

  return {
    record: { ...out, matches },
    changed: affected.map((i) => labelOf(matches[i])),
    extra: extra.map((i) => labelOf(matches[i])),
    worstGap: Math.max(
      0,
      ...affected.map((i) => gapOf(matches[i].team1, matches[i].team2, profile))
    ),
  };
}
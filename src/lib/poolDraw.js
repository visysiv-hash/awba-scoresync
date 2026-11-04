// Pairing across a pool of two or three groups. Instead of keeping each group of
// eight to itself, neighbouring groups are thrown into one pool and every round
// picks the closest contests from the whole pool — so any of the 16 (or 24)
// players can be paired with any other, and rounds two and three still come out
// balanced. The rules are the group engine's: rating closeness, the mixed-pair
// gender handicap and no repeated partners while it can be avoided.
import { teamAvg } from "./teamRating";

const key = (a, b) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

// Balance is the point of pooling: a game's cost is the squared gap between the
// two pair averages, and every repeat penalty is smaller than a gap of about 1.0,
// so a whole pool is never made lopsided just to avoid a familiar pairing.
const PARTNER_REPEAT = 60;
const PARTNER_AS_OPPONENT = 15;
const OPPONENT_REPEAT = 5;

const slotRef = (match, idx) => (idx < 2 ? [match.A, idx] : [match.B, idx - 2]);

// A pairing the night must never make — two of the bottom four together — is priced
// out of reach instead of special-cased, so the search simply never lands on it.
const FORBIDDEN_PAIR = 1e6;

function matchCost(match, seen, blocked) {
  let c = 0;
  for (const team of [match.A, match.B]) {
    if (team.length !== 2) continue;
    if (seen.partners.has(key(team[0].name, team[1].name))) c += PARTNER_REPEAT;
    if (blocked && blocked.has(team[0].name) && blocked.has(team[1].name)) c += FORBIDDEN_PAIR;
  }
  for (const x of match.A) {
    for (const y of match.B) {
      if (seen.partners.has(key(x.name, y.name))) c += PARTNER_AS_OPPONENT;
      else if (seen.opponents.has(key(x.name, y.name))) c += OPPONENT_REPEAT;
    }
  }
  const a = teamAvg(match.A);
  const b = teamAvg(match.B);
  if (a !== null && b !== null) c += (a - b) * (a - b) * 100;
  return c;
}

const totalCost = (matches, seen) => matches.reduce((s, m) => s + matchCost(m, seen), 0);

// Three deterministic starting line-ups: strongest with weakest, neighbours
// together, and top half with bottom half. The best of the three is then nudged
// until no single swap improves it.
function startLineUp(sorted, mode) {
  const n = sorted.length;
  const pairs = [];
  if (mode === "extremes") {
    for (let i = 0; i < n / 2; i++) pairs.push([sorted[i], sorted[n - 1 - i]]);
  } else if (mode === "adjacent") {
    for (let i = 0; i < n; i += 2) pairs.push([sorted[i], sorted[i + 1]]);
  } else {
    for (let i = 0; i < n / 2; i++) pairs.push([sorted[i], sorted[i + n / 2]]);
  }

  const ranked = pairs
    .map((pr) => ({ pr, total: (pr[0].rating ?? 0) + (pr[1].rating ?? 0) }))
    .sort((a, b) => a.total - b.total);
  const matches = [];
  for (let i = 0; i < ranked.length / 2; i++) {
    matches.push({ A: ranked[i].pr, B: ranked[ranked.length - 1 - i].pr });
  }
  return matches;
}

function improve(matches, seen, blocked) {
  const cost = matches.map((m) => matchCost(m, seen, blocked));
  let changed = true;
  let guard = 0;

  while (changed && guard < 40) {
    changed = false;
    guard++;
    for (let i = 0; i < matches.length; i++) {
      for (let a = 0; a < 4; a++) {
        for (let j = i; j < matches.length; j++) {
          for (let b = i === j ? a + 1 : 0; b < 4; b++) {
            const [t1, i1] = slotRef(matches[i], a);
            const [t2, i2] = slotRef(matches[j], b);
            if (t1 === t2) continue;

            const before = i === j ? cost[i] : cost[i] + cost[j];
            const held = t1[i1];
            t1[i1] = t2[i2];
            t2[i2] = held;
            const nextI = matchCost(matches[i], seen, blocked);
            const after = i === j ? nextI : nextI + matchCost(matches[j], seen, blocked);

            if (after < before - 1e-9) {
              cost[i] = nextI;
              if (i !== j) cost[j] = matchCost(matches[j], seen, blocked);
              changed = true;
            } else {
              t2[i2] = t1[i1];
              t1[i1] = held;
            }
          }
        }
      }
    }
  }

  return { matches, cost: cost.reduce((s, c) => s + c, 0) };
}

function buildRound(playing, seen, blocked) {
  const sorted = [...playing].sort((a, b) => {
    const ra = a.rating ?? Infinity;
    const rb = b.rating ?? Infinity;
    if (ra !== rb) return ra - rb;
    return String(a.name).localeCompare(String(b.name));
  });

  let best = null;
  for (const mode of ["extremes", "adjacent", "halves"]) {
    const trial = improve(startLineUp(sorted, mode), seen, blocked);
    if (!best || trial.cost < best.cost) best = trial;
  }
  return best.matches;
}

const rememberRound = (seen, matches) => {
  for (const m of matches) {
    for (const team of [m.A, m.B]) {
      if (team.length === 2) seen.partners.add(key(team[0].name, team[1].name));
    }
    for (const x of m.A) for (const y of m.B) seen.opponents.add(key(x.name, y.name));
  }
};

// Three rounds over the pool. When the pool is not a multiple of four the extra
// players rest a round each, fewest rests first, so everyone gets a similar night.
export function poolGames(players) {
  const pool = players || [];
  const perRound = Math.floor(pool.length / 4) * 4;
  if (perRound < 4) return [];

  const seen = { partners: new Set(), opponents: new Set() };
  const rests = new Map(pool.map((p) => [p.name, 0]));
  const games = [];

  for (let g = 1; g <= 3; g++) {
    const order = [...pool].sort(
      (a, b) => (rests.get(b.name) || 0) - (rests.get(a.name) || 0)
    );
    const playing = order.slice(0, perRound);
    const sitting = new Set(order.slice(perRound).map((p) => p.name));
    for (const name of sitting) rests.set(name, (rests.get(name) || 0) + 1);

    const matches = buildRound(playing, seen);
    rememberRound(seen, matches);
    games.push({
      game: g,
      matches: matches.map((m) => ({ teamA: m.A, teamB: m.B })),
    });
  }

  return games;
}

const rated = (a, b) => {
  const ra = a.rating ?? Infinity;
  const rb = b.rating ?? Infinity;
  if (ra !== rb) return ra - rb;
  return String(a.name).localeCompare(String(b.name));
};

// One balanced round over any set of players — used when two groups meet for a
// single game. `blocked` names the players who must never end up as partners, which
// keeps the bottom four of a group apart. Leftovers rest, weakest first.
export function poolRound(players, seen, blocked) {
  const pool = players || [];
  const perRound = Math.floor(pool.length / 4) * 4;
  if (perRound < 4) return [];

  const playing = [...pool].sort(rated).slice(0, perRound);
  return buildRound(playing, seen, blocked).map((m) => ({ teamA: m.A, teamB: m.B }));
}
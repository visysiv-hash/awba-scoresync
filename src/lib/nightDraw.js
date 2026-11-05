// Builds a whole night's draw in the app: rating-sorted groups, two courts each and
// three matches per player. Every round of a full group of eight is paired by the
// app itself (rating closeness, mixed-pair gender balance, no repeated partners), so
// the gender adjustment shapes all three games. Shorter groups are filled with mixed
// formats — American doubles (one player against two) and singles — so a group of
// five, six or seven still gets a night's play instead of nothing.
import { buildGroups, groupAverage } from "./drawGenerator";
import { teamAvg } from "./teamRating";
import { poolGames, poolRound } from "./poolDraw";
import { keepApartDraw, bannedTogether } from "./neverPair";
import { buildCrossoverPair } from "./crossover";
import { buildUniqueDraw } from "@/lib/uniqueDraw";
import { juniorMatchAllowed, assertJuniorDraw } from "@/lib/juniorSafety";
import { juniorPreferenceCost } from "@/lib/juniorPreference";

const key = (a, b) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

export { GENDER_HANDICAP } from "./teamRating";

// Team sizes per match for a group that is not a full eight.
const PLANS = {
  7: [[2, 2], [1, 2]],
  6: [[1, 2], [1, 2]],
  5: [[1, 2], [1, 1]],
  4: [[2, 2]],
  3: [[1, 1]],
  2: [[1, 1]],
  1: [],
};

// Tries every line-up for the round and keeps the one with the fewest repeated
// partners and opponents, then the closest team ratings.
function bestAssignment(playing, plan, seen) {
  const slots = [];
  plan.forEach(([a, b], mi) => {
    for (let i = 0; i < a; i++) slots.push([mi, "A"]);
    for (let i = 0; i < b; i++) slots.push([mi, "B"]);
  });
  if (playing.length !== slots.length) return null;

  const order = new Array(slots.length);
  const used = new Array(playing.length).fill(false);
  let best = null;
  let bestCost = Infinity;

  const teamsFrom = () => {
    const teams = plan.map(() => ({ A: [], B: [] }));
    for (let i = 0; i < slots.length; i++) teams[slots[i][0]][slots[i][1]].push(order[i]);
    return teams;
  };

  const cost = (teams) => {
    let c = 0;
    for (const t of teams) {
      if (t.A.length === 2 && seen.partners.has(key(t.A[0].name, t.A[1].name))) c += 220;
      if (t.B.length === 2 && seen.partners.has(key(t.B[0].name, t.B[1].name))) c += 220;
      for (const x of t.A) {
        for (const y of t.B) {
          if (seen.partners.has(key(x.name, y.name))) c += 60;
          else if (seen.opponents.has(key(x.name, y.name))) c += 30;
        }
      }
      const all = [...t.A, ...t.B];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          if (bannedTogether(all[i].name, all[j].name)) c += NEVER_PAIR;
          if (meetCount(seen, all[i].name, all[j].name) >= 2) c += 400;
        }
      }
      const a = teamAvg(t.A);
      const b = teamAvg(t.B);
      if (a !== null && b !== null) c += Math.abs(a - b) * 4;
      c += juniorPreferenceCost(t.A, t.B) * 4;
    }
    return c;
  };

  const walk = (depth) => {
    if (depth === slots.length) {
      const teams = teamsFrom();
      if (teams.some((t) => !juniorMatchAllowed(t.A, t.B))) return;
      const c = cost(teams);
      if (c < bestCost) {
        bestCost = c;
        best = teams;
      }
      return;
    }
    for (let i = 0; i < playing.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      order[depth] = playing[i];
      walk(depth + 1);
      used[i] = false;
    }
  };

  walk(0);
  return best;
}

const remember = (seen, teams) => {
  for (const t of teams) {
    if (t.A.length === 2) seen.partners.add(key(t.A[0].name, t.A[1].name));
    if (t.B.length === 2) seen.partners.add(key(t.B[0].name, t.B[1].name));
    for (const x of t.A) for (const y of t.B) seen.opponents.add(key(x.name, y.name));
    if (!seen.meets) seen.meets = new Map();
    const all = [...t.A, ...t.B];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const k = key(all[i].name, all[j].name);
        seen.meets.set(k, (seen.meets.get(k) || 0) + 1);
      }
    }
  }
};

// Balance comes first. The cost of a game is the squared gap between the two pair
// averages, and a repeated pairing costs less than a gap of about 0.7 — so the
// draw will repeat a partner long before it hands anyone a one-sided game.
const REPEATED_PARTNER = 0.5;
const PARTNER_AS_OPPONENT = 0.3;
const REPEATED_OPPONENT = 0.08;

// Three games of 2v2 is nine opponents a night from only seven group-mates, so meeting
// someone twice cannot be avoided — but meeting the same person in all three games can,
// so a third meeting is priced above a one-point rating gap.
const THIRD_MEETING = 1.2;

const meetCount = (seen, a, b) => (seen.meets ? seen.meets.get(key(a, b)) || 0 : 0);

// A pairing the night must never make, priced out of reach instead of special-cased.
const NEVER_PAIR = 1e6;

function roundCost(matches, seen) {
  let c = 0;
  for (const m of matches) {
    const all = [...m.A, ...m.B];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (bannedTogether(all[i].name, all[j].name)) c += NEVER_PAIR;
        if (meetCount(seen, all[i].name, all[j].name) >= 2) c += THIRD_MEETING;
      }
    }
    for (const team of [m.A, m.B]) {
      if (team.length === 2 && seen.partners.has(key(team[0].name, team[1].name))) c += REPEATED_PARTNER;
    }
    for (const x of m.A) {
      for (const y of m.B) {
        if (seen.partners.has(key(x.name, y.name))) c += PARTNER_AS_OPPONENT;
        else if (seen.opponents.has(key(x.name, y.name))) c += REPEATED_OPPONENT;
      }
    }
    const a = teamAvg(m.A);
    const b = teamAvg(m.B);
    if (a !== null && b !== null) c += (a - b) * (a - b);
    c += juniorPreferenceCost(m.A, m.B);
  }
  return c;
}

const nextSeen = (seen, matches) => {
  const out = {
    partners: new Set(seen.partners),
    opponents: new Set(seen.opponents),
    meets: new Map(seen.meets || []),
  };
  remember(out, matches.map((m) => ({ A: m.A, B: m.B })));
  return out;
};

// Every pairing of the eight players, then the three ways four pairs make two
// games. 315 line-ups is small enough to score each round exactly instead of
// guessing, which is what let a 3.0 mismatch through before.
function allPairings(list) {
  if (!list.length) return [[]];
  const [first, ...rest] = list;
  const out = [];
  for (let i = 0; i < rest.length; i++) {
    const others = rest.filter((_, j) => j !== i);
    for (const tail of allPairings(others)) out.push([[first, rest[i]], ...tail]);
  }
  return out;
}

function nightLineUps(players) {
  const out = [];
  for (const [p1, p2, p3, p4] of allPairings(players)) {
    out.push([{ A: p1, B: p2 }, { A: p3, B: p4 }]);
    out.push([{ A: p1, B: p3 }, { A: p2, B: p4 }]);
    out.push([{ A: p1, B: p4 }, { A: p2, B: p3 }]);
  }
  return out;
}

// The three rounds are chosen together: the best openings are chased to the end, so
// round two never eats the options round three needs to stay balanced.
function fullGroupGames(players) {
  const lineUps = nightLineUps(players);
  const none = { partners: new Set(), opponents: new Set(), meets: new Map() };
  const ranked = (seen) =>
    lineUps
      .map((matches) => ({ matches, cost: roundCost(matches, seen) }))
      .sort((a, b) => a.cost - b.cost);

  let best = null;
  for (const g1 of ranked(none).slice(0, 12)) {
    const after1 = nextSeen(none, g1.matches);
    for (const g2 of ranked(after1).slice(0, 5)) {
      const g3 = ranked(nextSeen(after1, g2.matches))[0];
      const cost = g1.cost + g2.cost + g3.cost;
      if (!best || cost < best.cost) best = { cost, rounds: [g1.matches, g2.matches, g3.matches] };
    }
  }

  return (best ? best.rounds : []).map((matches, gi) => ({
    game: gi + 1,
    label: `Game ${gi + 1} · within group`,
    matches: matches.map((m) => ({ teamA: m.A, teamB: m.B })),
  }));
}

function shortGroupGames(players) {
  const plan = PLANS[players.length] || [];
  const seen = { partners: new Set(), opponents: new Set(), meets: new Map() };
  const rests = {};
  const games = [];

  for (let g = 1; g <= 3; g++) {
    if (!plan.length) {
      games.push([]);
      continue;
    }
    const slots = plan.reduce((n, [a, b]) => n + a + b, 0);
    const byRest = [...players].sort((a, b) => (rests[b.name] || 0) - (rests[a.name] || 0));
    const playing = byRest.slice(0, slots);
    for (const p of players) if (!playing.includes(p)) rests[p.name] = (rests[p.name] || 0) + 1;

    const teams = bestAssignment(playing, plan, seen);
    if (!teams) {
      games.push([]);
      continue;
    }
    remember(seen, teams);
    games.push(teams.map((t) => ({ teamA: t.A, teamB: t.B })));
  }
  return games;
}

// Pairing scope. "1" keeps the night's groups to themselves (the way it has always
// worked); 2 or 3 throws that many neighbouring groups into one pool, so any of the
// 16 or 24 players can be paired with any other and every round is balanced across
// the whole pool.
function pooledDraw(groups, list, poolGroups) {
  const out = [];
  let court = 1;

  for (let i = 0; i < groups.length; i += poolGroups) {
    const chunk = groups.slice(i, i + poolGroups);
    const players = chunk.flatMap((g) => g.players);
    const courtCount = Math.max(2, Math.ceil(players.length / 4));
    const courts = Array.from({ length: courtCount }, () => court++);
    const complete = players.length >= 8;

    const games = complete
      ? poolGames(players).map((g) => ({
          game: g.game,
          label: `Game ${g.game} · across ${chunk.length} groups`,
          matches: g.matches,
        }))
      : shortGroupGames(players).map((matches, gi) => ({
          game: gi + 1,
          label: `Game ${gi + 1} · mixed formats`,
          matches,
        }));

    out.push({
      group: out.length + 1,
      label:
        chunk.length === 1
          ? `Group ${chunk[0].groupNum}`
          : `Groups ${chunk.map((g) => g.groupNum).join(" & ")}`,
      courts,
      complete,
      average: groupAverage(players),
      players,
      top4: players.slice(0, 4).map((p) => p.name),
      bottom4: players.slice(-4).map((p) => p.name),
      games,
    });
  }

  return { totalPlayers: list.length, poolGroups, groups: out };
}

// Distance pairing: the rounds that stay in the group are played there, and the
// chosen round meets the group `distance` places away, so every match is still
// chosen on pair averages alone. Two of a group's bottom four are never partnered
// in that round, and a group left without a partner plays it inside instead.
function levelPartners(count, distance) {
  const taken = new Set();
  const pairs = [];
  for (let i = 0; i < count; i++) {
    const far = i + distance;
    if (taken.has(i) || far >= count || taken.has(far)) continue;
    taken.add(i);
    taken.add(far);
    pairs.push([i, far]);
  }
  return pairs;
}

const insideNight = (players) => {
  const games =
    players.length === 8
      ? fullGroupGames(players)
      : shortGroupGames(players).map((matches, gi) => ({ game: gi + 1, matches }));
  return games.map((game) => game.matches || []);
};

// Cross-group night: one round meets another group, the rest are played inside the
// group. Game 2 meets the group two levels away (a crossover); Game 3 meets the
// group four levels away, so the strongest group plays the newest players and every
// beginner gets a stronger partner.
function mixDraw(groups, list, crossGame, distance) {
  const courts = groups.map((_, i) => [i * 2 + 1, i * 2 + 2]);
  const inside = groups.map((g) => insideNight(g.players));
  const pairs = levelPartners(groups.length, distance);
  const hostOf = new Map(pairs);
  const guestOf = new Map(pairs.map(([i, j]) => [j, i]));

  // Two full groups get the freshest night the arithmetic allows: the inside rounds
  // that repeat the fewest faces, then a cross game built only from pairs nobody in
  // the group has met yet.
  const planned = new Map();
  for (const [i, j] of pairs) {
    const a = groups[i].players;
    const b = groups[j].players;
    if (a.length !== 8 || b.length !== 8) continue;
    const bottom = new Set([...a.slice(-4), ...b.slice(-4)].map((p) => String(p.name).toLowerCase()));
    const plan = buildCrossoverPair(a, b, bottom);
    if (!plan) continue;
    // The planner works in {A, B} teams; the night uses {teamA, teamB}.
    const norm = (round) => round.map((m) => ({ teamA: m.A, teamB: m.B }));
    const aRounds = plan.aRounds.map(norm);
    const bRounds = plan.bRounds.map(norm);
    planned.set(i, { guest: j, aRounds, bRounds, cross: norm(plan.cross) });
    inside[i] = aRounds;
    inside[j] = bRounds;
  }

  // Partners and opponents already used in the inside games, so the cross game never
  // repeats them or plays anyone a third time.
  const seen = { partners: new Set(), opponents: new Set(), meets: new Map() };
  for (const rounds of inside) {
    for (const matches of rounds.slice(0, 2)) {
      remember(seen, matches.map((m) => ({ A: m.teamA, B: m.teamB })));
    }
  }

  const cross = new Map();
  for (const [i, j] of pairs) {
    const nets = [...courts[i], ...courts[j]];
    if (planned.has(i)) {
      cross.set(
        i,
        planned.get(i).cross.map((m, mi) => ({ ...m, net: nets[mi % nets.length] }))
      );
      continue;
    }
    const a = groups[i].players;
    const b = groups[j].players;
    const bottom = new Set([...a.slice(-4), ...b.slice(-4)].map((p) => p.name));
    cross.set(
      i,
      poolRound([...a, ...b], seen, bottom).map((m, mi) => ({ ...m, net: nets[mi % nets.length] }))
    );
  }

  const out = groups.map((g, i) => {
    const rounds = inside[i];
    const games = [];
    let used = 0;

    for (let n = 1; n <= 3; n++) {
      if (n === crossGame && hostOf.has(i)) {
        games.push({
          game: n,
          label: `Game ${n} · vs Group ${groups[hostOf.get(i)].groupNum}`,
          matches: cross.get(i) || [],
        });
      } else if (n === crossGame && guestOf.has(i)) {
        // Played against the host group, so those matches are listed there.
      } else {
        games.push({ game: n, label: `Game ${n} · within group`, matches: rounds[used++] || [] });
      }
    }

    return {
      group: g.groupNum,
      label: `Group ${g.groupNum}`,
      courts: courts[i],
      complete: g.players.length === 8,
      average: groupAverage(g.players),
      players: g.players,
      top4: g.players.slice(0, 4).map((p) => p.name),
      bottom4: g.players.slice(4, 8).map((p) => p.name),
      games,
    };
  });

  return {
    totalPlayers: list.length,
    poolGroups: crossGame === 2 ? 0 : -1,
    levels: true,
    groups: out,
  };
}

// "Random games": the whole night becomes one pool, so anyone can partner or play
// anyone — but every round is still chosen on pair strength, so the games stay even.
export const RANDOM_SCOPE = 99;

function randomDraw(groups, list) {
  const pooled = pooledDraw(groups, list, groups.length);
  return {
    ...pooled,
    poolGroups: RANDOM_SCOPE,
    groups: pooled.groups.map((g) => ({ ...g, label: "Whole night" })),
  };
}

function buildDraw(players, options = {}) {
  const list = players || [];
  const groups = buildGroups(list);
  const requested = options.poolGroups === undefined ? 0 : Number(options.poolGroups);
  const poolGroups = Number.isFinite(requested) ? requested : 0;

  // 0 = crossover (Game 2 two levels apart), -1 = help beginners (Game 3 four levels
  // apart), 1 = each group on its own, RANDOM_SCOPE = the whole night in one pool.
  if (groups.length > 1) {
    if (poolGroups >= RANDOM_SCOPE) return randomDraw(groups, list);
    if (poolGroups === 0) return mixDraw(groups, list, 2, 2);
    if (poolGroups === -1) return mixDraw(groups, list, 3, 4);
    if (poolGroups > 1) return pooledDraw(groups, list, Math.min(3, poolGroups));
  }

  const out = groups.map((g, i) => {
    const complete = g.players.length === 8;
    const games = complete
      ? fullGroupGames(g.players)
      : shortGroupGames(g.players).map((matches, gi) => ({
          game: gi + 1,
          label: `Game ${gi + 1} · mixed formats`,
          matches,
        }));

    return {
      group: g.groupNum,
      label: `Group ${g.groupNum}`,
      courts: [i * 2 + 1, i * 2 + 2],
      complete,
      average: groupAverage(g.players),
      players: g.players,
      top4: g.players.slice(0, 4).map((p) => p.name),
      bottom4: g.players.slice(4, 8).map((p) => p.name),
      games,
    };
  });

  return { totalPlayers: list.length, poolGroups: 1, groups: out };
}

const drawFor = (players, options) => {
  // Unique draws are validated as a whole and must never pass through the
  // legacy unconstrained post-draw swap, which can reintroduce repeats.
  if (options.poolGroups === undefined || Number(options.poolGroups) === -2) {
    return buildUniqueDraw(buildGroups(players || []));
  }
  return keepApartDraw(buildDraw(players, options));
};

// Everyone stays in the same rating-based draw. Junior matchups are a soft
// preference; only the American-doubles safety restriction is mandatory.
export function buildNightDraw(players, options = {}) {
  return assertJuniorDraw(drawFor(players || [], options));
}

export function flattenMatches(draw) {
  const rows = [];
  for (const g of draw.groups) {
    for (const game of g.games) {
      game.matches.forEach((m, mi) => {
        rows.push({
          group: g.group,
          game: game.game,
          net: m.net ?? g.courts[mi % g.courts.length],
          team1: m.teamA.map((p) => p.name),
          team2: m.teamB.map((p) => p.name),
        });
      });
    }
  }
  return rows;
}

export function toRecord(draw, date, meta = {}) {
  assertJuniorDraw(draw);
  return {
    ...meta,
    date,
    variant: draw.poolGroups === -2 ? "unique" : "normal",
    pairing_scope: draw.poolGroups,
    courts_per_group: 2,
    published: true,
    archived: false,
    groups: draw.groups.map((g) => ({
      group: g.group,
      label: g.label || String(g.group),
      courts: g.courts,
      players: g.players.map((p) => p.name),
      top4: g.top4,
      bottom4: g.bottom4,
      average: g.average ?? null,
    })),
    matches: flattenMatches(draw),
  };
}

// Two players traded everywhere they appear — in the same group or across groups.
// Every match stays a valid line-up, and each player takes the other's games.
export function swapPlayer(record, a, b) {
  const swap = (names) => (names || []).map((n) => (n === a ? b : n === b ? a : n));
  return {
    ...record,
    groups: (record.groups || []).map((g) => ({
      ...g,
      players: swap(g.players),
      top4: swap(g.top4),
      bottom4: swap(g.bottom4),
    })),
    matches: (record.matches || []).map((m) => ({ ...m, team1: swap(m.team1), team2: swap(m.team2) })),
  };
}

// Exchange the selected player's slot and the other player's slot in the same
// round, even across groups. Only those two matches change; group membership and
// every other game stay untouched. If the other player is resting, trade the rest.
export function swapInGame(record, a, b, net, game) {
  const matches = record.matches || [];
  const contains = (match, name) => [...(match.team1 || []), ...(match.team2 || [])].includes(name);
  const sourceIndex = matches.findIndex((match) =>
    Number(match.net) === Number(net) && Number(match.game) === Number(game) && contains(match, a)
  );
  if (sourceIndex < 0 || a === b) return record;
  const targetIndex = matches.findIndex((match) =>
    Number(match.game) === Number(game) && contains(match, b)
  );
  const swap = (names) => (names || []).map((name) => (name === a ? b : name === b ? a : name));
  return {
    ...record,
    matches: matches.map((match, index) =>
      index === sourceIndex || index === targetIndex
        ? { ...match, team1: swap(match.team1), team2: swap(match.team2) }
        : match
    ),
  };
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// Builds a whole night's draw in the app: rating-sorted groups, two courts each and
// three matches per player. Every round of a full group of eight is paired by the
// app itself (rating closeness, mixed-pair gender balance, no repeated partners), so
// the gender adjustment shapes all three games. Shorter groups are filled with mixed
// formats — American doubles (one player against two) and singles — so a group of
// five, six or seven still gets a night's play instead of nothing.
import { buildGroups, groupAverage } from "./drawGenerator";
import { teamAvg } from "./teamRating";
import { poolGames } from "./poolDraw";

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
      const a = teamAvg(t.A);
      const b = teamAvg(t.B);
      if (a !== null && b !== null) c += Math.abs(a - b) * 4;
    }
    return c;
  };

  const walk = (depth) => {
    if (depth === slots.length) {
      const teams = teamsFrom();
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
  }
};

// All three rounds of a full group are paired by the app, using the same engine as
// the short groups: closest team ratings, mixed pairs weighed with the gender
// handicap, and the fewest repeated partners and opponents across the night.
function fullGroupGames(players) {
  const seen = { partners: new Set(), opponents: new Set() };
  const games = [];

  for (let gi = 0; gi < 3; gi++) {
    const teams = bestAssignment(players, [[2, 2], [2, 2]], seen);
    if (!teams) {
      games.push({ game: gi + 1, label: `Game ${gi + 1} · within group`, matches: [] });
      continue;
    }
    remember(seen, teams);
    games.push({
      game: gi + 1,
      label: `Game ${gi + 1} · within group`,
      matches: teams.map((t) => ({ teamA: t.A, teamB: t.B })),
    });
  }
  return games;
}

function shortGroupGames(players) {
  const plan = PLANS[players.length] || [];
  const seen = { partners: new Set(), opponents: new Set() };
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

export function buildNightDraw(players, options = {}) {
  const list = players || [];
  const groups = buildGroups(list);
  const poolGroups = Math.max(1, Math.min(3, Number(options.poolGroups) || 1));

  if (poolGroups > 1 && groups.length > 1) return pooledDraw(groups, list, poolGroups);

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

export function flattenMatches(draw) {
  const rows = [];
  for (const g of draw.groups) {
    for (const game of g.games) {
      game.matches.forEach((m, mi) => {
        rows.push({
          group: g.group,
          game: game.game,
          net: g.courts[mi % g.courts.length],
          team1: m.teamA.map((p) => p.name),
          team2: m.teamB.map((p) => p.name),
        });
      });
    }
  }
  return rows;
}

export function toRecord(draw, date, meta = {}) {
  return {
    ...meta,
    date,
    courts_per_group: 2,
    published: true,
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

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
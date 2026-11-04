// Builds a whole night's draw in the app: rating-sorted groups, two courts each and
// three matches per player. Full groups of eight use the same three games as the
// sheet script (internal, cross group, internal). Shorter groups are filled with
// mixed formats — American doubles (one player against two) and singles — so a group
// of five, six or seven still gets a night's play instead of nothing.
import { buildGroups, generateDraw, groupAverage } from "./drawGenerator";

const key = (a, b) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

// Ratings run lowest = strongest. A man partnered with a woman is treated as
// playing slightly below his rating, so a mixed pair is compared with same-gender
// pairs fairly and the closest contest is chosen. GENDER_HANDICAP is the size of
// that adjustment.
export const GENDER_HANDICAP = 0.2;

const isMale = (p) => String(p.gender || "").trim().toLowerCase().startsWith("m");
const isFemale = (p) => String(p.gender || "").trim().toLowerCase().startsWith("f");

const teamAvg = (team) => {
  const rated = team.filter((p) => p.rating !== null && p.rating !== undefined);
  if (!rated.length) return null;
  const mixed = rated.some(isMale) && rated.some(isFemale);
  const total = rated.reduce(
    (s, p) => s + (mixed && isMale(p) ? p.rating + GENDER_HANDICAP : p.rating),
    0
  );
  return total / rated.length;
};

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

// A full group takes its games from the script logic, but when it has no group
// next to it (or the neighbour is short) the cross games cannot be made — those
// rounds are played inside the group instead, so nobody is left with one game.
function completeGroupGames(players, scripted) {
  const seen = { partners: new Set(), opponents: new Set() };
  const games = [];

  for (let gi = 0; gi < 3; gi++) {
    const candidate = scripted[gi];
    if (candidate && candidate.matches.length) {
      games.push({ game: gi + 1, label: candidate.label, matches: candidate.matches });
      remember(seen, candidate.matches.map((m) => ({ A: m.teamA, B: m.teamB })));
      continue;
    }
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

export function buildNightDraw(players, variant = "normal") {
  const list = players || [];
  const groups = buildGroups(list);
  // Full groups take their games from the existing script logic, including the
  // cross-group games, so the draw stays identical to what the sheet produced.
  const full = generateDraw(list, variant);

  const out = groups.map((g, i) => {
    const complete = g.players.length === 8;
    const games = complete
      ? completeGroupGames(g.players, full.groups[i]?.games || [])
      : shortGroupGames(g.players).map((matches, gi) => ({
          game: gi + 1,
          label: `Game ${gi + 1} · mixed formats`,
          matches,
        }));

    return {
      group: g.groupNum,
      courts: [i * 2 + 1, i * 2 + 2],
      complete,
      average: groupAverage(g.players),
      players: g.players,
      top4: g.players.slice(0, 4).map((p) => p.name),
      bottom4: g.players.slice(4, 8).map((p) => p.name),
      games,
    };
  });

  return { variant, totalPlayers: list.length, groups: out };
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
    variant: draw.variant,
    courts_per_group: 2,
    published: true,
    groups: draw.groups.map((g) => ({
      group: g.group,
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
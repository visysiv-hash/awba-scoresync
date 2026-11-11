import { groupAverage } from "@/lib/drawGenerator";
import { uniqueCandidates } from "@/lib/uniqueCandidates";
import { searchUniqueRounds, balanceUniqueRounds } from "@/lib/uniqueSearch";
import { scheduleUniqueness } from "@/lib/scheduleUniqueness";

// Match formats that give every player in the group three games. A full group of
// eight plays two doubles games a round; a short group mixes American doubles
// (one player against two) and singles so nobody sits a round out.
const PLANS = {
  11: [4, 4],
  10: [4, 4],
  9: [4, 4],
  8: [4, 4],
  7: [4, 3],
  6: [3, 3],
  5: [3, 2],
  4: [4],
  3: [2],
  2: [2],
  1: [],
};

// Spread each round back over the nets it belongs to: a group always hosts the
// number of matches its own players need, preferring its own players, so a short
// group's American doubles and singles land on its own nets.
function assignToGroups(matches, plans, players, courts) {
  const need = plans.map((sizes) => ({ sizes: [...sizes].sort((a, b) => b - a), picked: [] }));
  const taken = new Array(matches.length).fill(false);
  const options = [];
  matches.forEach((match, mi) => {
    need.forEach((group, gi) => {
      if (!group.sizes.includes(match.ids.length)) return;
      const own = match.ids.filter((id) => players[id].home === gi).length;
      options.push({ gi, mi, own, cost: match.cost });
    });
  });
  options.sort((a, b) => b.own - a.own || a.cost - b.cost);
  for (const option of options) {
    if (taken[option.mi]) continue;
    const group = need[option.gi];
    const at = group.sizes.indexOf(matches[option.mi].ids.length);
    if (at < 0) continue;
    group.sizes.splice(at, 1);
    group.picked.push(matches[option.mi]);
    taken[option.mi] = true;
  }
  return need.map((group, gi) =>
    group.picked.map((match, i) => ({ ...match, net: courts[gi][i % courts[gi].length] }))
  );
}

export function buildUniqueDraw(groups) {
  const plans = groups.map((g) => PLANS[g.players.length] || []);
  const courts = groups.map((_, i) => [i * 2 + 1, i * 2 + 2]);
  const players = groups.flatMap((g, home) =>
    g.players.map((p, i) => ({ ...p, home, bottom: i >= 4 }))
  );
  const sizes = plans.flat();
  const slots = sizes.reduce((sum, size) => sum + size, 0);
  const cache = new Map();
  const candidatesAt = (distance) => {
    if (!cache.has(distance)) cache.set(distance, uniqueCandidates(players, sizes, distance));
    return cache.get(distance);
  };

  // How many times a pair of players is repeated inside a found draw.
  const repeats = (found, field) => {
    const seen = new Set();
    let count = 0;
    for (const game of found) for (const match of game) for (const key of match[field]) {
      if (seen.has(key)) count++;
      else seen.add(key);
    }
    return count;
  };

  let rounds = null;
  let policy = "meetings";
  // A quartet cannot meet four fresh people in a later round when the whole pool
  // has fewer than four matches (pigeonhole principle).
  const impossibleEncounters = sizes.includes(4) && sizes.length < 4;
  // Only encounter preferences can relax. Junior safety is never relaxed.
  for (const rule of ["meetings", "roles", "relaxed"]) {
    if (rule === "meetings" && impossibleEncounters) continue;
    for (let distance = 0; distance < Math.max(1, groups.length); distance++) {
      if (rule === "meetings" && distance === 0 && groups.some((g) => g.players.length === 8)) continue;
      const candidates = candidatesAt(distance);
      const found = searchUniqueRounds(players.length, candidates, sizes, rule);
      if (!found) continue;
      // A draw only counts when it meets the rule it was searched under; a roster
      // that makes that impossible moves the search on to the next rule instead of
      // failing outright, so the admin always ends up with a night to play.
      const balanced = balanceUniqueRounds(found, candidates, rule);
      if (rule === "meetings" && repeats(balanced, "meetings")) continue;
      if (rule === "roles" && (repeats(balanced, "partners") || repeats(balanced, "opponents"))) continue;
      rounds = balanced;
      policy = rule;
      break;
    }
    if (rounds) break;
  }
  if (!rounds) throw new Error("No legal draw was found for this player list.");

  const out = groups.map((g, i) => ({
    group: g.groupNum,
    label: `Group ${g.groupNum}`,
    courts: courts[i],
    complete: g.players.length === 8,
    players: g.players,
    average: groupAverage(g.players),
    top4: g.players.slice(0, 4).map((p) => p.name),
    bottom4: g.players.slice(4).map((p) => p.name),
    games: [1, 2, 3].map((game) => ({
      game,
      label: `Game ${game} · ${policy === "relaxed" ? "fallback draw" : "unique games"}`,
      matches: [],
    })),
  }));

  const flat = [];
  rounds.forEach((matches, gi) => {
    const used = new Set();
    assignToGroups(matches, plans, players, courts).forEach((groupMatches, g) => {
      for (const match of groupMatches) {
        for (const id of match.ids) {
          if (used.has(id)) throw new Error("A player has two slots in one game.");
          used.add(id);
        }
        const teams = match.teams.map((team) => team.map((id) => players[id]));
        out[g].games[gi].matches.push({ teamA: teams[0], teamB: teams[1], net: match.net });
        flat.push({
          game: gi + 1,
          net: match.net,
          team1: teams[0].map((p) => p.name),
          team2: teams[1].map((p) => p.name),
        });
      }
    });
    if (used.size !== slots) throw new Error("The draw is missing a player slot.");
  });

  const info = scheduleUniqueness({
    groups: out.map((g) => ({ players: g.players.map((p) => p.name) })),
    matches: flat,
  });
  // The night always comes back with a draw. If the games as displayed don't hold
  // the rule they were searched under they are reported as a fallback draw, so the
  // schedule is shown with an honest note instead of failing with nothing to play.
  if ((policy === "meetings" && info.meetings) || (policy === "roles" && (info.partners || info.opponents))) {
    policy = "relaxed";
    for (const group of out) {
      for (const game of group.games) game.label = `Game ${game.game} · fallback draw`;
    }
  }
  return { totalPlayers: players.length, poolGroups: -2, groups: out, uniqueInfo: info };
}
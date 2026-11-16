import { groupAverage } from "@/lib/drawGenerator";
import { uniqueCandidates } from "@/lib/uniqueCandidates";
import { searchUniqueRounds, balanceUniqueRounds } from "@/lib/uniqueSearch";
import { scheduleUniqueness } from "@/lib/scheduleUniqueness";
import { americanSet } from "@/lib/americanDoubles";

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
  3: [3],
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

// The admin can nominate who is happy to play American doubles and singles; those
// formats then go to the nominated players, wherever the night still allows it.
export function buildUniqueDraw(groups, options = {}) {
  const shortFormatOk = americanSet(options.americanDoubles);
  // A full group fills two courts a round; a short group plays a single game a round
  // and needs only one, so the net numbers stay in one run with no net left empty.
  const courts = [];
  let netNumber = 1;
  for (const g of groups) {
    const width = g.players.length >= 4 ? 2 : 1;
    courts.push(Array.from({ length: width }, (_, k) => netNumber + k));
    netNumber += width;
  }
  // A group of two or three has the same few players in it all night, so it can never
  // be unique and is left out of the search: its American doubles and singles are
  // built directly, rotating the lone player so the handicap is shared. Only the full
  // groups are pooled for the unique draw.
  const fullGroups = groups.filter((g) => (g.players || []).length >= 4);
  const fullIndexes = fullGroups.map((g) => groups.indexOf(g));
  const fullCourts = fullIndexes.map((i) => courts[i]);
  const plans = fullGroups.map((g) => PLANS[g.players.length] || []);
  const players = fullGroups.flatMap((g, home) =>
    g.players.map((p, i) => ({ ...p, home, bottom: i >= 4 }))
  );
  const sizes = plans.flat();
  const slots = sizes.reduce((sum, size) => sum + size, 0);
  const cache = new Map();
  const candidatesAt = (distance) => {
    if (!cache.has(distance)) cache.set(distance, uniqueCandidates(players, sizes, distance, shortFormatOk));
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
    for (let distance = 0; distance < Math.max(1, fullGroups.length); distance++) {
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
  if (sizes.length && !rounds) throw new Error("No legal draw was found for this player list.");

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
      label:
        g.players.length < 4
          ? `Game ${game} · ${g.players.length === 3 ? "American doubles" : "singles"}`
          : `Game ${game} · ${policy === "relaxed" ? "fallback draw" : "unique games"}`,
      matches: [],
    })),
  }));

  const flat = [];
  const push = (index, game, teamA, teamB, net) => {
    out[index].games[game - 1].matches.push({ teamA, teamB, net });
    flat.push({ game, net, team1: teamA.map((p) => p.name), team2: teamB.map((p) => p.name) });
  };

  (rounds || []).forEach((matches, gi) => {
    const used = new Set();
    assignToGroups(matches, plans, players, fullCourts).forEach((groupMatches, fg) => {
      for (const match of groupMatches) {
        for (const id of match.ids) {
          if (used.has(id)) throw new Error("A player has two slots in one game.");
          used.add(id);
        }
        const teams = match.teams.map((team) => team.map((id) => players[id]));
        push(fullIndexes[fg], gi + 1, teams[0], teams[1], match.net);
      }
    });
    if (used.size !== slots) throw new Error("The draw is missing a player slot.");
  });

  // The short group's own three games: American doubles with a different player alone
  // each round, or singles, so everyone in it plays all three.
  groups.forEach((g, i) => {
    if ((g.players || []).length >= 4) return;
    const net = courts[i][0];
    // Only the player alone meets a pair head-on, and a junior may only do that when
    // everyone in the game is a junior too, so the lone turn goes to the others first.
    const adults = g.players.filter((p) => !p.junior);
    const loneOrder = adults.length ? adults : g.players;
    for (let game = 1; game <= 3; game++) {
      if (g.players.length === 3) {
        const lone = loneOrder[(game - 1) % loneOrder.length];
        push(i, game, [lone], g.players.filter((p) => p !== lone), net);
      } else if (g.players.length === 2) {
        const swap = game % 2 === 0;
        push(i, game, [g.players[swap ? 1 : 0]], [g.players[swap ? 0 : 1]], net);
      }
    }
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
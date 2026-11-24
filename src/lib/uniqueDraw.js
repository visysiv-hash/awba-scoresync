import { groupAverage } from "@/lib/drawGenerator";
import { uniqueCandidates } from "@/lib/uniqueCandidates";
import { searchUniqueRounds, balanceUniqueRounds } from "@/lib/uniqueSearch";
import { scheduleUniqueness } from "@/lib/scheduleUniqueness";
import { americanSet, isNominated } from "@/lib/americanDoubles";
import { juniorMatchAllowed } from "@/lib/juniorSafety";

// Match formats that give every player in the group three games. A full group of
// eight plays two doubles games a round; a short group mixes American doubles
// (one player against two) and singles so nobody sits a round out. A six is built
// separately (see below): two American doubles a round, one on each of its courts.
const PLANS = {
  11: [4, 4],
  10: [4, 4],
  9: [4, 4],
  8: [4, 4],
  7: [4, 3],
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

const pairKeys = (ids, n) => ids.flatMap((a, i) => ids.slice(i + 1).map((b) => Math.min(a, b) * n + Math.max(a, b)));

// Strongest first, unrated last, so the singles and the doubles in a leftover group
// are picked from neighbouring ratings.
const byRating = (list) => [...(list || [])].sort((a, b) => {
  const x = Number(a.rating);
  const y = Number(b.rating);
  if (!Number.isFinite(x)) return Number.isFinite(y) ? 1 : 0;
  if (!Number.isFinite(y)) return -1;
  return x - y;
});

// Who stands alone in American doubles. The single player carries the handicap, so
// the admin's nomination decides it: a nominated player takes the lonely side and is
// never left in the pair while someone else stands alone. Nobody stands alone twice,
// a junior only ever stands alone among juniors, and the pair that faces the single
// is the one whose average sits closest to the single player's own rating.
function roleShortGames(rounds, players, nominated) {
  const loneSeen = new Set();
  const rating = (id) => Number(players[id].rating);
  const gap = (lone, pair) => {
    const solo = rating(lone);
    const duo = pair.reduce((sum, id) => sum + rating(id), 0) / pair.length;
    return Number.isFinite(solo) && Number.isFinite(duo) ? Math.abs(solo - duo) : 0;
  };
  const setRole = (match, lone) => {
    const pair = match.ids.filter((id) => id !== lone);
    const teams = [[lone], pair];
    match.teams = teams;
    match.lone = lone;
    match.partners = teams.flatMap((team) => pairKeys(team, players.length));
    match.opponents = teams[0].flatMap((a) => teams[1].map((b) => Math.min(a, b) * players.length + Math.max(a, b)));
    match.meetings = pairKeys(match.ids, players.length);
    loneSeen.add(lone);
  };
  for (const round of rounds) {
    for (const match of round) {
      if (match.ids.length !== 3) continue;
      const safe = match.ids.filter((id) => juniorMatchAllowed([players[id]], match.ids.filter((x) => x !== id).map((x) => players[x])));
      // Only a nominated player stands alone. A game with nobody nominated keeps its
      // own players as the last resort so a night is never left with no draw at all.
      const volunteers = safe.filter((id) => isNominated(players[id].name, nominated));
      const allowed = volunteers.length ? volunteers : safe;
      const fresh = allowed.filter((id) => !loneSeen.has(id));
      const pool = fresh.length ? fresh : allowed;
      if (!pool.length) continue;
      // A fresh volunteer first, then the closest pair average.
      const best = [...pool].sort((a, b) =>
        gap(a, match.ids.filter((id) => id !== a)) - gap(b, match.ids.filter((id) => id !== b))
      )[0];
      setRole(match, best);
    }
  }
}

// The leftover six plays two American doubles a round, one on each of its two courts:
// three players a court, one against a pair. Everyone plays all three games, and each
// player takes the lonely side once so the handicap is shared. The pair facing a single
// player is the one whose average sits closest to theirs, a nominated player stands
// alone before anyone else, and a junior only ever faces two juniors: a game that would
// put a junior alone against an adult pair is never offered at all, so the block is
// always drawn instead of being rejected.
function sixRounds(players, nominated) {
  const list = byRating(players);

  const cost = (lone, pair) => {
    const solo = Number(lone.rating);
    const duo = pair.reduce((sum, p) => sum + Number(p.rating), 0) / pair.length;
    if (!Number.isFinite(solo) || !Number.isFinite(duo)) return 0;
    // The single player carries the handicap, so they should be the stronger side and
    // as close to the pair's average as the block allows.
    return Math.abs(solo - duo) + Math.max(0, solo - duo) * 2;
  };

  // The three ways the four players not standing alone make two pairs.
  const splits = (four) => [
    [[four[0], four[1]], [four[2], four[3]]],
    [[four[0], four[2]], [four[1], four[3]]],
    [[four[0], four[3]], [four[1], four[2]]],
  ];

  // How often each player has taken the lonely side. A second turn is heavily penalised
  // so everyone gets one, and a junior takes their turn early: a junior can only stand
  // alone while two other juniors are still free to face them, so the turns run out.
  const turns = new Map(list.map((p) => [p, 0]));

  return [1, 2, 3].map(() => {
    let best = null;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const alone = [list[i], list[j]];
        const rest = list.filter((p) => !alone.includes(p));
        for (const [x, y] of splits(rest)) {
          for (const [first, second] of [[x, y], [y, x]]) {
            // The lonely side is only ever handed out in a game it may be played in.
            if (!juniorMatchAllowed([alone[0]], first) || !juniorMatchAllowed([alone[1]], second)) continue;
            const repeat = alone.reduce((sum, p) => sum + (turns.get(p) || 0) * 500, 0);
            const early = alone.reduce((sum, p) => sum + (p.junior && !turns.get(p) ? -200 : 0), 0);
            const willing = alone.filter((p) => !isNominated(p.name, nominated)).length * 50;
            const total = cost(alone[0], first) + cost(alone[1], second) + repeat + early + willing;
            if (!best || total < best.total) best = { total, games: [[alone[0], first], [alone[1], second]] };
          }
        }
      }
    }
    for (const [lone] of best.games) turns.set(lone, (turns.get(lone) || 0) + 1);
    return best.games;
  });
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
  // A group of six is the leftover block on a busy night: too few faces in it to stay
  // fresh all night, so it is left out of the search and built directly below as one
  // singles and one doubles a round. The groups that can play a fresh draw are pooled.
  const sixIndexes = groups.map((g, i) => ((g.players || []).length === 6 ? i : -1)).filter((i) => i >= 0);
  // A group of two or three has the same few players in it all night, so it can never
  // be unique and is left out of the search too: its American doubles and singles are
  // built directly, rotating the lone player so the handicap is shared.
  const fullGroups = groups.filter((g, i) => (g.players || []).length >= 4 && !sixIndexes.includes(i));
  const fullIndexes = fullGroups.map((g) => groups.indexOf(g));
  const fullCourts = fullIndexes.map((i) => courts[i]);
  const plans = fullGroups.map((g) => PLANS[g.players.length] || []);
  const players = fullGroups.flatMap((g, home) =>
    // `nominated` lets a short-format game borrow this player from another group.
    g.players.map((p, i) => ({ ...p, home, bottom: i >= 4, nominated: isNominated(p.name, shortFormatOk) }))
  );
  const sizes = plans.flat();
  const slots = sizes.reduce((sum, size) => sum + size, 0);
  const cache = new Map();

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
  // The night is searched twice: first with the American doubles games kept to the
  // players who volunteered to stand alone, then, only if that night cannot be made,
  // with everyone eligible again so the admin is never left without a draw.
  const run = (volunteersOnly) => {
    const candidatesAt = (distance) => {
      const key = `${volunteersOnly}:${distance}`;
      if (!cache.has(key)) cache.set(key, uniqueCandidates(players, sizes, distance, shortFormatOk, volunteersOnly));
      return cache.get(key);
    };
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
        roleShortGames(balanced, players, shortFormatOk);
        if (rule === "meetings" && repeats(balanced, "meetings")) continue;
        if (rule === "roles" && (repeats(balanced, "partners") || repeats(balanced, "opponents"))) continue;
        return { rounds: balanced, policy: rule };
      }
    }
    return null;
  };
  const searched = run(true) || run(false);
  if (searched) {
    rounds = searched.rounds;
    policy = searched.policy;
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
        g.players.length === 6
          ? `Game ${game} · American doubles`
          : g.players.length < 4
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

  // The leftover six: two American doubles a round, one on each of its two courts.
  sixIndexes.forEach((i) => {
    const [firstNet, secondNet] = courts[i];
    sixRounds(groups[i].players, shortFormatOk).forEach((games, gi) => {
      push(i, gi + 1, [games[0][0]], games[0][1], firstNet);
      push(i, gi + 1, [games[1][0]], games[1][1], secondNet);
    });
  });

  // The short group's own three games: American doubles with a different player alone
  // each round, or singles, so everyone in it plays all three.
  groups.forEach((g, i) => {
    if ((g.players || []).length >= 4) return;
    const net = courts[i][0];
    // Only the player alone meets a pair head-on, and a junior may only do that when
    // everyone in the game is a junior too, so the lone turn goes to the others first.
    // The admin's nomination decides it: a nominated player stands alone, never anyone
    // who did not put their hand up.
    const volunteers = g.players.filter((p) => isNominated(p.name, shortFormatOk));
    const raised = volunteers.length ? volunteers : g.players;
    const adults = raised.filter((p) => !p.junior);
    const loneOrder = adults.length ? adults : raised;
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
    // Every match is inspected, but a group short of eight is exempt inside: it meets
    // the same few players by design, so its repeats say nothing about the full groups.
    matches: flat,
  });
  // The night always comes back with a draw. If the games as displayed don't hold
  // the rule they were searched under they are reported as a fallback draw, so the
  // schedule is shown with an honest note instead of failing with nothing to play.
  if ((policy === "meetings" && info.meetings) || (policy === "roles" && (info.partners || info.opponents))) {
    policy = "relaxed";
    for (const group of out) {
      if (group.players.length === 6) continue;
      for (const game of group.games) game.label = `Game ${game.game} · fallback draw`;
    }
  }
  return { totalPlayers: players.length, poolGroups: -2, groups: out, uniqueInfo: info };
}
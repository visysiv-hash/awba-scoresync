import { groupAverage } from "@/lib/drawGenerator";
import { uniqueCandidates } from "@/lib/uniqueCandidates";
import { searchUniqueRounds, balanceUniqueRounds } from "@/lib/uniqueSearch";
import { scheduleUniqueness } from "@/lib/scheduleUniqueness";

function matchSizes(count) {
  if (count < 2) return [];
  if (count === 3) return [2];
  const sizes = Array(Math.floor(count / 4)).fill(4);
  const extra = count % 4;
  if (extra === 1) { sizes.pop(); sizes.push(3, 2); }
  else if (extra) sizes.push(extra);
  return sizes;
}

export function buildUniqueDraw(groups) {
  const players = groups.flatMap((g, home) => g.players.map((p, i) => ({ ...p, home, bottom: i >= 4 })));
  const sizes = matchSizes(players.length);
  const cache = new Map();
  const candidatesAt = (distance) => {
    if (!cache.has(distance)) cache.set(distance, uniqueCandidates(players, sizes, distance));
    return cache.get(distance);
  };
  let rounds = null;
  let policy = "meetings";
  // A quartet cannot meet four fresh people in a later round when the entire
  // pool has fewer than four matches (pigeonhole principle).
  const impossibleEncounters = sizes.includes(4) && sizes.length < 4;
  for (const rule of ["meetings", "roles", "relaxed"]) {
    if (rule === "meetings" && impossibleEncounters) continue;
    for (let distance = 0; distance < Math.max(1, groups.length); distance++) {
      // An isolated eight-player group cannot provide nine distinct encounters.
      if (rule === "meetings" && distance === 0 && groups.some((g) => g.players.length === 8)) continue;
      const candidates = candidatesAt(distance);
      rounds = searchUniqueRounds(players.length, candidates, sizes, rule);
      if (!rounds) continue;
      policy = rule;
      rounds = balanceUniqueRounds(rounds, candidates, rule);
      break;
    }
    if (rounds) break;
  }
  if (!rounds) throw new Error("No legal draw was found for this player list.");

  const out = groups.map((g, i) => ({
    group: g.groupNum, label: `Group ${g.groupNum}`, courts: [i * 2 + 1, i * 2 + 2],
    complete: g.players.length === 8, players: g.players, average: groupAverage(g.players),
    top4: g.players.slice(0, 4).map((p) => p.name), bottom4: g.players.slice(4).map((p) => p.name),
    games: [1, 2, 3].map((game) => ({ game, label: `Game ${game} · ${policy === "relaxed" ? "fallback draw" : "unique games"}`, matches: [] })),
  }));
  const flat = [];
  rounds.forEach((matches, gi) => {
    const used = new Set();
    const ordered = [...matches].sort((a, b) => Math.min(...a.ids) - Math.min(...b.ids));
    ordered.forEach((match, mi) => {
      match.ids.forEach((id) => {
        if (used.has(id)) throw new Error("A player has two slots in one game.");
        used.add(id);
      });
      const teams = match.teams.map((team) => team.map((id) => players[id]));
      const host = Math.floor(mi / 2);
      out[host].games[gi].matches.push({ teamA: teams[0], teamB: teams[1], net: mi + 1 });
      flat.push({ game: gi + 1, net: mi + 1, team1: teams[0].map((p) => p.name), team2: teams[1].map((p) => p.name) });
    });
    if (used.size !== sizes.reduce((sum, size) => sum + size, 0)) throw new Error("The draw is missing a player slot.");
  });
  const info = scheduleUniqueness({ groups: out.map((g) => ({ players: g.players.map((p) => p.name) })), matches: flat });
  if ((policy === "meetings" && info.meetings) || (policy === "roles" && (info.partners || info.opponents))) throw new Error("The draw failed its uniqueness check.");
  return { totalPlayers: players.length, poolGroups: -2, groups: out, uniqueInfo: info };
}
import { teamAvg } from "@/lib/teamRating";
import { bannedTogether } from "@/lib/neverPair";
import { juniorMatchAllowed } from "@/lib/juniorSafety";
import { juniorPreferenceCost } from "@/lib/juniorPreference";
import { shortFormatCost } from "@/lib/americanDoubles";

const pairIds = (ids, n) => ids.flatMap((a, i) => ids.slice(i + 1).map((b) => Math.min(a, b) * n + Math.max(a, b)));

// Enumerate actual legal matches, not penalties for illegal ones. The three
// splits of a quartet share its encounter constraints but have different ratings.
// `shortFormatOk` is the set of players nominated for American doubles and singles.
// A game of three or two players is one of those formats, so it carries the cost of
// anyone in it who was not nominated — priced well above any rating gap, so the draw
// picks nominated players for those games whenever the night can still be balanced.
export function uniqueCandidates(players, sizes, distance, shortFormatOk) {
  const n = players.length;
  const candidates = [];
  const splits = (ids) => {
    if (ids.length === 2) return [[[ids[0]], [ids[1]]]];
    if (ids.length === 3) return ids.map((id) => [[id], ids.filter((x) => x !== id)]);
    return [1, 2, 3].map((i) => [[ids[0], ids[i]], ids.slice(1).filter((_, j) => j + 1 !== i)]);
  };
  const add = (ids) => {
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      if (bannedTogether(players[ids[i]].name, players[ids[j]].name)) return;
    }
    const homes = ids.map((id) => players[id].home);
    const span = Math.max(...homes) - Math.min(...homes);
    // A short-format game is a volunteer's game: it may borrow players from another
    // group, because the nomination decides who stands alone (see roleShortGames).
    if (ids.length < 4 && span > 0 && !ids.some((id) => players[id].nominated)) return;
    const ratings = ids.map((id) => players[id].rating).filter((r) => r !== null && r !== undefined);
    const spread = ratings.length ? Math.max(...ratings) - Math.min(...ratings) : 0;
    const matches = [];
    for (const teams of splits(ids)) {
      if (!juniorMatchAllowed(...teams.map((team) => team.map((id) => players[id])))) continue;
      if (span && teams.some((team) => team.length === 2 && players[team[0]].bottom && players[team[1]].bottom && players[team[0]].home === players[team[1]].home)) continue;
      const playerTeams = teams.map((team) => team.map((id) => players[id]));
      const [a, b] = playerTeams.map(teamAvg);
      const gap = a !== null && b !== null ? Math.abs(a - b) : 0;
      const juniorCost = juniorPreferenceCost(...playerTeams) * 10;
      const formatCost = ids.length < 4 ? shortFormatCost(playerTeams, shortFormatOk) : 0;
      // The player standing alone: the draw keeps each of them to one such turn a night.
      const lone = ids.length === 3 ? (teams[0].length === 1 ? teams[0][0] : teams[1][0]) : -1;
      matches.push({ ids, teams, lone, span, meetings: pairIds(ids, n),
        partners: teams.flatMap((team) => pairIds(team, n)),
        opponents: teams[0].flatMap((x) => teams[1].map((y) => Math.min(x, y) * n + Math.max(x, y))),
        cost: gap * gap * 10 + spread * spread * 0.01 + span * 0.0001 + juniorCost + formatCost });
    }
    matches.sort((a, b) => a.cost - b.cost);
    matches.forEach((match, index) => candidates.push({ ...match, primary: index === 0 }));
  };
  for (const size of new Set(sizes)) {
    const choose = (ids, start) => {
      if (ids.length === size) { add(ids); return; }
      for (let id = start; id <= n - (size - ids.length); id++) {
        if (ids.length && players[id].home - players[ids[0]].home > distance) break;
        choose([...ids, id], id + 1);
      }
    };
    choose([], 0);
  }
  return candidates.sort((a, b) => a.cost - b.cost);
}
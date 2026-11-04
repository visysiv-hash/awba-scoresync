import { isJunior } from "@/lib/memberDob";
import { lookupName } from "@/lib/nameMatch";

export function juniorMatchAllowed(teamA, teamB, separate = false) {
  const players = [...teamA, ...teamB];
  const juniors = players.filter((p) => p.junior === true).length;
  if (separate && juniors && juniors !== players.length) return false;
  const alone = teamA.length === 1 && teamB.length === 2 ? teamA[0]
    : teamB.length === 1 && teamA.length === 2 ? teamB[0] : null;
  return !alone?.junior || players.every((p) => p.junior === true);
}

export function assertJuniorDraw(draw) {
  const separate = draw.groups.flatMap((g) => g.players).filter((p) => p.junior === true).length >= 2;
  for (const group of draw.groups) for (const game of group.games) for (const match of game.matches) {
    if (!juniorMatchAllowed(match.teamA, match.teamB, separate)) {
      throw new Error("The draw mixes juniors and adults. Re-pair before saving.");
    }
  }
  return draw;
}

export function unsafeJuniorMatches(record, dobs) {
  const names = [...new Set([
    ...(record.groups || []).flatMap((g) => g.players || []),
    ...(record.matches || []).flatMap((m) => [...m.team1, ...m.team2]),
  ])];
  const players = Object.fromEntries(names.map((name) => [name, {
    name, junior: isJunior(lookupName(dobs, name), new Date(`${record.date}T12:00:00`)),
  }]));
  const separate = Object.values(players).filter((p) => p.junior).length >= 2;
  return (record.matches || []).filter((m) => !juniorMatchAllowed(
    m.team1.map((name) => players[name]), m.team2.map((name) => players[name]), separate
  ));
}
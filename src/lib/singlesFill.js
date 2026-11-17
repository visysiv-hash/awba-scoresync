// A singles game is any match with one player on a side. Adding a member to that
// side makes it a pair, so the game is played as doubles — and only that game moves.
// It is only offered once the draw is published, when players are already looking.
const lone = (team) => (team || []).length === 1;

export const singlesMatches = (record) =>
  (record?.matches || []).filter((m) => lone(m.team1) || lone(m.team2));

export const sideLabels = (match) => [
  { side: "team1", label: (match.team1 || []).join(" & "), lone: lone(match.team1) },
  { side: "team2", label: (match.team2 || []).join(" & "), lone: lone(match.team2) },
];

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export function addPlayerToSingles(record, { net, game, side, player }) {
  const name = String(player || "").trim();
  if (!name) throw new Error("Choose a player from the member list.");

  const everyone = [
    ...(record?.groups || []).flatMap((g) => g.players || []),
    ...(record?.matches || []).flatMap((m) => [...(m.team1 || []), ...(m.team2 || [])]),
  ];
  if (everyone.some((n) => same(n, name))) throw new Error(`${name} is already on the schedule.`);

  const matches = record.matches || [];
  const target = matches.find((m) => Number(m.net) === Number(net) && Number(m.game) === Number(game));
  if (!target) throw new Error("That game is not on the schedule any more.");

  const team = target[side] || [];
  if (team.length !== 1) throw new Error("Only a player on their own can be given a partner.");

  return {
    ...record,
    matches: matches.map((m) => (m === target ? { ...m, [side]: [...team, name] } : m)),
  };
}
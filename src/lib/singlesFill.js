// A singles game is any match with one player on a side. Adding a member to that side
// makes it a pair, so the game is played as doubles — and only those games move.
// It is only offered once the draw is published, when players are already looking.
const lone = (team) => (team || []).length === 1;

export const singlesMatches = (record) =>
  (record?.matches || []).filter((m) => lone(m.team1) || lone(m.team2));

export const roundNumbers = (record) => [
  ...new Set((record?.matches || []).map((m) => Number(m.game)).filter((n) => Number.isFinite(n))),
].sort((a, b) => a - b);

// Every place a member could be given a partner: one option per player sitting on
// their own, named so the admin picks the partner and not just the court.
export const openPartners = (record) =>
  singlesMatches(record).flatMap((m) => [
    ...(lone(m.team1)
      ? [{ net: m.net, game: Number(m.game), side: "team1", partner: m.team1[0], against: m.team2 || [] }]
      : []),
    ...(lone(m.team2)
      ? [{ net: m.net, game: Number(m.game), side: "team2", partner: m.team2[0], against: m.team1 || [] }]
      : []),
  ]);

export const optionKey = (p) => `${p.net}|${p.game}|${p.side}`;

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// `picks` are the chosen places ({ net, game, side }) — one per game of the night.
export function addSinglesPlayer(record, { player, picks }) {
  const name = String(player || "").trim();
  if (!name) throw new Error("Choose a player from the member list.");

  const chosen = (picks || []).filter(Boolean);
  if (!chosen.length) throw new Error("Choose a partner for at least one game.");

  const everyone = [
    ...(record?.groups || []).flatMap((g) => g.players || []),
    ...(record?.matches || []).flatMap((m) => [...(m.team1 || []), ...(m.team2 || [])]),
  ];
  if (everyone.some((n) => same(n, name))) throw new Error(`${name} is already on the schedule.`);

  const seen = new Set();
  for (const p of chosen) {
    if (seen.has(Number(p.game))) {
      throw new Error(`${name} can only play one game in Game ${p.game} — pick a single partner for it.`);
    }
    seen.add(Number(p.game));
  }

  let matches = record.matches || [];
  for (const p of chosen) {
    const target = matches.find(
      (m) => Number(m.net) === Number(p.net) && Number(m.game) === Number(p.game)
    );
    if (!target) throw new Error("That game is not on the schedule any more.");
    const team = target[p.side] || [];
    if (team.length !== 1) throw new Error("Only a player on their own can be given a partner.");
    matches = matches.map((m) => (m === target ? { ...m, [p.side]: [...team, name] } : m));
  }

  return { ...record, matches };
}
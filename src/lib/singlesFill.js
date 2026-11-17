// A game is open when a side has only one player in it: adding someone there makes
// that side a pair, so the game is played as doubles — and only those games move.
// The one check is how much a player is already playing: nobody is added past three
// games for the night, so a player who is one game short can still be dropped in.
const lone = (team) => (team || []).length === 1;

export const MAX_GAMES = 3;

export const singlesMatches = (record) =>
  (record?.matches || []).filter((m) => lone(m.team1) || lone(m.team2));

export const roundNumbers = (record) => [
  ...new Set((record?.matches || []).map((m) => Number(m.game)).filter((n) => Number.isFinite(n))),
].sort((a, b) => a - b);

// Every place a player could be added: one option per player sitting on their own,
// named with the partner they would join and who they would face.
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
const onTeam = (match, name) =>
  [...(match.team1 || []), ...(match.team2 || [])].some((n) => same(n, name));

export const gamesPlayed = (record, name) =>
  name ? (record?.matches || []).filter((m) => onTeam(m, name)).length : 0;

// `picks` are the chosen places ({ net, game, side }) — one per game of the night.
export function addSinglesPlayer(record, { player, picks }) {
  const name = String(player || "").trim();
  if (!name) throw new Error("Choose a player from the member list.");

  const chosen = (picks || []).filter(Boolean);
  if (!chosen.length) throw new Error("Choose where they play at least one game.");

  const already = gamesPlayed(record, name);
  if (already >= MAX_GAMES) {
    throw new Error(`${name} is already playing ${already} games tonight — that's the maximum.`);
  }
  if (already + chosen.length > MAX_GAMES) {
    throw new Error(
      `${name} already has ${already} game${already === 1 ? "" : "s"} tonight and can only play ${MAX_GAMES}. Pick ${MAX_GAMES - already} game${MAX_GAMES - already === 1 ? "" : "s"}.`
    );
  }

  const seen = new Set();
  let matches = record.matches || [];
  for (const p of chosen) {
    const key = `${p.net}|${p.game}`;
    if (seen.has(key)) throw new Error("The same game was picked twice.");
    seen.add(key);
    const target = matches.find(
      (m) => Number(m.net) === Number(p.net) && Number(m.game) === Number(p.game)
    );
    if (!target) throw new Error("That game is not on the schedule any more.");
    if (onTeam(target, name)) throw new Error(`${name} is already in that game.`);
    const team = target[p.side] || [];
    if (team.length !== 1) throw new Error("Only a player on their own can be given a partner.");
    matches = matches.map((m) => (m === target ? { ...m, [p.side]: [...team, name] } : m));
  }

  return { ...record, matches };
}
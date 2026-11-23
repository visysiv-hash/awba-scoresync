// A game is open when both sides have only one player in it: adding someone there makes
// that side a pair, so the game is played as doubles — and only those games move. A game
// that already has a pair on one side is American doubles, not a singles waiting to be
// filled, so it is left alone.
const lone = (team) => (team || []).length === 1;

export const MAX_GAMES = 3;

export const singlesMatches = (record) =>
  (record?.matches || []).filter((m) => lone(m.team1) && lone(m.team2));

export const gameKey = (m) => `${m.net}|${m.game}`;

const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const onTeam = (match, name) =>
  [...(match.team1 || []), ...(match.team2 || [])].some((n) => same(n, name));

export const gamesPlayed = (record, name) =>
  name ? (record?.matches || []).filter((m) => onTeam(m, name)).length : 0;

// `additions` are the filled sides: { net, game, side, player }.
export function addPlayersToGames(record, additions) {
  const list = (additions || []).filter((a) => a && String(a.player || "").trim());
  if (!list.length) throw new Error("Pick a player for at least one side.");

  // Games each player would have on the night, counting the ones they already play.
  const counts = new Map();
  for (const a of list) {
    const name = String(a.player).trim();
    const key = name.toLowerCase();
    const before = counts.has(key) ? counts.get(key) : gamesPlayed(record, name);
    if (before >= MAX_GAMES) {
      throw new Error(`${name} is already playing ${before} games tonight — that's the maximum.`);
    }
    counts.set(key, before + 1);
  }

  let matches = record.matches || [];
  for (const a of list) {
    const name = String(a.player).trim();
    const target = matches.find(
      (m) => Number(m.net) === Number(a.net) && Number(m.game) === Number(a.game)
    );
    if (!target) throw new Error("That game is not on the schedule any more.");
    if (onTeam(target, name)) throw new Error(`${name} is already in that game.`);
    const team = target[a.side] || [];
    if (team.length !== 1) throw new Error(`Net ${a.net} Game ${a.game} already has two players there.`);
    matches = matches.map((m) => (m === target ? { ...m, [a.side]: [...team, name] } : m));
  }

  return { ...record, matches };
}
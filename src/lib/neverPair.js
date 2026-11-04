// Two players who must never share a match — not as partners and not as opponents.
// Matched on name, ignoring case and surrounding spaces.
const NEVER_TOGETHER = [["visy", "navindra"]];

const low = (value) => String(value || "").trim().toLowerCase();

const partnerOf = (name) => {
  const n = low(name);
  for (const [a, b] of NEVER_TOGETHER) {
    if (n === a) return b;
    if (n === b) return a;
  }
  return null;
};

const namesOf = (match) => [...(match.teamA || []), ...(match.teamB || [])].map((p) => low(p.name));

// If a banned pair lands in the same match, trade one of them with a player from
// another match of the same round (same group first). Adjusts the draw in place.
export function keepApartDraw(draw) {
  const entries = [];
  for (const group of draw.groups || []) {
    for (const game of group.games || []) {
      for (const match of game.matches || []) {
        match.teamA = [...(match.teamA || [])];
        match.teamB = [...(match.teamB || [])];
        entries.push({ match, game: Number(game.game), group });
      }
    }
  }

  for (const { match, game, group } of entries) {
    const names = namesOf(match);
    const clash = names.find((n) => partnerOf(n) && names.includes(partnerOf(n)));
    if (!clash) continue;

    const mover = partnerOf(clash);
    const team = (match.teamA || []).some((p) => low(p.name) === mover) ? "teamA" : "teamB";
    const slot = (match[team] || []).findIndex((p) => low(p.name) === mover);
    if (slot < 0) continue;

    const safe = (other) =>
      !namesOf(other).some((n) => {
        const p = partnerOf(n);
        return n === mover || n === clash || p === mover || p === clash;
      });

    const hosts = entries.filter((e) => e.game === game && e.match !== match && safe(e.match));
    const host = hosts.find((e) => e.group === group) || hosts[0];
    if (!host) continue;

    const other = host.match;
    const hostTeam = (other.teamA || []).length >= (other.teamB || []).length ? "teamA" : "teamB";
    if (!other[hostTeam]?.length) continue;

    const outgoing = other[hostTeam][0];
    other[hostTeam][0] = match[team][slot];
    match[team][slot] = outgoing;
  }

  return draw;
}
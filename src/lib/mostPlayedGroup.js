// The group each player has actually spent most of their rounds in. The draw moves
// players between groups week to week, so someone can end up playing most of the
// season somewhere other than the group they were originally placed in.
//
// Playing a group is not the same as belonging in it: someone who wins that group by
// a wide margin every week is too strong for it, so their suggested starting group is
// one band higher (lower number) instead of the group they played.
export const SETTLED_SHARE = 0.75; // rounds in that group, as a share of all their rounds
export const DOMINANT_MARGIN = 8; // average points a game in that group (a game is to 21)
export const DOMINANT_GAMES = 6; // enough games there for the margin to mean something

export function mostPlayedGroup(players) {
  const rows = [];
  for (const p of players || []) {
    const counts = {};
    for (const r of p.rounds || []) {
      const group = Number(r.group);
      if (!group) continue;
      const g = (counts[group] = counts[group] || { rounds: 0, games: 0, diff: 0 });
      g.rounds++;
      g.games += Number(r.gp) || 0;
      g.diff += Number(r.diff) || 0;
    }
    const played = Object.keys(counts).map(Number);
    if (!played.length) continue;
    const top = played.reduce((a, b) => (counts[b].rounds > counts[a].rounds ? b : a));
    const here = counts[top];
    const placed = p.baseGroup == null ? null : Number(p.baseGroup);
    const rounds = (p.rounds || []).length;
    const margin = here.games ? here.diff / here.games : 0;
    const dominant = here.games >= DOMINANT_GAMES && margin >= DOMINANT_MARGIN;
    // G1 is elite and G6 is beginner, so "higher" is a lower number. Someone beating
    // their group up is never seeded into that group or lower: they start one band
    // stronger than the stronger of where they played and where they are placed.
    const anchor = Math.min(placed ?? top, top);
    rows.push({
      player: p.player,
      placed,
      top,
      plays: here.rounds,
      rounds,
      // How much of their badminton was played in that group: 1 means every round.
      share: rounds ? here.rounds / rounds : 0,
      games: here.games,
      // Points a game in that group: positive is winning, higher is wider.
      margin: parseFloat(margin.toFixed(1)),
      // Beating the group comfortably — start them a band higher instead.
      dominant,
      to: dominant ? Math.max(1, anchor - 1) : top,
      rating: p.rating == null ? null : parseFloat(Number(p.rating).toFixed(2)),
      gp: Number(p.gp) || 0,
      shift: placed == null ? null : top - placed,
    });
  }
  // Only the players whose most-played group differs from where they are placed.
  return rows
    .filter((row) => row.placed !== row.top)
    .sort(
      (a, b) =>
        Math.abs(b.shift ?? 0) - Math.abs(a.shift ?? 0) ||
        b.plays - a.plays ||
        String(a.player).localeCompare(String(b.player))
    );
}
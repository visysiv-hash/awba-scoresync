// The group each player has actually spent most of their rounds in. The draw moves
// players between groups week to week, so someone can end up playing most of the
// season somewhere other than the group they were originally placed in.
export function mostPlayedGroup(players) {
  const rows = [];
  for (const p of players || []) {
    const counts = {};
    for (const r of p.rounds || []) {
      const group = Number(r.group);
      if (group) counts[group] = (counts[group] || 0) + 1;
    }
    const played = Object.keys(counts).map(Number);
    if (!played.length) continue;
    const top = played.reduce((a, b) => (counts[b] > counts[a] ? b : a));
    const placed = p.baseGroup == null ? null : Number(p.baseGroup);
    const rounds = (p.rounds || []).length;
    rows.push({
      player: p.player,
      placed,
      top,
      plays: counts[top],
      rounds,
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
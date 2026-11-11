// Where a player's results say they belong, rather than where they have happened to
// play most of their rounds.
//
// "Margin" is the points a game a player holds in a group: positive means they are
// outscoring that group, negative means the group is outscoring them. A player is at
// their level in a group where that margin sits around zero, so:
//   - an even group they have played enough of is their group (if they are even in
//     several, the one nearest where they are placed wins, so noise never moves
//     somebody who is already fine);
//   - win one group and lose the next and their level is between the two, read off
//     the gap between them;
//   - win every group they played and they sit above the best of them (only worth a
//     move when that is stronger than where they are placed);
//   - lose every group they played and they sit below the weakest.
// G1 is elite and G6 is beginner, so "stronger" is a lower number.
export const MIN_GAMES = 9; // three rounds in a group before its margin means anything
export const EVEN_MARGIN = 3; // points a game either way still counts as holding your own

export const clampGroup = (n) => Math.min(6, Math.max(1, n));

// The level a set of per-group margins points at, plus which way it was read — the
// explanation panel and the suggestion list both come from this one place.
export function levelFromGroups(groups, placed) {
  if (!groups || !groups.length) return null;

  const even = groups.filter((c) => Math.abs(c.margin) < EVEN_MARGIN);
  if (even.length) {
    const at = [...even].sort(
      (a, b) =>
        Math.abs(a.group - (placed ?? a.group)) - Math.abs(b.group - (placed ?? b.group)) ||
        a.group - b.group
    )[0];
    return { level: at.group, kind: "even", at };
  }

  if (groups.every((c) => c.margin > 0)) {
    return { level: groups[0].group - 1, kind: "above", at: groups[0] };
  }

  if (groups.every((c) => c.margin < 0)) {
    const weakest = groups[groups.length - 1];
    return { level: weakest.group + 1, kind: "below", at: weakest };
  }

  const i = groups.findIndex(
    (c, idx) => idx < groups.length - 1 && c.margin < 0 && groups[idx + 1].margin > 0
  );
  if (i < 0) return null;
  const weak = groups[i];
  const strong = groups[i + 1];
  return {
    level: weak.group + Math.abs(weak.margin) / (Math.abs(weak.margin) + strong.margin),
    kind: "between",
    at: { weak, strong },
  };
}

export function groupFit(players) {
  const rows = [];

  for (const p of players || []) {
    // Points a game in each group they played.
    const perGroup = {};
    for (const r of p.rounds || []) {
      const group = Number(r.group);
      if (!group) continue;
      const c = (perGroup[group] = perGroup[group] || { games: 0, diff: 0 });
      c.games += Number(r.gp) || 0;
      c.diff += Number(r.diff) || 0;
    }

    const groups = Object.keys(perGroup)
      .map((g) => ({
        group: Number(g),
        games: perGroup[g].games,
        margin: parseFloat((perGroup[g].diff / Math.max(1, perGroup[g].games)).toFixed(1)),
      }))
      .filter((c) => c.games >= MIN_GAMES)
      .sort((a, b) => a.group - b.group);
    if (!groups.length) continue;

    const placed = p.baseGroup == null ? null : Number(p.baseGroup);
    const decided = levelFromGroups(groups, placed);
    if (!decided) continue;

    const { level, kind } = decided;
    // Playing above (or below) the group you are placed in only reads as a move when
    // it actually is one — otherwise the seed already accounts for it.
    if (kind === "above" && placed != null && level >= placed) continue;
    if (kind === "below" && placed != null && level <= placed) continue;

    const to = clampGroup(Math.round(level));
    if (placed === to) continue;

    rows.push({
      player: p.player,
      placed,
      to,
      up: placed == null ? null : to < placed,
      level: parseFloat(level.toFixed(2)),
      groups,
      rating: p.rating == null ? null : parseFloat(Number(p.rating).toFixed(2)),
      gp: Number(p.gp) || 0,
    });
  }

  // The furthest from where they play first — those are the seeds costing the most.
  return rows.sort(
    (a, b) =>
      Math.abs((b.placed ?? b.to) - b.to) - Math.abs((a.placed ?? a.to) - a.to) || b.gp - a.gp
  );
}
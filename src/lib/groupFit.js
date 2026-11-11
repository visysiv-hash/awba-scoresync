// Where a player belongs, read from where they actually play.
//
// Every group a player has turned out in gets a margin: the points a game they hold
// there (positive = outscoring the group, negative = the group is outscoring them).
// The group holding most of their games is their main group, and its margin is what
// places them:
//   - inside ±3 a game they hold their own there, so that is their level;
//   - winning it by more than 3 they are too strong for it, so their level is one
//     group up;
//   - beaten in it by more than 3 they are over their head, so their level is one
//     group down.
// A move up is held back when they have also played the group above and been beaten
// there — that is the "step up is not there yet" case. Outplaying a group that is
// already weaker than their placement is never a reason to demote them.
// G1 is elite and G6 is beginner, so "stronger" is a lower number.
export const MIN_GAMES = 9; // three rounds in a group before it counts at all
export const EVEN_MARGIN = 3; // points a game either way still counts as holding your own

export const clampGroup = (n) => Math.min(6, Math.max(1, n));

// The read on one set of counted groups: which group is theirs, and why.
export function readLevel(groups, placed) {
  if (!groups || !groups.length) return null;

  // Their main group: the one holding the most games. Ties go to the group nearest
  // where they are placed, so a coin-flip never moves anybody.
  const anchor = [...groups].sort(
    (a, b) =>
      b.games - a.games ||
      Math.abs(a.group - (placed ?? a.group)) - Math.abs(b.group - (placed ?? b.group)) ||
      a.group - b.group
  )[0];

  let level = anchor.group;
  let kind = "holds";
  let stepUp = null;

  if (anchor.margin > EVEN_MARGIN) {
    level = anchor.group - 1;
    kind = "outperforming";
  } else if (anchor.margin < -EVEN_MARGIN) {
    level = anchor.group + 1;
    kind = "beaten";
  }

  // A step up only stands if they have not already been beaten in the group above
  // over a sample worth reading (a third of their main group).
  if (level < anchor.group) {
    const above = groups.find(
      (c) => c.group === level && c.games >= Math.max(MIN_GAMES, Math.round(anchor.games / 3))
    );
    if (above && above.margin < -EVEN_MARGIN) {
      level = anchor.group;
      kind = "holds";
      stepUp = above;
    }
  }

  return { anchor, level, kind, stepUp };
}

export function groupFit(players) {
  const rows = [];

  for (const p of players || []) {
    // Points a game in each group they have played.
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

    const placed = p.baseGroup == null ? null : Number(p.baseGroup);
    const read = readLevel(groups, placed);
    if (!read) continue;

    const to = clampGroup(Math.round(read.level));
    if (placed === to) continue;
    // Winning a group they were never placed in, which is already weaker than where
    // they are, says nothing bad about their placement.
    if (read.kind === "outperforming" && placed != null && to > placed) continue;

    rows.push({
      player: p.player,
      placed,
      to,
      up: placed == null ? null : to < placed,
      kind: read.kind,
      anchorGroup: read.anchor.group,
      anchorGames: read.anchor.games,
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
// The full story behind one player's group: every group they have played, how they
// went in each, which group their results point at, and what would move them.
import { EVEN_MARGIN, MIN_GAMES, clampGroup, levelFromGroups } from "@/lib/groupFit";

const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

export function explainPlacement(player, baseGroup = null) {
  const gp = Number(player?.gp) || 0;
  const placed =
    baseGroup != null
      ? Number(baseGroup)
      : player?.baseGroup != null
      ? Number(player.baseGroup)
      : player?.currentGroup != null
      ? Number(player.currentGroup)
      : null;

  // One row per group: games, points a game, and their best and worst round in it.
  const byGroup = {};
  for (const r of player?.rounds || []) {
    const group = Number(r.group);
    if (!group) continue;
    const c = (byGroup[group] = byGroup[group] || {
      group,
      games: 0,
      diff: 0,
      rounds: 0,
      best: null,
      worst: null,
    });
    const d = Number(r.diff) || 0;
    c.games += Number(r.gp) || 0;
    c.diff += d;
    c.rounds += 1;
    c.best = c.best == null ? d : Math.max(c.best, d);
    c.worst = c.worst == null ? d : Math.min(c.worst, d);
  }

  const groups = Object.values(byGroup)
    .map((c) => ({
      ...c,
      margin: parseFloat((c.diff / Math.max(1, c.games)).toFixed(1)),
      share: gp ? Math.round((c.games / gp) * 100) : 0,
      counted: c.games >= MIN_GAMES,
    }))
    .sort((a, b) => a.group - b.group);

  const mostPlayed = [...groups].sort((a, b) => b.games - a.games || a.group - b.group)[0] || null;
  const decided = levelFromGroups(groups.filter((g) => g.counted), placed);
  const level = decided ? parseFloat(decided.level.toFixed(2)) : null;
  const to = decided ? clampGroup(Math.round(decided.level)) : placed;

  const reasons = [];
  if (!groups.length) {
    reasons.push("No games recorded yet, so there is nothing to measure them against.");
    if (placed != null) reasons.push(`Until they play, G${placed} is where their rating starts.`);
  } else {
    reasons.push(
      `Played ${gp} game${gp === 1 ? "" : "s"} across ${
        groups.length === 1 ? "one group" : `${groups.length} groups`
      }: ${groups.map((g) => `G${g.group} ${g.games}`).join(", ")}.`
    );

    if (mostPlayed && groups.length > 1) {
      reasons.push(
        `Most of it in G${mostPlayed.group} — ${mostPlayed.games} of ${gp} games (${mostPlayed.share}%), averaging ${signed(
          mostPlayed.margin
        )} points a game there.`
      );
    }

    if (decided?.kind === "even") {
      reasons.push(
        `Their G${decided.at.group} margin of ${signed(decided.at.margin)} points a game is inside the ±${EVEN_MARGIN} band over ${
          decided.at.games
        } games — that is the level they hold.`
      );
      const others = groups.filter(
        (g) => g.counted && g.group !== decided.at.group && Math.abs(g.margin) < EVEN_MARGIN
      );
      if (others.length) {
        reasons.push(
          `They are also even in ${others.map((g) => `G${g.group}`).join(", ")}, so the group nearest where they are placed wins.`
        );
      }
    } else if (decided?.kind === "between") {
      reasons.push(
        `They outscore G${decided.at.weak.group} by ${Math.abs(decided.at.weak.margin)} points a game but are beaten by ${signed(
          decided.at.strong.margin
        )} in G${decided.at.strong.group} — their true level is the crossover between the two, about ${level}.`
      );
    } else if (decided?.kind === "above") {
      reasons.push(
        `They outscore every group they have played, the strongest being G${decided.at.group} at ${signed(
          decided.at.margin
        )} points a game — their level sits above it.`
      );
    } else if (decided?.kind === "below") {
      reasons.push(
        `They are beaten in every group they have played, the weakest being G${decided.at.group} at ${signed(
          decided.at.margin
        )} points a game — their level sits below it.`
      );
    } else {
      reasons.push(
        `No group has reached ${MIN_GAMES} games yet, so their results cannot place them.`
      );
    }

    const short = groups.filter((g) => !g.counted);
    if (short.length) {
      reasons.push(
        `Not counted yet: ${short
          .map((g) => `G${g.group} (${g.games} of ${MIN_GAMES} games)`)
          .join(", ")} — too small a sample to read.`
      );
    }

    if (placed == null) {
      reasons.push("No starting group is set, so their rating starts from the first group they played in.");
    } else if (decided && to === placed) {
      reasons.push(`Placed in G${placed}, which is exactly where their results point — no change needed.`);
    } else if (decided) {
      reasons.push(
        `Placed in G${placed}, but their results point to G${to} — a move ${to < placed ? "up" : "down"}.`
      );
    }
  }

  // What would move them, in the same terms the list uses.
  const moves = [];
  if (placed != null && placed > 1) {
    moves.push(
      `Up to G${placed - 1}: ${MIN_GAMES}+ games there while staying within ${EVEN_MARGIN} points a game or better, and their G${placed} margin no longer above +${EVEN_MARGIN}.`
    );
  }
  if (placed != null && placed < 6) {
    moves.push(
      `Down to G${placed + 1}: ${MIN_GAMES}+ games there staying within ${EVEN_MARGIN} points a game, and their G${placed} margin worse than −${EVEN_MARGIN}.`
    );
  }
  moves.push(
    `Every round re-runs this from their own games — ${MIN_GAMES} games in a group before its margin counts at all.`
  );

  return {
    name: player?.player || "",
    rating: player?.rating == null ? null : parseFloat(Number(player.rating).toFixed(2)),
    gp,
    placed,
    level,
    to,
    kind: decided?.kind || null,
    groups,
    mostPlayed,
    reasons,
    moves,
  };
}
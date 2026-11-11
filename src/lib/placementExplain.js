// The full story behind one player's group: every group they have played, how they
// went in each, which group their results point at, and what would move them.
import { EVEN_MARGIN, MIN_GAMES, clampGroup, readLevel } from "@/lib/groupFit";

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
  const read = readLevel(groups.filter((g) => g.counted), placed);
  const anchor = read?.anchor || null;
  const level = read ? parseFloat(read.level.toFixed(1)) : null;
  const to = read ? clampGroup(Math.round(read.level)) : placed;

  const reasons = [];
  // Anything that points at a different group is a suggestion, kept apart from the
  // plain explanation so only admins are shown it.
  const suggestions = [];
  if (!groups.length) {
    reasons.push("No games recorded yet, so there is nothing to measure them against.");
    if (placed != null) reasons.push(`Until they play, G${placed} is where their rating starts.`);
  } else {
    reasons.push(
      `Played ${gp} game${gp === 1 ? "" : "s"} across ${
        groups.length === 1 ? "one group" : `${groups.length} groups`
      }: ${groups.map((g) => `G${g.group} ${g.games}`).join(", ")}.`
    );

    if (read) {
      reasons.push(
        `Their main group is G${anchor.group} — ${anchor.games} of ${gp} games (${Math.round(
          (anchor.games / Math.max(1, gp)) * 100
        )}%), averaging ${signed(anchor.margin)} points a game there.`
      );

      if (read.kind === "outperforming") {
        reasons.push(
          `Outscoring G${anchor.group} by ${anchor.margin} points a game means they are too strong for it, so their level is one group up.`
        );
      } else if (read.kind === "beaten") {
        reasons.push(
          `Beaten in G${anchor.group} by ${Math.abs(anchor.margin)} points a game means they are over their head there, so their level is one group down.`
        );
      } else if (read.stepUp) {
        reasons.push(
          `They win G${anchor.group} by ${anchor.margin} points a game, but they are beaten by ${Math.abs(
            read.stepUp.margin
          )} in G${read.stepUp.group} over ${read.stepUp.games} games — the step up is not there yet.`
        );
      } else {
        reasons.push(
          `A margin of ${signed(
            anchor.margin
          )} points a game sits inside the ±${EVEN_MARGIN} band, so G${anchor.group} is the level they hold.`
        );
      }

      const others = groups.filter((g) => g.counted && g.group !== anchor.group);
      if (others.length) {
        reasons.push(
          `Elsewhere: ${others
            .map((g) => `G${g.group} ${signed(g.margin)} a game over ${g.games}`)
            .join(", ")} — real results, but smaller samples than their main group, so they carry less weight.`
        );
      }

      if (placed == null) {
        reasons.push("No starting group is set, so their rating starts from the first group they played in.");
      } else if (to === placed) {
        reasons.push(`Placed in G${placed}, which is exactly where their results point — no change needed.`);
      } else {
        suggestions.push(
          `Placed in G${placed}, but their results point to G${to} — a move ${to < placed ? "up" : "down"}.`
        );
      }
    } else {
      reasons.push(`No group has reached ${MIN_GAMES} games yet, so their results cannot place them.`);
    }

    const short = groups.filter((g) => !g.counted);
    if (short.length) {
      reasons.push(
        `Not counted yet: ${short
          .map((g) => `G${g.group} (${g.games} of ${MIN_GAMES} games)`)
          .join(", ")} — too small a sample to read.`
      );
    }
  }

  // What would move them, in the same terms the list uses.
  const moves = [];
  const base = anchor?.group ?? placed ?? null;
  if (base != null) {
    if (base > 1) {
      moves.push(
        `Up to G${base - 1}: keep winning G${base} by more than ${EVEN_MARGIN} points a game, and avoid being beaten by more than ${EVEN_MARGIN} in G${
          base - 1
        } when they get games there.`
      );
    }
    if (base < 6) {
      moves.push(
        `Down to G${base + 1}: be beaten by more than ${EVEN_MARGIN} points a game in G${base} — that is the only thing that moves a player down.`
      );
    }
  }
  moves.push(
    `Where they play most decides it, so ${MIN_GAMES} games in a group before it can become their main group, and every round re-runs this from their own games.`
  );

  return {
    name: player?.player || "",
    rating: player?.rating == null ? null : parseFloat(Number(player.rating).toFixed(2)),
    gp,
    placed,
    level,
    to,
    kind: read?.kind || null,
    anchorGroup: anchor?.group ?? null,
    groups,
    mostPlayed,
    reasons,
    suggestions,
    moves,
  };
}
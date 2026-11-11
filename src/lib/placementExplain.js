// The full story behind one player's group: every group they have played, how they
// went in each, which group their results point at, and what would move them.
// The wording is deliberately plain — the tables above carry the numbers, so the
// sentences only need to say what those numbers mean.
import { MIN_GAMES, clampGroup, readLevel } from "@/lib/groupFit";

const listGroups = (list) =>
  list.map((g) => `group ${g.group}`).reduce((text, name, i) => {
    if (i === 0) return name;
    return i === list.length - 1 ? `${text} and ${name}` : `${text}, ${name}`;
  }, "");

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

  // Their games cut by opponent and by partner: the two ways a margin can flatter
  // a player who is not actually holding the group themselves.
  const sp = player?.splits || null;
  const ownSplit = sp?.ownGroup || null;
  const otherSplit = sp?.otherGroups || null;
  const strongSplit = sp?.strongPartner || null;
  const weakSplit = sp?.weakPartner || null;

  const reasons = [];
  // Anything that points at a different group is a suggestion, kept apart from the
  // plain explanation so only admins are shown it.
  const suggestions = [];
  if (!groups.length) {
    reasons.push("They haven't played a game yet, so there is nothing to judge them on.");
    if (placed != null) reasons.push(`Until they do, group ${placed} is where their rating starts.`);
  } else {
    if (anchor) {
      reasons.push(`Most of their games have been in group ${anchor.group}.`);
    } else {
      reasons.push("They've been spread across several groups, with not enough games in any one of them to call it home.");
    }

    if (read) {
      if (read.kind === "outperforming") {
        reasons.push("They win there more often than they lose, which is the sign of someone ready for a harder group.");
      } else if (read.kind === "beaten") {
        reasons.push(
          "They lose there more often than they win, which means they are playing above their level — a group lower suits them better."
        );
      } else if (read.stepUp) {
        reasons.push(
          `They win in group ${anchor.group}, but when they were given games in the group above they were well beaten, so the step up isn't there yet.`
        );
      } else {
        reasons.push(
          `They come out about level there — winning as much as they lose — so group ${anchor.group} is the right fit.`
        );
      }

      const others = groups.filter((g) => g.counted && g.group !== anchor.group);
      if (others.length) {
        reasons.push(
          `They have also played ${listGroups(others)}, but on far fewer games, so those results count for less.`
        );
      }

      if (placed == null) {
        reasons.push("No starting group is set, so their rating begins wherever they first played.");
      } else if (to === placed) {
        reasons.push(`They are placed in group ${placed}, which is exactly where their games point — nothing needs changing.`);
      } else {
        suggestions.push(
          `They are placed in group ${placed}, but their games point at group ${to} — worth a move ${
            to < placed ? "up" : "down"
          }.`
        );
      }
    } else {
      reasons.push("No group has enough games behind it yet to place them, so for now their rating is mostly their starting group.");
    }

    const short = groups.filter((g) => !g.counted);
    if (short.length) {
      reasons.push(`Only a handful of games so far in ${listGroups(short)} — too few to judge.`);
    }

    // The same games from the other side: who they played against, and who stood
    // beside them. A margin built away from their own group, or alongside a
    // stronger partner, says less about where they belong.
    if (ownSplit && otherSplit && ownSplit.games >= 6 && otherSplit.games >= 6) {
      if (otherSplit.margin - ownSplit.margin >= 3) {
        reasons.push(
          "Their better results come against other groups, so the record inside their own group is the honest one."
        );
      } else {
        reasons.push(
          "Inside their own group and against other groups they measure up about the same, so the results are their own doing."
        );
      }
    }
    if (strongSplit && weakSplit && strongSplit.games >= 6 && weakSplit.games >= 6) {
      if (strongSplit.margin - weakSplit.margin >= 4) {
        reasons.push("They do noticeably better beside a stronger partner, so part of that margin may not be theirs.");
      } else {
        reasons.push("They do about as well with a stronger partner as a weaker one, so they aren't leaning on anyone.");
      }
    }
  }

  // The two patterns that make a margin look better than the player is: leaning on
  // a stronger partner, or doing the damage away from their own group.
  if (strongSplit && weakSplit && strongSplit.games >= 6 && weakSplit.games >= 6) {
    const gap = strongSplit.margin - weakSplit.margin;
    if (gap >= 4) {
      suggestions.push(
        `Leans on a stronger partner — about ${Math.round(gap)} points a game better beside one than beside a weaker partner.`
      );
    }
  }
  if (ownSplit && otherSplit && ownSplit.games >= 9 && otherSplit.games >= 6) {
    const gap = otherSplit.margin - ownSplit.margin;
    if (gap >= 3) {
      suggestions.push(
        "Their games outside their own group flatter them, so trust the same-group record over the overall figure."
      );
    }
  }

  // What would move them, in the same terms the list uses.
  const moves = [];
  const base = anchor?.group ?? placed ?? null;
  if (base != null) {
    if (base > 1) {
      moves.push(`To go up, they need to keep winning in group ${base}, and hold their own when they get games above it.`);
    }
    if (base < 6) {
      moves.push(`To go down, they have to be beaten clearly in group ${base} — losing narrowly won't do it.`);
    }
  }
  moves.push(
    "Whichever group holds most of their games decides it, so a group needs a decent run of games before it becomes their main one."
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
    splits: sp,
    mostPlayed,
    reasons,
    suggestions,
    moves,
  };
}
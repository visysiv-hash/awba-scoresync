// App-only rating calculation, mirroring base44/shared/playerRatings.ts so the
// app can reproduce the spreadsheet method using only app-stored data.
//
// Inputs:
//   results     - MatchResult records: round, team1_players, team2_players, score1, score2, net
//   roundGroups - "player|round" (lowercase) -> group that player was in that round
//   upToRound   - optional: compute the rolling rating as it stood after this round

const PENALTY = 21;

const divisorFor = (base: number) => {
  const map: Record<number, number> = { 1: 40, 2: 35, 3: 30, 4: 25, 5: 20 };
  return map[Math.round(base) || 1] ?? 15;
};

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

export function computeAppRatings(
  results: any[],
  roundGroups: Record<string, number>,
  upToRound?: number | null,
  startGroups: Record<string, number> = {}
) {
  const rows = (results || [])
    .filter((r) => (upToRound == null ? true : Number(r.round) <= Number(upToRound)))
    .sort((a, b) => Number(a.round) - Number(b.round));

  const perPlayer: Record<string, { player: string; matches: any[] }> = {};

  const groupOf = (name: string, round: number, fallbackNet?: number | null) => {
    const key = `${String(name || "").trim().toLowerCase()}|${round}`;
    const found = roundGroups[key];
    if (found) return Number(found);
    // Rounds not yet in the group sheet (e.g. tonight) fall back to the net played on.
    return fallbackNet ? Number(fallbackNet) : null;
  };

  for (const r of rows) {
    const round = Number(r.round);
    const t1 = (Array.isArray(r.team1_players) ? r.team1_players : []).map((n: string) => String(n).trim()).filter(Boolean);
    const t2 = (Array.isArray(r.team2_players) ? r.team2_players : []).map((n: string) => String(n).trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;

    const s1 = Number(r.score1) || 0;
    const s2 = Number(r.score2) || 0;
    const fallbackNet = Number(r.net) || null;

    const groups = (names: string[]) => names.map((n) => groupOf(n, round, fallbackNet)).filter((g) => g != null) as number[];
    const t1Avg = avg(groups(t1));
    const t2Avg = avg(groups(t2));

    const diff1 = s1 - s2 - (s1 === 0 ? PENALTY : 0);
    const diff2 = s2 - s1 - (s2 === 0 ? PENALTY : 0);

    const sides = [
      { team: t1, opponents: t2, diff: diff1, teamAvg: t1Avg, oppAvg: t2Avg },
      { team: t2, opponents: t1, diff: diff2, teamAvg: t2Avg, oppAvg: t1Avg },
    ];

    for (const side of sides) {
      for (const name of side.team) {
        let ownGroup = groupOf(name, round, fallbackNet);
        if (!ownGroup) {
          const known = [t1, t2]
            .flat()
            .filter((n) => n !== name)
            .map((n) => roundGroups[`${String(n).trim().toLowerCase()}|${round}`])
            .filter(Boolean) as number[];
          ownGroup = known.length ? Math.round(avg(known) as number) : null;
        }
        if (!ownGroup) continue;

        const base = side.teamAvg ?? ownGroup;
        let adjustedDiff = side.diff;
        if (side.oppAvg != null && side.teamAvg != null) {
          const groupDiff = side.oppAvg - side.teamAvg;
          if (Math.abs(groupDiff) > 0.5) adjustedDiff = side.diff - groupDiff * 2;
        }

        const key = String(name).toLowerCase();
        if (!perPlayer[key]) perPlayer[key] = { player: String(name).trim(), matches: [] };
        perPlayer[key].matches.push({
          round,
          group: ownGroup,
          base,
          diff: side.diff,
          adjustedDiff,
        });
      }
    }
  }

  const players = Object.values(perPlayer).map((entry) => {
    const matches = entry.matches.sort((a, b) => a.round - b.round);

    const byRound: Record<number, any> = {};
    for (const m of matches) {
      if (!byRound[m.round]) {
        byRound[m.round] = { round: m.round, group: m.group, matchCount: 0, totalDiff: 0, totalAdjustedDiff: 0, baseSum: 0 };
      }
      const r = byRound[m.round];
      r.matchCount++;
      r.totalDiff += m.diff;
      r.totalAdjustedDiff += m.adjustedDiff;
      r.baseSum += m.base;
    }

    const roundsSorted = Object.values(byRound).sort((a: any, b: any) => a.round - b.round);
    // The spreadsheet starts each player from their override group (Players tab),
    // falling back to the group they were in for their first round.
    let rolling = startGroups[entry.player.trim().toLowerCase()] ?? roundsSorted[0].group;
    const detail: any[] = [];

    for (const r of roundsSorted as any[]) {
      const base = parseFloat((r.baseSum / r.matchCount).toFixed(2));
      const divisor = divisorFor(rolling);
      // Carry 3dp forward like the spreadsheet does, and only round for display.
      const sessionRating = parseFloat((rolling - r.totalAdjustedDiff / (r.matchCount * 2) / divisor).toFixed(3));
      detail.push({
        round: r.round,
        group: r.group,
        base: parseFloat(rolling.toFixed(2)),
        blendedBase: base,
        gp: r.matchCount,
        diff: r.totalDiff,
        adjustedDiff: r.totalAdjustedDiff,
        divisor,
        sessionRating,
      });
      rolling = sessionRating;
    }

    const totalDiff = matches.reduce((s, m) => s + m.diff, 0);

    return {
      player: entry.player,
      rating: parseFloat(rolling.toFixed(2)),
      currentGroup: roundsSorted[roundsSorted.length - 1].group,
      gp: matches.length,
      diff: totalDiff,
      firstRound: roundsSorted[0].round,
      lastRound: roundsSorted[roundsSorted.length - 1].round,
      rounds: detail,
    };
  });

  // Filler names used to pad a group up to eight are not players: their matches
  // still count for everyone else, but they get no rating row of their own.
  const PLACEHOLDERS = ["na", "n/a", "n.a.", "-", "tbc", "tba", "vacant", "blank"];

  const rated = players.filter(
    (p) => !PLACEHOLDERS.includes(String(p.player || "").trim().toLowerCase())
  );

  rated.sort((a, b) => a.rating - b.rating);
  return { players: rated };
}
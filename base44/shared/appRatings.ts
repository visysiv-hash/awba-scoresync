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

const teamsKey = (r: any) =>
  [r.team1_players, r.team2_players]
    .map((t: string[]) => (Array.isArray(t) ? t : []).map((n: string) => String(n).trim().toLowerCase()).sort().join("+"))
    .sort()
    .join("|");

// The same game can land in the database twice: once as the app's own submission
// and again when the sheet is imported. Count it once - the sheet row wins, since
// that is the verified copy. Identical repeats on the same net and match number
// are double entries too.
const dedupe = (rows: any[]) => {
  const fromSheet = new Set(rows.filter((r) => r.source === "sheet").map((r) => `${r.date || ""}|${teamsKey(r)}`));
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of rows) {
    const exact = `${r.date || ""}|${r.net ?? ""}|${r.game ?? ""}|${teamsKey(r)}`;
    if (seen.has(exact)) continue;
    seen.add(exact);
    if (r.source !== "sheet" && fromSheet.has(`${r.date || ""}|${teamsKey(r)}`)) continue;
    out.push(r);
  }
  return out;
};

export function computeAppRatings(
  results: any[],
  roundGroups: Record<string, number>,
  upToRound?: number | null,
  startGroups: Record<string, number> = {}
) {
  const rows = dedupe(results || [])
    .filter((r) => (upToRound == null ? true : Number(r.round) <= Number(upToRound)))
    .sort((a, b) => Number(a.round) - Number(b.round));

  const perPlayer: Record<string, { player: string; matches: any[] }> = {};

  // The group a player was in that round, read the same way the spreadsheet does:
  // their own group row, else the average of the other players in the game, else
  // the group they were last placed in. The net they played on says nothing about
  // their group, so it is never used.
  const grouped: Record<string, { round: number; group: number }[]> = {};
  for (const [key, group] of Object.entries(roundGroups)) {
    const [name, rd] = key.split("|");
    if (!name || !rd) continue;
    (grouped[name] = grouped[name] || []).push({ round: Number(rd), group: Number(group) });
  }
  for (const list of Object.values(grouped)) list.sort((a, b) => a.round - b.round);

  const lastGroupBefore = (name: string, round: number) => {
    const list = grouped[String(name || "").trim().toLowerCase()];
    if (!list) return null;
    let found: number | null = null;
    for (const item of list) {
      if (item.round > round) break;
      found = item.group;
    }
    return found;
  };

  const groupOf = (name: string, round: number) => {
    const found = roundGroups[`${String(name || "").trim().toLowerCase()}|${round}`];
    return found ? Number(found) : null;
  };

  for (const r of rows) {
    const round = Number(r.round);
    const t1 = (Array.isArray(r.team1_players) ? r.team1_players : []).map((n: string) => String(n).trim()).filter(Boolean);
    const t2 = (Array.isArray(r.team2_players) ? r.team2_players : []).map((n: string) => String(n).trim()).filter(Boolean);
    if (!t1.length || !t2.length) continue;

    const s1 = Number(r.score1) || 0;
    const s2 = Number(r.score2) || 0;

    const groups = (names: string[]) => names.map((n) => groupOf(n, round)).filter((g) => g != null) as number[];
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
        let ownGroup = groupOf(name, round);
        if (!ownGroup) {
          const known = [t1, t2]
            .flat()
            .filter((n) => n !== name)
            .map((n) => groupOf(n, round))
            .filter((g) => g != null) as number[];
          ownGroup = known.length ? Math.round(avg(known) as number) : null;
        }
        if (!ownGroup) {
          ownGroup = lastGroupBefore(name, round) ?? startGroups[String(name).trim().toLowerCase()] ?? null;
        }
        if (!ownGroup) continue;

        const base = side.teamAvg ?? ownGroup;
        let adjustedDiff = side.diff;
        if (side.oppAvg != null && side.teamAvg != null) {
          const groupDiff = side.oppAvg - side.teamAvg;
          if (Math.abs(groupDiff) > 0.5) adjustedDiff = side.diff - groupDiff * 2;
        }

        // Who they were alongside and up against tells us as much as the margin:
        // a big win with a stronger partner, or against a weaker group, is not
        // proof they hold the group themselves.
        const partner = side.team.find((n) => n !== name);
        const partnerGroup = partner ? groupOf(partner, round) : null;
        // Both opponents must be placed in that round, otherwise a single known
        // group would read a crossover game as a same-group one.
        const oppGroups = side.opponents.map((n) => groupOf(n, round)).filter((g) => g != null) as number[];
        const oppAvg = oppGroups.length === side.opponents.length && oppGroups.length ? avg(oppGroups) : null;

        const key = String(name).toLowerCase();
        if (!perPlayer[key]) perPlayer[key] = { player: String(name).trim(), matches: [] };
        perPlayer[key].matches.push({
          round,
          group: ownGroup,
          base,
          diff: side.diff,
          adjustedDiff,
          partnerGroup,
          oppAvg,
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

    // Their games cut two ways: inside their own group or against other groups,
    // and alongside a stronger or a weaker partner.
    const split = (games: number, diff: number) =>
      games ? { games, margin: parseFloat((diff / games).toFixed(1)) } : null;
    const bucket = {
      own: { g: 0, d: 0 },
      other: { g: 0, d: 0 },
      strong: { g: 0, d: 0 },
      weak: { g: 0, d: 0 },
      same: { g: 0, d: 0 },
    };
    for (const m of matches) {
      if (m.oppAvg != null) {
        const b = Math.abs(m.oppAvg - m.group) <= 0.5 ? bucket.own : bucket.other;
        b.g++;
        b.d += m.diff;
      }
      if (m.partnerGroup != null) {
        const b =
          m.partnerGroup < m.group ? bucket.strong : m.partnerGroup > m.group ? bucket.weak : bucket.same;
        b.g++;
        b.d += m.diff;
      }
    }
    const splits = {
      ownGroup: split(bucket.own.g, bucket.own.d),
      otherGroups: split(bucket.other.g, bucket.other.d),
      strongPartner: split(bucket.strong.g, bucket.strong.d),
      weakPartner: split(bucket.weak.g, bucket.weak.d),
      samePartner: split(bucket.same.g, bucket.same.d),
    };

    return {
      player: entry.player,
      rating: parseFloat(rolling.toFixed(2)),
      currentGroup: roundsSorted[roundsSorted.length - 1].group,
      baseGroup: startGroups[entry.player.trim().toLowerCase()] ?? roundsSorted[0].group,
      roundsPlayed: roundsSorted.length,
      // Under three rounds a rating is mostly their starting group, so it is kept
      // but not ranked: it never feeds promotion/demotion or the ordering.
      provisional: roundsSorted.length < 3,
      gp: matches.length,
      diff: totalDiff,
      firstRound: roundsSorted[0].round,
      lastRound: roundsSorted[roundsSorted.length - 1].round,
      rounds: detail,
      splits,
    };
  });

  // Filler names used to pad a group up to eight are not players: their matches
  // still count for everyone else, but they get no rating row of their own.
  const PLACEHOLDERS = ["na", "n/a", "n.a.", "-", "tbc", "tba", "vacant", "blank"];

  const rated = players.filter(
    (p) => !PLACEHOLDERS.includes(String(p.player || "").trim().toLowerCase())
  );

  const ranked = rated.filter((p) => !p.provisional).sort((a, b) => a.rating - b.rating);
  const provisional = rated.filter((p) => p.provisional).sort((a, b) => a.rating - b.rating);
  return { players: [...ranked, ...provisional] };
}
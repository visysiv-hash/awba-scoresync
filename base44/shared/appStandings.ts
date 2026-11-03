// Ladder standings built only from results stored in the app, in the same shape the
// spreadsheet's Group_Leaderboards tab produces, so every leaderboard view can read
// either source without changing how it renders.
//
// Each match is two games to 21. A game is a win, loss or draw on its own, which is
// how the sheet counts GP and ladder points (2 for a win, 1 for a draw). A game lost
// to nil carries the 21-point penalty. A player's totals sit in the ladder of the
// group they played that round in, so each group ladder reflects games in that group.

const PENALTY = 21;

const PLACEHOLDERS = ["na", "n/a", "n.a.", "-", "tbc", "tba", "vacant", "blank"];

const clean = (names: any[]) =>
  (Array.isArray(names) ? names : []).map((n: string) => String(n).trim()).filter(Boolean);

const teamsKey = (r: any) =>
  [clean(r.team1_players), clean(r.team2_players)]
    .map((t) => t.map((n) => n.toLowerCase()).sort().join("+"))
    .sort()
    .join("|");

// A game can be stored twice (the app's own submission plus the sheet import).
// Count it once, letting the sheet copy win.
const dedupe = (rows: any[]) => {
  const fromSheet = new Set(rows.filter((r) => r.source === "sheet").map((r) => `${r.date || ""}|${teamsKey(r)}`));
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of rows) {
    const exact = `${r.date || ""}|${teamsKey(r)}`;
    if (seen.has(exact)) continue;
    seen.add(exact);
    if (r.source !== "sheet" && fromSheet.has(exact)) continue;
    out.push(r);
  }
  return out;
};

export function computeAppStandings(
  results: any[],
  roundGroups: Record<string, number>,
  startGroups: Record<string, number> = {},
  names: Record<string, string> = {}
) {
  // The group a player was in for a given round, else the group they were last
  // placed in, else their starting group.
  const history: Record<string, { round: number; group: number }[]> = {};
  for (const [key, group] of Object.entries(roundGroups)) {
    const [name, rd] = key.split("|");
    if (!name || !rd) continue;
    (history[name] = history[name] || []).push({ round: Number(rd), group: Number(group) });
  }
  for (const list of Object.values(history)) list.sort((a, b) => a.round - b.round);

  const groupFor = (name: string, round: number) => {
    const key = String(name || "").trim().toLowerCase();
    const list = history[key];
    if (!list) return startGroups[key] ?? null;
    let found: number | null = null;
    for (const item of list) {
      if (item.round > round) break;
      found = item.group;
    }
    return found ?? startGroups[key] ?? null;
  };

  const latestGroup = (name: string) => {
    const key = String(name || "").trim().toLowerCase();
    const list = history[key];
    return list?.length ? list[list.length - 1].group : startGroups[key] ?? null;
  };

  // Keyed "group|player" so a player has a row in every group they played in.
  const stats: Record<string, any> = {};

  const ensure = (name: string, group: number) => {
    const key = `${Math.round(group)}|${name.trim().toLowerCase()}`;
    if (!stats[key]) {
      stats[key] = { player: name.trim(), group: Math.round(group), gp: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0, zeroGames: 0 };
    }
    return stats[key];
  };

  for (const r of dedupe(results || [])) {
    const t1 = clean(r.team1_players);
    const t2 = clean(r.team2_players);
    if (!t1.length || !t2.length) continue;

    const round = Number(r.round) || 0;
    const games = Array.isArray(r.rounds) && r.rounds.length
      ? r.rounds
      : [{ score1: r.score1, score2: r.score2 }];

    for (const g of games) {
      const s1 = Number(g.score1) || 0;
      const s2 = Number(g.score2) || 0;
      const apply = (name: string, mine: number, theirs: number) => {
        const group = groupFor(name, round || Number.MAX_SAFE_INTEGER);
        if (!group) return;
        const s = ensure(name, group);
        s.gp += 1;
        s.pointsFor += mine;
        s.pointsAgainst += theirs;
        if (mine === 0) s.zeroGames += 1;
        if (mine > theirs) s.wins += 1;
        else if (mine < theirs) s.losses += 1;
        else s.draws += 1;
      };
      t1.forEach((n) => apply(n, s1, s2));
      t2.forEach((n) => apply(n, s2, s1));
    }
  }

  // Everyone the league knows about appears in their group, even before they play.
  const known = new Set([...Object.keys(history), ...Object.keys(startGroups)]);
  for (const key of known) {
    if (PLACEHOLDERS.includes(key)) continue;
    const display = names[key];
    if (!display) continue;
    const group = latestGroup(display);
    if (group) ensure(display, group);
  }

  const groups: Record<string, any[]> = {};

  for (const s of Object.values(stats)) {
    const pointsFor = s.pointsFor - s.zeroGames * PENALTY;
    const diff = pointsFor - s.pointsAgainst;
    const ladderPts = s.wins * 2 + s.draws;
    const label = `Group ${s.group} Leaderboard`;
    (groups[label] = groups[label] || []).push({
      player: s.player,
      gp: s.gp,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      ladderPts,
      pointsFor,
      pointsAgainst: s.pointsAgainst,
      diff,
      rankScore: ladderPts * 100000 + diff,
      penalties: s.zeroGames,
    });
  }

  for (const rows of Object.values(groups)) {
    rows.sort((a, b) => b.ladderPts - a.ladderPts || b.diff - a.diff || b.pointsFor - a.pointsFor);
    rows.forEach((row, i) => { row.rank = String(i + 1); });
  }

  const ordered: Record<string, any[]> = {};
  for (const label of Object.keys(groups).sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)))) {
    ordered[label] = groups[label];
  }
  return { groups: ordered };
}
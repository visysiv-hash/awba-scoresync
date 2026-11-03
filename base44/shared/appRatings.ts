// App-only rating calculation. Uses nothing but the match results stored in the
// app (net, game, teams, scores) — no spreadsheet tabs involved.
//
// The spreadsheet method gets a player's group from Group_Round_Standings. With
// app data only, the net a player played on is used as their group for the night
// (Group 1 plays Net 1, and so on), which keeps the same maths and the same
// 21-point zero-score penalty.

const PENALTY = 21;

const divisorFor = (base: number) => {
  const map: Record<number, number> = { 1: 40, 2: 35, 3: 30, 4: 25, 5: 20 };
  return map[Math.round(base) || 1] ?? 15;
};

export function computeAppRatings(matches: any[]) {
  const byPlayer: Record<string, any> = {};

  const addMatch = (name: string, data: any) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return;
    if (!byPlayer[key]) byPlayer[key] = { player: String(name).trim(), matches: [] };
    byPlayer[key].matches.push(data);
  };

  for (const m of matches) {
    const t1 = (Array.isArray(m.team1_players) ? m.team1_players : []).map((n: string) => String(n).trim()).filter(Boolean);
    const t2 = (Array.isArray(m.team2_players) ? m.team2_players : []).map((n: string) => String(n).trim()).filter(Boolean);
    const s1 = Number(m.score1) || 0;
    const s2 = Number(m.score2) || 0;

    const diff1 = s1 - s2 - (s1 === 0 ? PENALTY : 0);
    const diff2 = s2 - s1 - (s2 === 0 ? PENALTY : 0);

    const sides = [
      { team: t1, opponents: t2, diff: diff1, scoreFor: s1, scoreAgainst: s2 },
      { team: t2, opponents: t1, diff: diff2, scoreFor: s2, scoreAgainst: s1 },
    ];

    for (const side of sides) {
      for (const name of side.team) {
        addMatch(name, {
          net: Number(m.net) || 0,
          game: Number(m.game) || 0,
          partner: side.team.filter((p: string) => p !== name),
          opponents: side.opponents,
          scoreFor: side.scoreFor,
          scoreAgainst: side.scoreAgainst,
          diff: side.diff,
        });
      }
    }
  }

  const players = Object.values(byPlayer).map((entry: any) => {
    const games = entry.matches;
    const gp = games.length;
    const totalDiff = games.reduce((s: number, m: any) => s + m.diff, 0);
    const groupBase = games.reduce((s: number, m: any) => s + m.net, 0) / gp;
    const divisor = divisorFor(groupBase);
    const perGame = totalDiff / (gp * 2);
    const rating = parseFloat((groupBase - perGame / divisor).toFixed(2));

    return {
      player: entry.player,
      group: parseFloat(groupBase.toFixed(2)),
      gp,
      diff: totalDiff,
      divisor,
      perGame: parseFloat(perGame.toFixed(2)),
      rating,
      matches: games.sort((a: any, b: any) => a.net - b.net || a.game - b.game),
    };
  });

  players.sort((a, b) => a.rating - b.rating);
  return { players };
}
// The optional 4th game is played after the three scheduled games. It is drawn from
// the players who opted in, mixing the night's grades together so nobody spends the
// extra game against only their own level: every pair takes one player from the
// stronger half and one from the weaker half, and the two pairs in a game are kept as
// close in strength as the list allows.

const rate = (p) => (Number.isFinite(Number(p?.rating)) ? Number(p.rating) : null);
const strength = (p) => rate(p) ?? 99;
const sum = (team) => team.reduce((total, p) => total + (rate(p) ?? 0), 0);

// Each split puts one of the stronger half (index 0, 1) with one of the weaker half
// (index 2, 3), so the grade mix is kept whichever split wins.
const MIXED_SPLITS = [
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

const shuffle = (list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// `players` are { name, rating, group }. Nets are numbered from 1 because the 4th
// game is played on whichever nets are still free.
export function buildFourthGame(players, { shuffle: mix = false } = {}) {
  const list = (players || []).filter((p) => p && p.name);
  const sorted = [...list].sort((a, b) => strength(a) - strength(b));
  const half = Math.ceil(sorted.length / 2);
  const strong = sorted.slice(0, half);
  const weak = sorted.slice(half);
  if (mix) {
    shuffle(strong);
    shuffle(weak);
  }

  const count = Math.floor(sorted.length / 4);
  const games = [];
  for (let k = 0; k < count; k++) {
    // Take from the outside of each half inwards, so the mix spans the grades.
    const four = [strong[k], strong[strong.length - 1 - k], weak[k], weak[weak.length - 1 - k]];
    let best = null;
    for (const [a, b] of MIXED_SPLITS) {
      const teamA = [four[a[0]], four[a[1]]];
      const teamB = [four[b[0]], four[b[1]]];
      const gap = Math.abs(sum(teamA) - sum(teamB));
      if (!best || gap < best.gap) best = { gap, teamA, teamB };
    }
    games.push({ net: k + 1, team1: best.teamA, team2: best.teamB });
  }

  const playing = new Set(games.flatMap((g) => [...g.team1, ...g.team2]).map((p) => p.name));
  const sittingOut = sorted.filter((p) => !playing.has(p.name)).map((p) => p.name);
  return { games, sittingOut };
}
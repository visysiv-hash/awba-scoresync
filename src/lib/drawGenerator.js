// Rating-ordered grouping for a night's draw: strongest to weakest, split into
// groups of eight. Unrated players go last. All pairing decisions live in
// nightDraw.js, so there is a single pairing engine for every group size.

export function buildGroups(players) {
  const rated = (players || [])
    .filter((p) => p.rating !== null && p.rating !== undefined)
    .sort((a, b) => a.rating - b.rating);
  const unrated = (players || []).filter((p) => p.rating === null || p.rating === undefined);
  const all = [...rated, ...unrated];

  const groups = [];
  for (let i = 0; i < all.length; i += 8) {
    groups.push({ groupNum: groups.length + 1, players: all.slice(i, i + 8) });
  }
  return groups;
}

export const groupAverage = (players) => {
  const rated = players.filter((p) => p.rating !== null && p.rating !== undefined);
  if (!rated.length) return null;
  return parseFloat((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2));
};
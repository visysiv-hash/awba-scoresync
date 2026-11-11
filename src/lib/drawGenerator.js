// Rating-ordered grouping for a night's draw: strongest to weakest, split into
// groups of eight. Unrated players go last. All pairing decisions live in
// nightDraw.js, so there is a single pairing engine for every group size.

export const BLOCK_SIZE = 8;

export function buildGroups(players) {
  const rated = (players || [])
    .filter((p) => p.rating !== null && p.rating !== undefined)
    .sort((a, b) => a.rating - b.rating);
  const unrated = (players || []).filter((p) => p.rating === null || p.rating === undefined);
  const all = [...rated, ...unrated];

  const chunks = [];
  for (let i = 0; i < all.length; i += BLOCK_SIZE) chunks.push(all.slice(i, i + BLOCK_SIZE));

  // Blocks are cut at eight wherever the numbers allow, never at a stored group's
  // edge. Three or fewer players left over cannot fill a net, so they join the
  // blocks before them instead of sitting out or playing a thin game on their own.
  const tail = chunks.length > 1 ? chunks[chunks.length - 1] : null;
  if (tail && tail.length < 4) {
    chunks.pop();
    // Weakest tail player into the weakest block, so the added players stay in order.
    tail.slice().reverse().forEach((player, i) => {
      const target = chunks.length - 1 - (i % chunks.length);
      chunks[target] = [...chunks[target], player];
    });
  }

  return chunks.map((chunk, i) => ({ groupNum: i + 1, players: chunk }));
}

// Groups from an explicit player order. An admin's swapped list is honoured exactly as
// arranged, so re-pairing rebuilds only the games and never re-sorts the players.
export function groupFromLists(players, lists) {
  const byName = new Map(
    (players || []).map((p) => [String(p.name).trim().toLowerCase(), p])
  );
  const used = new Set();
  const groups = [];

  for (const names of lists || []) {
    const group = [];
    for (const name of names || []) {
      const k = String(name).trim().toLowerCase();
      const player = byName.get(k);
      if (!player || used.has(k)) continue;
      used.add(k);
      group.push(player);
    }
    if (group.length) groups.push({ groupNum: groups.length + 1, players: group });
  }
  return groups;
}

export const groupAverage = (players) => {
  const rated = players.filter((p) => p.rating !== null && p.rating !== undefined);
  if (!rated.length) return null;
  return parseFloat((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2));
};
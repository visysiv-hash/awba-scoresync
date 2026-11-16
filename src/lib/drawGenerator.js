// Rating-ordered grouping for a night's draw: strongest to weakest, split into
// groups of eight. Unrated players go last. All pairing decisions live in
// nightDraw.js, so there is a single pairing engine for every group size.

export const BLOCK_SIZE = 8;

// The group a player is assigned to in the app. Without one, the group their rating
// sits in is used, so an unassigned player still lands in the right band.
const assignedGroup = (p) => {
  const group = Number(p.baseGroup);
  if (Number.isFinite(group) && group >= 1) return group;
  const rating = Number(p.rating);
  return Number.isFinite(rating) ? Math.max(1, Math.round(rating)) : 99;
};

export function buildGroups(players) {
  // Group first, rating second: a group is filled with its own players before the
  // strongest of the group below are called up to make up the eight.
  const rated = (players || [])
    .filter((p) => p.rating !== null && p.rating !== undefined)
    .sort((a, b) => assignedGroup(a) - assignedGroup(b) || a.rating - b.rating);
  const unrated = (players || []).filter((p) => p.rating === null || p.rating === undefined);
  const all = [...rated, ...unrated];

  const chunks = [];
  for (let i = 0; i < all.length; i += BLOCK_SIZE) chunks.push(all.slice(i, i + BLOCK_SIZE));

  // Blocks are cut at eight, never stretched past it: a block of eight fills two
  // courts every round, so everyone in it plays three games. Two or three players
  // left over become their own short group, where American doubles and singles give
  // all of them three games as well — stretching a block to nine would only leave
  // someone resting a round.
  const tail = chunks.length > 1 ? chunks[chunks.length - 1] : null;
  if (tail && tail.length === 1) {
    // One player cannot play alone, so the weakest player of the block before is lent
    // to them: that leaves a short group of two and a group of seven, and nobody in
    // either group loses a game.
    const before = chunks[chunks.length - 2];
    chunks[chunks.length - 2] = before.slice(0, -1);
    chunks[chunks.length - 1] = [before[before.length - 1], ...tail];
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
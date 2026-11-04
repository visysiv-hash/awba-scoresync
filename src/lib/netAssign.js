// Net numbers belong to a group's block of nets, and every match points at one of
// those numbers. Handing a group a different block therefore means remapping the
// number on the group and on every match — including the cross-group games in a
// crossover night, which are listed under one group but played on the other's nets.

const blocksOf = (groups) => groups.map((g) => (g.courts || []).map(Number));

// Applies one block of net numbers per group, in group order.
export function assignNets(record, blocks) {
  const groups = record.groups || [];
  const map = new Map();
  groups.forEach((g, i) => {
    const old = (g.courts || []).map(Number);
    const next = blocks[i] || old;
    old.forEach((n, k) => {
      if (Number.isFinite(n) && Number.isFinite(next[k])) map.set(n, next[k]);
    });
  });
  const remap = (net) => {
    const n = Number(net);
    return map.has(n) ? map.get(n) : n;
  };
  return {
    ...record,
    groups: groups.map((g, i) => ({
      ...g,
      courts: (blocks[i] || g.courts || []).map(Number),
    })),
    matches: (record.matches || []).map((m) => ({ ...m, net: remap(m.net) })),
  };
}

// A fresh random block per group, so nobody is stuck on the same net every week.
export function shuffleNets(record) {
  const blocks = blocksOf(record.groups || []);
  const order = blocks.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return assignNets(record, order.map((i) => blocks[i]));
}

// Two groups trade their blocks of nets; every other group and game stays put.
export function swapNets(record, a, b) {
  const blocks = blocksOf(record.groups || []);
  if (!blocks[a] || !blocks[b]) return record;
  [blocks[a], blocks[b]] = [blocks[b], blocks[a]];
  return assignNets(record, blocks);
}
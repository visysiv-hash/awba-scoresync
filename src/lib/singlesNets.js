// The nets the admin picks share one block of players: each round those nets play as
// many doubles games as their players allow, and singles for the rest. A net short of a
// doubles four still plays doubles all night, and only the games the block cannot fill
// with four players are played one against one.
const ROUNDS = 3;

const rate = (player) => {
  const value = Number(player?.rating);
  return Number.isFinite(value) ? value : 0;
};

const nameOf = (player) => String(player?.name || "").trim().toLowerCase();

const pairKey = (a, b) => {
  const x = nameOf(a);
  const y = nameOf(b);
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

const teamPairs = (team) => team.flatMap((a, i) => team.slice(i + 1).map((b) => [a, b]));

// How many of the block's nets can hold a doubles game each round before its players run
// out: six players on two nets play one doubles and one singles a round.
export function netMix(playerCount, netCount) {
  let doubles = Math.min(netCount, Math.floor(playerCount / 4));
  while (doubles > 0 && doubles * 4 + (netCount - doubles) * 2 > playerCount) doubles--;
  return { doubles, singles: Math.max(0, netCount - doubles) };
}

// How many singles games the whole night holds for that block.
export function singlesGameCount(playerCount, netCount) {
  return netMix(playerCount, netCount).singles * ROUNDS;
}

const SPLITS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];

// The four players split into the two teams that repeat the fewest partners and sit
// closest to each other's strength.
function bestSplit(sorted, seen) {
  let best = null;
  for (const [[a, b], [c, d]] of SPLITS) {
    const one = [sorted[a], sorted[b]];
    const two = [sorted[c], sorted[d]];
    const repeat = [...teamPairs(one), ...teamPairs(two)]
      .filter(([x, y]) => seen.has(pairKey(x, y))).length;
    const gap = Math.abs(rate(one[0]) + rate(one[1]) - rate(two[0]) - rate(two[1]));
    const cost = repeat * 100 + gap;
    if (!best || cost < best.cost) best = { cost, teams: [one, two] };
  }
  return best.teams;
}

export function applySinglesNets(draw, nets) {
  if (!draw || !Array.isArray(nets) || !nets.length) return draw;
  // A pooled or cross-group night mixes players between groups, so its nets stay as drawn.
  if (draw.poolGroups !== -2) return draw;
  const groups = draw.groups || [];
  const wanted = new Set(nets.map(Number));
  const block = groups
    .map((group, i) => ((group.courts || []).some((net) => wanted.has(Number(net))) ? i : -1))
    .filter((i) => i >= 0);
  if (!block.length) return draw;
  const courts = [...new Set(block.flatMap((i) => (groups[i].courts || []).map(Number)))].sort((a, b) => a - b);
  const players = block.flatMap((i) => groups[i].players || []);
  if (players.length < 2 || !courts.length) return draw;
  // Every game already fits as doubles, so the draw is left exactly as it was paired.
  if (!netMix(players.length, courts.length).singles) return draw;

  for (const i of block) for (const game of groups[i].games) game.matches = [];

  const played = new Map(players.map((player) => [player, 0]));
  const seen = new Set();
  const owner = (net) => block.find((i) => (groups[i].courts || []).map(Number).includes(net));

  for (let round = 1; round <= ROUNDS; round++) {
    // The net that plays singles moves along each round, so the shorter game is shared out.
    const shift = (round - 1) % courts.length;
    const order = [...courts.slice(shift), ...courts.slice(0, shift)];
    const formats = order.map((net) => ({ net, singles: false }));
    let slots = formats.length * 4;
    for (let i = formats.length - 1; i >= 0 && slots > players.length; i--) {
      formats[i].singles = true;
      slots -= 2;
    }
    // Fewest games first, so nobody rests twice while another plays every round.
    const playing = [...players]
      .sort((a, b) => (played.get(a) - played.get(b)) || (rate(a) - rate(b)))
      .slice(0, Math.min(slots, players.length))
      .sort((a, b) => rate(a) - rate(b));
    const start = ((round - 1) * 2) % Math.max(1, playing.length);
    const queue = [...playing.slice(start), ...playing.slice(0, start)];

    // Deal the players round the games so each one gets a spread of the block's ratings.
    const games = formats.map((f) => ({ net: f.net, size: f.singles ? 2 : 4, players: [] }));
    const sequence = [...games].sort((a, b) => b.size - a.size);
    let at = 0;
    let pass = 0;
    while (at < queue.length) {
      const step = pass % 2 === 0 ? sequence : [...sequence].reverse();
      let placed = false;
      for (const game of step) {
        if (at >= queue.length) break;
        if (game.players.length >= game.size) continue;
        game.players.push(queue[at++]);
        placed = true;
      }
      if (!placed) break;
      pass++;
    }

    for (const game of games) {
      const sorted = [...game.players].sort((a, b) => rate(a) - rate(b));
      if (sorted.length < game.size) continue;
      const teams = game.size === 2 ? [[sorted[0]], [sorted[1]]] : bestSplit(sorted, seen);
      const gi = owner(game.net);
      const slot = gi === undefined ? null : groups[gi].games[round - 1];
      if (!slot) continue;
      slot.matches.push({ teamA: teams[0], teamB: teams[1], net: game.net });
      for (const player of game.players) played.set(player, (played.get(player) || 0) + 1);
      for (const team of teams) for (const [a, b] of teamPairs(team)) seen.add(pairKey(a, b));
    }
  }
  return draw;
}
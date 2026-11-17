// Each player's nets for the night in game order: the net they play Game 1 on first,
// then Game 2, then Game 3. A player who moves around the hall reads their night top
// to bottom instead of hunting the numbers in order.
export function playerNets(matches = []) {
  const byPlayer = new Map();
  for (const m of matches || []) {
    const game = Number(m.game);
    const net = Number(m.net);
    for (const name of [...(m.team1 || []), ...(m.team2 || [])]) {
      if (!name) continue;
      if (!byPlayer.has(name)) byPlayer.set(name, []);
      byPlayer.get(name).push({ game: Number.isFinite(game) ? game : 0, net });
    }
  }

  return [...byPlayer.entries()]
    .map(([name, plays]) => {
      const nets = [];
      for (const { net } of plays.sort((a, b) => a.game - b.game)) {
        if (Number.isFinite(net) && !nets.includes(net)) nets.push(net);
      }
      return { name, nets };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
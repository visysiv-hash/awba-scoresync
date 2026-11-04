const low = (name) => String(name || "").trim().toLowerCase();
const key = (a, b) => [low(a), low(b)].sort().join("|");

// Inspect the actual displayed matches, not the requested mode. Manual edits and
// older saved draws therefore cannot silently claim to be unique.
export function scheduleUniqueness(record) {
  const counts = { partners: new Map(), opponents: new Map(), meetings: new Map() };
  const homes = new Map((record?.groups || []).flatMap((g, i) => (g.players || []).map((name) => [low(name), i])));
  let distance = 0;
  const add = (type, a, b) => {
    const k = key(a, b);
    counts[type].set(k, (counts[type].get(k) || 0) + 1);
  };
  for (const match of record?.matches || []) {
    const teams = [match.team1 || [], match.team2 || []];
    for (const team of teams) for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) add("partners", team[i], team[j]);
    for (const a of teams[0]) for (const b of teams[1]) add("opponents", a, b);
    const names = teams.flat();
    const groups = names.map((name) => homes.get(low(name))).filter((g) => g !== undefined);
    if (groups.length) distance = Math.max(distance, Math.max(...groups) - Math.min(...groups));
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) add("meetings", names[i], names[j]);
  }
  const repeats = (type) => [...counts[type].values()].reduce((sum, n) => sum + Math.max(0, n - 1), 0);

  // Everyone booked should get three games; American doubles and singles fill the
  // short groups so no one loses a round.
  const played = new Map();
  for (const g of record?.groups || []) for (const name of g.players || []) played.set(low(name), 0);
  for (const match of record?.matches || []) {
    const names = new Set([...(match.team1 || []), ...(match.team2 || [])].map(low));
    for (const name of names) played.set(name, (played.get(name) || 0) + 1);
  }
  const short = [...played.entries()].filter(([, games]) => games < 3).length;

  return {
    partners: repeats("partners"),
    opponents: repeats("opponents"),
    meetings: repeats("meetings"),
    distance,
    short,
  };
}

export function uniquenessMessage(info) {
  const reach = info.distance ? `maximum ${info.distance} level${info.distance === 1 ? "" : "s"} apart` : "within each group";
  const games = info.short ? ` ${info.short} player${info.short === 1 ? " plays" : "s play"} fewer than three games.` : "";
  if (info.partners || info.opponents) return `Fallback draw: ${info.partners} repeated partner pairing${info.partners === 1 ? "" : "s"}, ${info.opponents} repeated opponent matchup${info.opponents === 1 ? "" : "s"} · ${reach}. A fully unique draw was not found for this player list.${games}`;
  if (info.meetings) return `Unique partners and opponents · ${reach}. ${info.meetings} encounter${info.meetings === 1 ? " switches" : "s switch"} between partner and opponent; a no-repeat-encounter draw was not found.${games}`;
  return `Unique games: no repeated partners, opponents or encounters · ${reach}.${games || " Everyone plays three games."}`;
}
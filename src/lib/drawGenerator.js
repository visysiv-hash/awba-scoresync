// Port of the AWBA Apps Script draw logic (ListOfNames scheduler), for the
// in-app option. Groups are filled by rating, then:
//   Game 1  internal round        (top 4 paired with bottom 4)
//   Game 2  cross group, same half
//   Game 3  internal round 2      ("unique" option: cross group, swapped half)
// Cross rounds keep partners and only change who plays whom, choosing the
// arrangement with the fewest repeated partners/opponents for the night.

const pairKey = (a, b) => {
  const x = String(a || "").trim().toLowerCase();
  const y = String(b || "").trim().toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
};

const matchContacts = (teamA, teamB, set) => {
  set.add(pairKey(teamA[0].name, teamA[1].name));
  set.add(pairKey(teamB[0].name, teamB[1].name));
  for (const a of teamA) for (const b of teamB) set.add(pairKey(a.name, b.name));
  return set;
};

const contactsFromMatches = (matches) => {
  const set = new Set();
  for (const m of matches) matchContacts(m.teamA, m.teamB, set);
  return set;
};

const mergeSets = (sets) => {
  const out = new Set();
  for (const s of sets) if (s) for (const v of s) out.add(v);
  return out;
};

const matchPenalty = (teamA, teamB, contactSet) => {
  let penalty = 0;
  if (contactSet.has(pairKey(teamA[0].name, teamA[1].name))) penalty += 10;
  if (contactSet.has(pairKey(teamB[0].name, teamB[1].name))) penalty += 10;
  for (const a of teamA) for (const b of teamB) {
    if (contactSet.has(pairKey(a.name, b.name))) penalty += 1;
  }
  return penalty;
};

const internal1 = (top, bottom) => {
  if (top.length !== 4 || bottom.length !== 4) return [];
  return [
    { teamA: [top[0], bottom[0]], teamB: [top[1], bottom[1]] },
    { teamA: [top[2], bottom[2]], teamB: [top[3], bottom[3]] },
  ];
};

const internal2 = (top, bottom) => {
  if (top.length !== 4 || bottom.length !== 4) return [];
  return [
    { teamA: [top[0], bottom[2]], teamB: [top[3], bottom[1]] },
    { teamA: [top[1], bottom[3]], teamB: [top[2], bottom[0]] },
  ];
};

const crossSmart = (aPlayers, bPlayers, priorContacts) => {
  if (aPlayers.length !== 4 || bPlayers.length !== 4) return [];

  const patterns = [
    [3, 0, 1, 2],
    [2, 3, 0, 1],
    [1, 2, 3, 0],
    [0, 1, 2, 3],
  ];
  const orders = [
    [0, 1, 2, 3],
    [0, 2, 1, 3],
    [0, 3, 1, 2],
  ];

  let best = null;
  let bestPenalty = Number.MAX_SAFE_INTEGER;

  for (const pattern of patterns) {
    const teams = aPlayers.map((p, i) => [p, bPlayers[pattern[i]]]);
    for (const order of orders) {
      const arranged = order.map((i) => teams[i]);
      const matches = [
        { teamA: arranged[0], teamB: arranged[1] },
        { teamA: arranged[2], teamB: arranged[3] },
      ];
      const penalty =
        matchPenalty(arranged[0], arranged[1], priorContacts) +
        matchPenalty(arranged[2], arranged[3], priorContacts);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = matches;
      }
    }
  }

  return best || [];
};

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

export function generateDraw(players, variant = "normal") {
  const groups = buildGroups(players).map((g) => ({
    ...g,
    top: g.players.slice(0, 4),
    bottom: g.players.slice(4, 8),
    complete: g.players.length === 8,
  }));

  const draw = groups.map((g) => ({
    groupNum: g.groupNum,
    players: g.players,
    average: groupAverage(g.players),
    complete: g.complete,
    games: [
      { label: "Game 1 · within group", matches: internal1(g.top, g.bottom) },
      { label: "Game 2 · cross group", matches: [] },
      { label: variant === "unique" ? "Game 3 · cross group (swapped)" : "Game 3 · within group", matches: variant === "unique" ? [] : internal2(g.top, g.bottom) },
    ],
  }));

  // Contact sets from game 1
  const game1Contacts = {};
  draw.forEach((d, i) => {
    game1Contacts[i] = contactsFromMatches(d.games[0].matches);
  });

  const game2Contacts = {};

  for (let i = 0; i < groups.length; i += 2) {
    const lower = groups[i];
    const higher = groups[i + 1];
    if (!higher || !lower.complete || !higher.complete) continue;

    const round1Combined = mergeSets([game1Contacts[i], game1Contacts[i + 1]]);

    // Game 2: lower group top 4 vs higher group top 4; higher group = both bottom 4s
    const lowerGame2 = crossSmart(lower.top, higher.top, round1Combined);
    const higherGame2 = crossSmart(lower.bottom, higher.bottom, round1Combined);
    draw[i].games[1].matches = lowerGame2;
    draw[i + 1].games[1].matches = higherGame2;
    game2Contacts[i] = contactsFromMatches(lowerGame2);
    game2Contacts[i + 1] = contactsFromMatches(higherGame2);

    if (variant === "unique") {
      const priorForGame3 = mergeSets([game1Contacts[i], game1Contacts[i + 1], game2Contacts[i], game2Contacts[i + 1]]);
      draw[i].games[2].matches = crossSmart(lower.top, higher.bottom, priorForGame3);
      draw[i + 1].games[2].matches = crossSmart(lower.bottom, higher.top, priorForGame3);
    }
  }

  return { variant, groups: draw, totalPlayers: (players || []).length };
}
// Reviews a draw that has already been arranged by hand (or generated) and says
// what is worth a second look: a game whose two pairs are too far apart to be a
// contest, a pairing the night has already used, or a player short of three games.
// Where four players can be split closer, it names the better split so the admin
// can fix that one game without touching anything else.
import { pairAverage } from "./appRatingMap";
import { scheduleUniqueness } from "./scheduleUniqueness";

// Distance between two pair averages at which a game stops feeling even. Real
// nights sit around 0.1–0.5, so anything over this is worth the admin's eye.
export const WIDE_GAP = 0.8;

// A suggested split is only offered when it gains this much, so the card never
// asks for a pointless reshuffle.
const WORTH_FIXING = 0.15;

const low = (name) => String(name || "").trim().toLowerCase();
const key = (a, b) => [low(a), low(b)].sort().join("|");

const gapOf = (team1, team2, ratings) => {
  const a = pairAverage(team1, ratings);
  const b = pairAverage(team2, ratings);
  return a === null || b === null ? null : Math.abs(a - b);
};

// The three ways four players make two pairs. The split as drawn comes first.
function splits(team1, team2) {
  if (team1.length !== 2 || team2.length !== 2) return [];
  const [a, b] = team1;
  const [c, d] = team2;
  return [
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

// Pairs already partnered or faced in the other games of the night, so a closer
// split is never one that hands someone the same partner twice.
function history(matches) {
  const partners = new Map();
  const opponents = new Map();
  const add = (map, a, b) => map.set(key(a, b), (map.get(key(a, b)) || 0) + 1);
  for (const m of matches) {
    for (const team of [m.team1 || [], m.team2 || []]) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) add(partners, team[i], team[j]);
      }
    }
    for (const a of m.team1 || []) for (const b of m.team2 || []) add(opponents, a, b);
  }
  return { partners, opponents };
}

function scoreSplit(team1, team2, ratings, seen) {
  const gap = gapOf(team1, team2, ratings);
  if (gap === null) return null;
  const repeatPartner =
    (team1.length === 2 && seen.partners.has(key(team1[0], team1[1]))) ||
    (team2.length === 2 && seen.partners.has(key(team2[0], team2[1])));
  const repeatOpponent = team1.some((a) => team2.some((b) => seen.opponents.has(key(a, b))));
  return {
    team1,
    team2,
    gap,
    // A repeat partner costs more than any closeness is worth; a repeat opponent
    // is a mild nudge away.
    cost: gap + (repeatPartner ? 0.6 : 0) + (repeatOpponent ? 0.15 : 0),
    repeatPartner,
  };
}

export function reviewDraw(record, ratings = {}) {
  const matches = record?.matches || [];
  const uniqueness = scheduleUniqueness(record);

  const rows = matches.map((m, index) => {
    const team1 = m.team1 || [];
    const team2 = m.team2 || [];
    const otherGames = matches.filter((_, i) => i !== index);
    const seen = history(otherGames);
    const gap = gapOf(team1, team2, ratings);

    let better = null;
    for (const [t1, t2] of splits(team1, team2)) {
      const candidate = scoreSplit(t1, t2, ratings, seen);
      if (!candidate || candidate.repeatPartner) continue;
      if (gap === null || candidate.cost + WORTH_FIXING > gap) continue;
      if (!better || candidate.cost < better.cost) better = candidate;
    }

    return {
      net: Number(m.net),
      game: Number(m.game),
      team1,
      team2,
      gap,
      better,
      flagged: gap !== null && gap > WIDE_GAP,
    };
  });

  const gaps = rows.map((r) => r.gap).filter((g) => g !== null);
  const flagged = rows
    .filter((r) => r.flagged)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));

  return {
    rows,
    flagged,
    fixes: flagged.filter((r) => r.better).length,
    worst: gaps.length ? Math.max(...gaps) : null,
    average: gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null,
    uniqueness,
  };
}
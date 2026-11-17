// American doubles (one player against two) and singles only appear when a group is
// short of eight — they are there so nobody sits a round out. The single player in
// American doubles carries the handicap, so the admin nominates the players willing
// to stand alone. The nomination is priced into the draw by role: a nominated player
// belongs on the lonely side of the net, never in the pair, and a player who never
// put their hand up should not be the one out there alone.
import { teamAvg } from "@/lib/teamRating";

export const SHORT_FORMAT_COST = 1e4;

export const americanSet = (names) =>
  new Set((names || []).map((n) => String(n || "").trim().toLowerCase()).filter(Boolean));

const nameOf = (player) => String((player && player.name) || player || "").trim().toLowerCase();

const sizesOf = (teams) => (teams || []).map((team) => (team ? team.length : 0));

// The player standing alone against a pair, or null when nobody does (singles, or
// ordinary doubles).
export function lonePlayer(teams) {
  const sizes = sizesOf(teams);
  if (sizes.length !== 2 || Math.min(...sizes) !== 1 || Math.max(...sizes) !== 2) return null;
  return sizes[0] === 1 ? teams[0][0] : teams[1][0];
}

// `teams` are the sides of the game as it is played. Cost is charged twice over:
// to a nominated player who has been put in the pair, and to a player standing
// alone who was never nominated. Zero when nobody has been nominated, so the draw
// behaves exactly as it did before.
export function shortFormatCost(teams, ok) {
  if (!ok || !ok.size) return 0;
  const sizes = sizesOf(teams);
  const shortest = Math.min(...sizes);
  let cost = 0;
  let nominated = 0;
  teams.forEach((team, i) => {
    const alone = sizes[i] === shortest;
    for (const player of team || []) {
      const picked = ok.has(nameOf(player));
      if (picked) nominated++;
      if (picked !== alone) cost += SHORT_FORMAT_COST;
    }
  });
  // The short-format game exists for the players who put their hand up: one that
  // contains none of them has wasted the game the nomination was meant for.
  if (!nominated) cost += SHORT_FORMAT_COST;
  return cost;
}

export const isNominated = (name, ok) => Boolean(ok && ok.size && ok.has(nameOf(name)));

// A one-against-two game is only a fair game when the player standing alone is the
// stronger side, and only by a little: ratings run lowest = strongest, so the lone
// player's rating has to sit a touch BELOW the pair's average. Scoring the gap
// without a direction let a weak player be sent out alone against a stronger pair,
// simply because that gap was numerically smaller. Now the wrong way round costs
// far more than being a little too strong, so the draw turns the handicap around.
const LONE_EDGE = 0.5;
const WRONG_WAY = 400;
const TOO_STRONG = 40;

export function shortBalanceCost(teams) {
  const sizes = sizesOf(teams);
  if (sizes.length !== 2 || Math.min(...sizes) !== 1 || Math.max(...sizes) !== 2) return 0;
  const solo = teamAvg(sizes[0] === 1 ? teams[0] : teams[1]);
  const pair = teamAvg(sizes[0] === 1 ? teams[1] : teams[0]);
  if (solo === null || pair === null) return 0;
  // Positive means the pair is the stronger side, which is the wrong way round.
  const off = solo - pair + LONE_EDGE;
  return off > 0 ? WRONG_WAY * off * off + 200 * off : TOO_STRONG * off * off;
}
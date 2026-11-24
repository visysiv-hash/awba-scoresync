// The admin can put the night's last two groups on a short format of their own —
// American doubles (one player against two) or singles — even when those groups are
// full. They play two games a round on their own two nets, and whoever is left over
// rests that round and comes in first for the next, so a rest is shared round by round.
// The lone player is the stronger side of a one-against-two game, a nominated player
// takes the lonely side first, and a junior only ever faces juniors.
import { juniorMatchAllowed } from "@/lib/juniorSafety";
import { isNominated } from "@/lib/americanDoubles";

export const isShortGroupFormat = (format) => format === "american" || format === "singles";

const ratingOf = (player) => {
  const value = player?.rating;
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Strongest first, unrated last, so the games are picked from neighbouring ratings.
const byRating = (list) =>
  [...list].sort((a, b) => {
    const x = ratingOf(a);
    const y = ratingOf(b);
    if (x === null) return y === null ? 0 : 1;
    if (y === null) return -1;
    return x - y;
  });

// Two games a round, as many players on court as the group can fill: six or more plays
// two one-against-two games, a five adds a singles, a four plays a single game.
function planFor(format, count) {
  if (format === "singles") return count >= 4 ? [[1, 1], [1, 1]] : [[1, 1]];
  if (count >= 6) return [[1, 2], [1, 2]];
  if (count === 5) return [[1, 2], [1, 1]];
  return [[1, 2]];
}

// The pair facing a single player has to sit close to their rating, and the single
// player carries the handicap, so they should be the stronger side of the game.
function loneCost(lone, pair) {
  const solo = ratingOf(lone);
  const duo = pair.reduce((sum, p) => sum + (ratingOf(p) ?? 0), 0) / pair.length;
  if (solo === null) return 0;
  return Math.abs(solo - duo) + Math.max(0, solo - duo) * 2;
}

// A second turn standing alone is heavily penalised so the handicap is shared, and a
// nominated player takes the lonely side before anyone else.
const turnCost = (player, lones, nominated) =>
  (lones.get(player) || 0) * 500 + (isNominated(player.name, nominated) ? 0 : 50);

// The best way to lay one round out: the closest singles, the closest pair against the
// lone player, a fresh player standing alone, and a junior never alone against adults.
function layOut(playing, plan, lones, nominated) {
  const slots = [];
  plan.forEach(([a, b], game) => {
    for (let i = 0; i < a; i++) slots.push([game, 0]);
    for (let i = 0; i < b; i++) slots.push([game, 1]);
  });
  if (slots.length !== playing.length) return null;

  const order = new Array(slots.length);
  const used = new Array(playing.length).fill(false);
  let best = null;

  const walk = (depth) => {
    if (depth === slots.length) {
      const teams = plan.map(() => [[], []]);
      slots.forEach(([game, side], i) => teams[game][side].push(order[i]));
      if (!teams.every(([A, B]) => juniorMatchAllowed(A, B))) return;
      let cost = 0;
      for (const [A, B] of teams) {
        if (A.length === 1 && B.length === 2) cost += loneCost(A[0], B) + turnCost(A[0], lones, nominated);
        else if (B.length === 1 && A.length === 2) cost += loneCost(B[0], A) + turnCost(B[0], lones, nominated);
        else if (A.length === 1 && B.length === 1) {
          const x = ratingOf(A[0]);
          const y = ratingOf(B[0]);
          cost += x === null || y === null ? 0 : Math.abs(x - y);
        }
      }
      if (!best || cost < best.cost) best = { cost, teams };
      return;
    }
    for (let i = 0; i < playing.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      order[depth] = playing[i];
      walk(depth + 1);
      used[i] = false;
    }
  };

  walk(0);
  return best ? best.teams : null;
}

// The group's three games in the chosen format. The players with the fewest games are
// in play each round, so nobody sits out twice while someone else plays every game.
function shortRounds(players, format, nominated) {
  const list = byRating(players || []);
  if (list.length < 2) return [];
  const plan = planFor(format, list.length);
  const size = plan.reduce((sum, [a, b]) => sum + a + b, 0);
  const played = new Map(list.map((p) => [p, 0]));
  const lones = new Map(list.map((p) => [p, 0]));

  return [1, 2, 3].map(() => {
    const playing = [...list].sort((a, b) => played.get(a) - played.get(b)).slice(0, size);
    const teams = layOut(playing, plan, lones, nominated);
    if (!teams) return [];
    for (const player of playing) played.set(player, (played.get(player) || 0) + 1);
    for (const [A, B] of teams) {
      const lone = A.length === 1 && B.length === 2 ? A[0] : B.length === 1 && A.length === 2 ? B[0] : null;
      if (lone) lones.set(lone, (lones.get(lone) || 0) + 1);
    }
    return teams.map(([A, B]) => (A.length <= B.length ? { lone: A, pair: B } : { lone: B, pair: A }));
  });
}

// Replace the games of the last two groups with the chosen short format. Every other
// group keeps exactly the games the draw gave it.
export function applyLastGroupsFormat(draw, format, nominated) {
  if (!draw || !isShortGroupFormat(format)) return draw;
  // Only the unique draw keeps every group to its own players; a pooled or cross-group
  // night has them in other groups' games, so its last two groups are left alone.
  if (draw.poolGroups !== -2) return draw;
  const label = format === "singles" ? "singles" : "American doubles";
  const groups = draw.groups || [];
  const targets = groups
    .map((group, i) => ((group.players || []).length >= 4 ? i : -1))
    .filter((i) => i >= 0)
    .slice(-2);
  for (const at of targets) {
    const group = groups[at];
    group.games = shortRounds(group.players, format, nominated).map((games, round) => ({
      game: round + 1,
      label: `Game ${round + 1} · ${label}`,
      matches: games.map(({ lone, pair }) => ({ teamA: lone, teamB: pair })),
    }));
  }
  return draw;
}
// American doubles (one player against two) and singles only appear when a group is
// short of eight — they are there so nobody sits a round out. Not every player wants
// those formats, so the admin can nominate the ones who are happy to play them. The
// nomination is priced into the draw instead of hard-coded into it: the nominated
// players are chosen for those games wherever the night allows, and every game is
// still scored on team strength, so the draw stays balanced.
export const SHORT_FORMAT_COST = 1e4;

export const americanSet = (names) =>
  new Set((names || []).map((n) => String(n || "").trim().toLowerCase()).filter(Boolean));

const nameOf = (player) => String((player && player.name) || player || "").trim().toLowerCase();

// What it costs to put these players in a short-format game. Zero when nobody has
// been nominated, so the draw behaves exactly as it did before.
export function shortFormatCost(players, ok) {
  if (!ok || !ok.size) return 0;
  let cost = 0;
  for (const player of players || []) if (!ok.has(nameOf(player))) cost += SHORT_FORMAT_COST;
  return cost;
}

export const isNominated = (name, ok) => Boolean(ok && ok.size && ok.has(nameOf(name)));
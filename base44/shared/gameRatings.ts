// A game is rated by the players who took part, each giving their own 1–5 stars.
// A player rating again replaces their earlier answer rather than adding a second
// one, and the game's single rating is the average of what the players gave.

export function splitNames(value: any): string[] {
  return String(value || "")
    .split(/\s*(?:&|\band\b|\/|,)\s*/i)
    .map((n) => n.trim())
    .filter(Boolean);
}

const key = (name: any) => String(name || "").trim().toLowerCase();

// Keep only ratings from the players actually in this game, newer answers winning.
export function mergePlayerRatings(existing: any, incoming: any, players: string[]) {
  const byPlayer = new Map<string, { player: string; rating: number }>();

  for (const entry of Array.isArray(existing) ? existing : []) {
    const stars = Math.round(Number(entry?.rating));
    if (!entry?.player || !(stars >= 1 && stars <= 5)) continue;
    byPlayer.set(key(entry.player), { player: String(entry.player), rating: stars });
  }

  const allowed = new Map(players.map((p) => [key(p), p]));
  for (const entry of Array.isArray(incoming) ? incoming : []) {
    const who = allowed.get(key(entry?.player));
    if (!who) continue;
    const stars = Math.round(Number(entry?.rating));
    if (stars === 0) {
      byPlayer.delete(key(who));
      continue;
    }
    if (!(stars >= 1 && stars <= 5)) continue;
    byPlayer.set(key(who), { player: who, rating: stars });
  }

  return [...byPlayer.values()];
}

export function ratingAverage(list: any[]): number | undefined {
  if (!Array.isArray(list) || !list.length) return undefined;
  const total = list.reduce((sum, r) => sum + Number(r.rating || 0), 0);
  return Math.round((total / list.length) * 10) / 10;
}

// Everyone who played, in team order, however the team names were written.
export function gamePlayers(team1: any, team2: any): string[] {
  return [...splitNames(team1), ...splitNames(team2)];
}
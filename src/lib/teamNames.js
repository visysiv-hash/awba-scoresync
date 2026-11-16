// Partners in a team are written "A / B" (or with & or a comma), so one team
// name can hold two people — this pulls out every name playing in a game.
export function splitPlayers(value) {
  return String(value || "")
    .split(/\s*(?:&|\band\b|\/|,)\s*/i)
    .map((n) => n.trim())
    .filter(Boolean);
}

export function gamePlayers(team1, team2) {
  return [...splitPlayers(team1), ...splitPlayers(team2)];
}
// Reads the logged-in member's identity (set by the Member Login gate).
// Falls back to the legacy per-device player profile when the gate is off.

const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function getCurrentMember() {
  try {
    const member = JSON.parse(localStorage.getItem("awba_member") || "null");
    if (!member || !member.login_time) return null;
    if (Date.now() - member.login_time > FOUR_HOURS) return null;
    return member;
  } catch {
    return null;
  }
}

// Returns the player name used across standings / leaderboards / game search.
export function getCurrentPlayerName() {
  const member = getCurrentMember();
  if (member) return member.display_name || member.full_name || "";
  // Legacy fallback when the member login gate is disabled
  try {
    const player = JSON.parse(localStorage.getItem("awba_player") || "null");
    return player?.name || "";
  } catch {
    return "";
  }
}
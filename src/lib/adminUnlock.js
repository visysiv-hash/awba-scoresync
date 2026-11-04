// Remembers that the admin PIN was entered, so the committee is asked once per
// device rather than every time they open an admin page. The unlock lasts 8 hours.
const KEY = "awba_admin_unlock";
const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export function isAdminUnlocked() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!saved?.at) return false;
    if (Date.now() - saved.at > EIGHT_HOURS) {
      localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markAdminUnlocked() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    // Storage unavailable: the PIN prompt simply shows again next time.
  }
}

export function clearAdminUnlock() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
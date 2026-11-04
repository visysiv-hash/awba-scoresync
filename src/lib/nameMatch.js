// Player names arrive from two places: the sheet import stores full names
// ("Gavin Chang"), while bookings and the member roster use the display name
// ("Gavin"). A lookup takes an exact name first, then a unique name that starts
// the other one either way — so "Gavin" still finds Gavin Chang's rating without
// guessing between two players who share a first name.
const norm = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

export function findKey(map, name) {
  const key = norm(name);
  if (!key) return null;
  if (map[key] !== undefined) return key;
  const forward = [];
  const backward = [];
  const first = [];
  for (const k of Object.keys(map)) {
    if (k.startsWith(`${key} `)) forward.push(k);
    else if (key.startsWith(`${k} `)) backward.push(k);
    else if (k.split(" ")[0] === key) first.push(k);
  }
  const candidates = forward.length ? forward : backward.length ? backward : first;
  return candidates.length === 1 ? candidates[0] : null;
}

export const lookupName = (map, name) => {
  const key = findKey(map || {}, name);
  return key ? map[key] : undefined;
};
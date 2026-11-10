// Read-only preview of a rating-based model: blocks of eight cut at the widest
// rating gap nearby (so two players of the same level are never split), and a
// half-step anchor (2.5 rather than 2 or 3) taken from each settled rating.
// Nothing here writes or changes a draw — it only describes what would happen.
export const BLOCK_SIZE = 8;

export const VENUES = [
  { id: "lj", name: "Lauren Jackson Stadium", day: "Tuesday", nets: 12 },
  { id: "pcyc", name: "PCYC", day: "Thursday", nets: 4 },
];

export const spotsFor = (venue) => venue.nets * 4;
export const blocksFor = (venue) => Math.floor(spotsFor(venue) / BLOCK_SIZE);

// Half grades only, kept inside the 1–6 range the Base Groups screen offers.
export function suggestAnchor(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return null;
  return Math.min(6, Math.max(1, Math.round(value * 2) / 2));
}

const ratingOf = (p) => Number(p.rating);

export function buildBands(players) {
  const rated = (players || [])
    .filter((p) => Number.isFinite(ratingOf(p)))
    .sort((a, b) => ratingOf(a) - ratingOf(b));

  const gapAt = (i) =>
    i <= 0 || i >= rated.length ? 0 : ratingOf(rated[i]) - ratingOf(rated[i - 1]);

  const bands = [];
  let start = 0;
  while (start < rated.length) {
    let end = Math.min(rated.length, start + BLOCK_SIZE);
    if (end < rated.length) {
      // Slide the cut up to two places so it lands on the widest gap nearby.
      let best = end;
      let bestGap = gapAt(end);
      for (let i = Math.max(start + 2, end - 2); i <= Math.min(rated.length - 1, end + 2); i++) {
        if (gapAt(i) > bestGap) {
          best = i;
          bestGap = gapAt(i);
        }
      }
      end = best;
    }
    const slice = rated.slice(start, end);
    const numbers = slice.map(ratingOf);
    bands.push({
      index: bands.length + 1,
      players: slice,
      average: parseFloat((numbers.reduce((s, n) => s + n, 0) / numbers.length).toFixed(2)),
      spread: parseFloat((numbers[numbers.length - 1] - numbers[0]).toFixed(2)),
      cutGap: end < rated.length ? parseFloat(gapAt(end).toFixed(2)) : null,
    });
    start = end;
  }
  return bands;
}

// Players whose half-step anchor would differ from the whole grade they start from.
export function anchorChanges(players) {
  return (players || [])
    .filter((p) => !p.provisional && Number.isFinite(ratingOf(p)))
    .map((p) => {
      const base = p.baseGroup == null ? null : Number(p.baseGroup);
      const anchor = suggestAnchor(p.rating);
      return {
        player: p.player,
        rating: parseFloat(ratingOf(p).toFixed(2)),
        base,
        anchor,
        gp: p.gp,
        currentGroup: p.currentGroup,
        shift: base == null ? 0 : parseFloat((anchor - base).toFixed(2)),
      };
    })
    .filter((row) => row.base == null || Math.abs(row.shift) >= 0.5)
    .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
}

// The group level a player has actually been playing in, weighted by the games
// they played at that level — their real test, not the anchor they started from.
export function playedLevel(rounds) {
  const list = rounds || [];
  const games = list.reduce((s, r) => s + (Number(r.gp) || 0), 0);
  if (!games) return null;
  const sum = list.reduce((s, r) => s + (Number(r.blendedBase) || 0) * (Number(r.gp) || 0), 0);
  return parseFloat((sum / games).toFixed(2));
}

// A second opinion on every base group set by hand: the level the player has
// really been playing at and their points margin there, so a wrong starting
// group shows up from their own results rather than from the anchor itself.
export function baseGroupChecks(players, baseGroups) {
  const byName = {};
  for (const p of players || []) byName[String(p.player || "").trim().toLowerCase()] = p;

  const rows = [];
  for (const [key, value] of Object.entries(baseGroups || {})) {
    const player = byName[String(key).trim().toLowerCase()];
    if (!player || !Number.isFinite(Number(player.rating))) continue;
    const base = Number(value);
    const level = playedLevel(player.rounds);
    const games = Number(player.gp) || 0;
    const margin = games ? parseFloat((Number(player.diff) / games).toFixed(1)) : null;

    let verdict = "Too few games to judge yet";
    let tone = "gray";
    if (games >= 9 && level != null) {
      const off = parseFloat((level - base).toFixed(2));
      if (off >= 1) {
        verdict = `Playing around group ${Math.round(level)} — base looks a group low`;
        tone = "yellow";
      } else if (off <= -1) {
        verdict = `Playing around group ${Math.round(level)} — base looks a group high`;
        tone = "yellow";
      } else if (margin != null && margin >= 4) {
        verdict = "Winning at this level — may belong one group higher";
        tone = "yellow";
      } else if (margin != null && margin <= -4) {
        verdict = "Being beaten at this level — may belong one group lower";
        tone = "yellow";
      } else {
        verdict = "History backs this base";
        tone = "green";
      }
    }

    rows.push({
      player: player.player,
      base,
      rating: parseFloat(Number(player.rating).toFixed(2)),
      level,
      margin,
      games,
      verdict,
      tone,
      off: level == null ? 0 : Math.abs(level - base),
    });
  }

  const order = { yellow: 0, gray: 1, green: 2 };
  return rows.sort((a, b) => order[a.tone] - order[b.tone] || b.off - a.off);
}
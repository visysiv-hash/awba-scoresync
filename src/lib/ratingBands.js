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
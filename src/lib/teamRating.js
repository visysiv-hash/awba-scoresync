// Team strength for pairing: the average rating of a pair, with a man in a mixed
// pair counted slightly below his rating so a mixed pair is weighed fairly against
// a same-gender pair. Ratings run lowest = strongest.
export const GENDER_HANDICAP = 0.2;

const isMale = (p) => String(p.gender || "").trim().toLowerCase().startsWith("m");
const isFemale = (p) => String(p.gender || "").trim().toLowerCase().startsWith("f");

export const teamAvg = (team) => {
  const rated = team.filter((p) => p.rating !== null && p.rating !== undefined);
  if (!rated.length) return null;
  const mixed = rated.some(isMale) && rated.some(isFemale);
  const total = rated.reduce(
    (s, p) => s + (mixed && isMale(p) ? p.rating + GENDER_HANDICAP : p.rating),
    0
  );
  return total / rated.length;
};
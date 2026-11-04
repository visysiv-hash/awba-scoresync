// A small preference for junior matchups, never a separate pool or a constraint.
// Existing rating, gender, encounter and safety rules still choose the draw.
export function juniorPreferenceCost(teamA, teamB) {
  const juniorsA = teamA.filter((p) => p.junior === true).length;
  const juniorsB = teamB.filter((p) => p.junior === true).length;
  const adultsA = teamA.length - juniorsA;
  const adultsB = teamB.length - juniorsB;
  const mixedEncounters = (juniorsA + juniorsB) * (adultsA + adultsB);
  const mixedOpponents = juniorsA * adultsB + juniorsB * adultsA;
  return (mixedEncounters + mixedOpponents) * 0.005;
}
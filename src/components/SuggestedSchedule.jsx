import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Swords } from "lucide-react";

// Split players into groups of 8 by rating
function buildGroups(players) {
  const rated = players.filter(p => p.rating !== null).sort((a, b) => a.rating - b.rating);
  const unrated = players.filter(p => p.rating === null);
  const all = [...rated, ...unrated];
  const groups = [];
  let i = 0, groupNum = 1;
  while (i < all.length) {
    groups.push({ groupNum, players: all.slice(i, i + 8) });
    i += 8;
    groupNum++;
  }
  return groups;
}

function pairAvg(p1, p2) {
  const ratings = [p1.rating, p2.rating].filter(r => r !== null);
  if (!ratings.length) return null;
  return parseFloat((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2));
}

function groupAvg(players) {
  const rated = players.filter(p => p.rating !== null);
  if (!rated.length) return null;
  return parseFloat((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2));
}

/**
 * Within-group: 8 players [0..7] sorted best→worst.
 * We need 4 matches so each player plays exactly twice, no repeated partnerships.
 *
 * Partnerships used:
 *   M1: (0,7) vs (1,6)   — best+worst vs 2nd+7th
 *   M2: (2,5) vs (3,4)   — 3rd+6th vs 4th+5th
 *   M3: (0,5) vs (2,7)   — new pairs, no repeats
 *   M4: (1,4) vs (3,6)   — new pairs, no repeats
 *
 * Verify each player appears exactly twice:
 *   0: M1,M3 | 1: M1,M4 | 2: M2,M3 | 3: M2,M4
 *   4: M2,M4 | 5: M2,M3 | 6: M1,M4 | 7: M1,M3  ✓
 * All partnerships unique ✓
 */
function withinGroupMatches(p) {
  if (p.length < 8) return [];
  return [
    { teamA: [p[0], p[7]], teamB: [p[1], p[6]] },
    { teamA: [p[2], p[5]], teamB: [p[3], p[4]] },
    { teamA: [p[0], p[5]], teamB: [p[2], p[7]] },
    { teamA: [p[1], p[4]], teamB: [p[3], p[6]] },
  ];
}

/**
 * Cross-group: top 4 of groupA vs top 4 of groupB, bottom 4 vs bottom 4.
 * Each player gets exactly 1 cross-group match.
 * Pairing: interleave for balance — (a0,b3) vs (a1,b2) and (a2,b1) vs (a3,b0)
 * but we only need 1 match per player so:
 *   Top cross M1: (a0,b3) vs (a1,b2)
 *   Top cross M2: (a2,b1) vs (a3,b0)   ← a2,a3 not yet in cross
 *   Bottom cross M1: (a4,b7) vs (a5,b6)
 *   Bottom cross M2: (a6,b5) vs (a7,b4)
 *
 * This gives each player exactly 1 cross-group match, no repeated partnerships with within-group.
 */
function crossGroupMatches(groupA, groupB) {
  const a = groupA.players;
  const b = groupB.players;
  if (a.length < 8 || b.length < 8) return [];

  return [
    {
      label: `Group ${groupA.groupNum} top × Group ${groupB.groupNum} top (1)`,
      teamA: [a[0], b[3]],
      teamB: [a[1], b[2]],
    },
    {
      label: `Group ${groupA.groupNum} top × Group ${groupB.groupNum} top (2)`,
      teamA: [a[2], b[1]],
      teamB: [a[3], b[0]],
    },
    {
      label: `Group ${groupA.groupNum} bottom × Group ${groupB.groupNum} bottom (1)`,
      teamA: [a[4], b[7]],
      teamB: [a[5], b[6]],
    },
    {
      label: `Group ${groupA.groupNum} bottom × Group ${groupB.groupNum} bottom (2)`,
      teamA: [a[6], b[5]],
      teamB: [a[7], b[4]],
    },
  ];
}

function MatchCard({ match, crossLabel }) {
  const avgA = pairAvg(match.teamA[0], match.teamA[1]);
  const avgB = pairAvg(match.teamB[0], match.teamB[1]);
  const diff = avgA !== null && avgB !== null ? Math.abs(avgA - avgB).toFixed(2) : null;

  return (
    <div className="bg-slate-700/60 rounded-lg p-3 space-y-1.5">
      {crossLabel && (
        <p className="text-xs text-purple-300 font-semibold">{crossLabel}</p>
      )}
      <div className="bg-blue-900/50 rounded px-2 py-1.5">
        <p className="text-xs text-blue-300 font-bold mb-0.5">Team A</p>
        {match.teamA.map(p => (
          <div key={p.name} className="flex justify-between text-xs">
            <span className="text-white truncate">{p.name}</span>
            <span className="text-yellow-400 ml-2 shrink-0">{p.rating ?? "—"}</span>
          </div>
        ))}
        {avgA !== null && <p className="text-xs text-blue-300 mt-0.5">avg: <span className="font-bold text-white">{avgA}</span></p>}
      </div>

      <div className="text-center text-xs text-slate-400 font-bold">VS</div>

      <div className="bg-red-900/50 rounded px-2 py-1.5">
        <p className="text-xs text-red-300 font-bold mb-0.5">Team B</p>
        {match.teamB.map(p => (
          <div key={p.name} className="flex justify-between text-xs">
            <span className="text-white truncate">{p.name}</span>
            <span className="text-yellow-400 ml-2 shrink-0">{p.rating ?? "—"}</span>
          </div>
        ))}
        {avgB !== null && <p className="text-xs text-red-300 mt-0.5">avg: <span className="font-bold text-white">{avgB}</span></p>}
      </div>

      {diff !== null && (
        <p className="text-xs text-center text-slate-400">
          Rating diff: <span className={`font-bold ${parseFloat(diff) <= 0.3 ? "text-green-400" : parseFloat(diff) <= 0.6 ? "text-yellow-400" : "text-orange-400"}`}>{diff}</span>
          {parseFloat(diff) <= 0.3 ? " ✅ Balanced" : parseFloat(diff) <= 0.6 ? " ⚠️ Close" : " ⚡ Uneven"}
        </p>
      )}
    </div>
  );
}

export default function SuggestedSchedule({ players }) {
  const groups = useMemo(() => buildGroups(players), [players]);

  const schedule = useMemo(() => {
    return groups.map((group, i) => {
      const intraMatches = withinGroupMatches(group.players);
      const crossMatches = i + 1 < groups.length
        ? crossGroupMatches(group, groups[i + 1])
        : [];
      return { group, intraMatches, crossMatches };
    });
  }, [groups]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 text-center">
        {players.length} players → {groups.length} group{groups.length !== 1 ? "s" : ""} of 8 · Each player: 2 within-group + 1 cross-group = 3 matches, no repeated pairings
      </p>

      {schedule.map(({ group, intraMatches, crossMatches }) => (
        <Card key={group.groupNum} className="bg-slate-800 border-slate-700 text-white shadow">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="font-bold text-yellow-400">Group {group.groupNum}</span>
              <span className="text-xs text-slate-400">avg: <span className="font-bold text-white">{groupAvg(group.players) ?? "—"}</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-4">

            {group.players.length < 8 ? (
              <p className="text-xs text-slate-500 text-center py-2">Need 8 players for full schedule ({group.players.length} available).</p>
            ) : (
              <>
                {/* Within-group matches */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-slate-300 font-semibold">
                    <Users className="w-3 h-3" /> Within-Group Matches (4 matches, each player plays twice)
                  </div>
                  {intraMatches.map((m, i) => (
                    <MatchCard key={i} match={m} />
                  ))}
                </div>

                {/* Cross-group matches */}
                {crossMatches.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-purple-300 font-semibold">
                      <Swords className="w-3 h-3" /> Cross-Group Matches vs Group {group.groupNum + 1} (each player plays once)
                    </div>
                    {crossMatches.map((m, i) => (
                      <MatchCard key={i} match={m} crossLabel={m.label} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Swords } from "lucide-react";

// Split players into groups of 8 by rating
function buildGroups(players) {
  const rated = players.filter(p => p.rating !== null).sort((a, b) => a.rating - b.rating);
  const unrated = players.filter(p => p.rating === null);
  const all = [...rated, ...unrated];
  const groups = [];
  let i = 0;
  let groupNum = 1;
  while (i < all.length) {
    groups.push({ groupNum, players: all.slice(i, i + 8) });
    i += 8;
    groupNum++;
  }
  return groups;
}

function avg(players) {
  const rated = players.filter(p => p.rating !== null);
  if (!rated.length) return null;
  return parseFloat((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2));
}

function pairAvg(p1, p2) {
  const ratings = [p1.rating, p2.rating].filter(r => r !== null);
  if (!ratings.length) return null;
  return parseFloat((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2));
}

// Generate 2 within-group doubles matches (4 unique players each, no repeat pairings)
// Match 1: [1,4] vs [2,3]  → pair avg of (best+worst) vs (2nd+3rd) — balanced
// Match 2: [5,8] vs [6,7]  → same pattern for bottom half
function withinGroupMatches(gPlayers) {
  const p = gPlayers;
  const matches = [];

  // Top half match: p[0]+p[3] vs p[1]+p[2]
  if (p.length >= 4) {
    matches.push({
      teamA: [p[0], p[3]],
      teamB: [p[1], p[2]],
    });
  }

  // Bottom half match: p[4]+p[7] vs p[5]+p[6]
  if (p.length >= 8) {
    matches.push({
      teamA: [p[4], p[7]],
      teamB: [p[5], p[6]],
    });
  }

  return matches;
}

// Cross-group match: top 4 of groupA vs top 4 of groupB (pair 1+4 vs 2+3 pattern)
// Bottom 4 of groupA vs bottom 4 of groupB
function crossGroupMatches(groupA, groupB) {
  const a = groupA.players;
  const b = groupB.players;
  const matches = [];

  // Top half cross: a[0]+b[3] vs a[1]+b[2]  (interleave for balance)
  if (a.length >= 4 && b.length >= 4) {
    matches.push({
      label: `Group ${groupA.groupNum} top 4 × Group ${groupB.groupNum} top 4`,
      teamA: [a[0], b[3]],
      teamB: [a[1], b[2]],
    });
  }

  return matches;
}

function MatchCard({ match, index, crossLabel }) {
  const avgA = pairAvg(match.teamA[0], match.teamA[1]);
  const avgB = pairAvg(match.teamB[0], match.teamB[1]);
  const diff = avgA !== null && avgB !== null ? Math.abs(avgA - avgB).toFixed(2) : null;

  return (
    <div className="bg-slate-700/60 rounded-lg p-3 space-y-2">
      {crossLabel && (
        <p className="text-xs text-purple-300 font-semibold">{crossLabel}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          {/* Team A */}
          <div className="bg-blue-900/50 rounded px-2 py-1.5">
            <p className="text-xs text-blue-300 font-bold mb-0.5">Team A</p>
            {match.teamA.map(p => (
              <div key={p.name} className="flex justify-between text-xs">
                <span className="text-white truncate">{p.name}</span>
                <span className="text-yellow-400 ml-2 shrink-0">{p.rating ?? "—"}</span>
              </div>
            ))}
            {avgA !== null && (
              <p className="text-xs text-blue-300 mt-0.5">avg: <span className="font-bold text-white">{avgA}</span></p>
            )}
          </div>

          <div className="text-center text-xs text-slate-400 font-bold">VS</div>

          {/* Team B */}
          <div className="bg-red-900/50 rounded px-2 py-1.5">
            <p className="text-xs text-red-300 font-bold mb-0.5">Team B</p>
            {match.teamB.map(p => (
              <div key={p.name} className="flex justify-between text-xs">
                <span className="text-white truncate">{p.name}</span>
                <span className="text-yellow-400 ml-2 shrink-0">{p.rating ?? "—"}</span>
              </div>
            ))}
            {avgB !== null && (
              <p className="text-xs text-red-300 mt-0.5">avg: <span className="font-bold text-white">{avgB}</span></p>
            )}
          </div>
        </div>
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
      const crossMatch = i + 1 < groups.length
        ? crossGroupMatches(group, groups[i + 1])
        : [];

      return {
        group,
        intraMatches,
        crossMatch,
      };
    });
  }, [groups]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 text-center">
        {players.length} players → {groups.length} group{groups.length !== 1 ? "s" : ""} of ~8 · 3 matches per group (2 within + 1 cross)
      </p>

      {schedule.map(({ group, intraMatches, crossMatch }) => (
        <Card key={group.groupNum} className="bg-slate-800 border-slate-700 text-white shadow">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="font-bold text-yellow-400">Group {group.groupNum}</span>
              <span className="text-xs text-slate-400">avg: <span className="font-bold text-white">{avg(group.players) ?? "—"}</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-3">
            {/* Within-group matches */}
            {intraMatches.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-slate-300 font-semibold">
                  <Users className="w-3 h-3" /> Within Group Matches
                </div>
                {intraMatches.map((m, i) => (
                  <MatchCard key={i} match={m} index={i} />
                ))}
              </div>
            )}

            {/* Cross-group match */}
            {crossMatch.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-purple-300 font-semibold">
                  <Swords className="w-3 h-3" /> Cross-Group Match
                </div>
                {crossMatch.map((m, i) => (
                  <MatchCard key={i} match={m} index={i} crossLabel={m.label} />
                ))}
              </div>
            )}

            {intraMatches.length === 0 && crossMatch.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-2">Not enough players to schedule matches.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
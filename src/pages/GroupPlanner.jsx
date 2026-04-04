import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ArrowRight, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";

const MIN_MATCHES = 6;
const GROUP_NAMES = [
  "Group 1 Leaderboard",
  "Group 2 Leaderboard",
  "Group 3 Leaderboard",
  "Group 4 Leaderboard",
  "Group 5 Leaderboard",
  "Group 6 Leaderboard",
];

// Veterans-style rating: Base Rate (group number) + point_diff_per_game / 10
// Lower rating = stronger player
function calcRating(row, groupIndex) {
  const gp = Number(row.gp);
  const diff = Number(row.diff);
  const baseRate = groupIndex + 1; // Group 1 = 1.0, Group 6 = 6.0
  if (gp === 0) return baseRate;
  return parseFloat((baseRate + diff / gp / 10).toFixed(2));
}

function RatingBreakdown({ p }) {
  const diffPerGame = p.gp > 0 ? (p.diff / p.gp).toFixed(2) : 0;
  const contribution = p.gp > 0 ? (p.diff / p.gp / 10).toFixed(2) : 0;
  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1 text-slate-700">
      <p className="font-semibold text-blue-700 mb-1">Rating Calculation</p>
      <p>Base Rate (Group {p.currentGroup}): <span className="font-bold">{p.currentGroup}.0</span></p>
      <p>Total Point Diff: <span className="font-bold">{p.diff >= 0 ? "+" : ""}{p.diff}</span></p>
      <p>Games Played: <span className="font-bold">{p.gp}</span></p>
      <p>Diff per game: {p.diff} ÷ {p.gp} = <span className="font-bold">{diffPerGame}</span></p>
      <p>Rating adjustment: {diffPerGame} ÷ 10 = <span className="font-bold">{contribution}</span></p>
      <p className="border-t pt-1 font-bold text-blue-800">
        Rating = {p.currentGroup}.0 + {contribution} = {p.rating}
      </p>
    </div>
  );
}

export default function GroupPlanner() {
  const [loading, setLoading] = useState(true);
  const [ranked, setRanked] = useState([]);
  const [suggestedGroups, setSuggestedGroups] = useState([]);
  const [view, setView] = useState("master");
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getStandings", {}).then(standingsRes => {
      const groups = standingsRes.data?.groups || {};

      // Collect all players with veterans-style rating
      const allPlayers = [];
      GROUP_NAMES.forEach((groupName, idx) => {
        (groups[groupName] || []).forEach(row => {
          if (Number(row.gp) < MIN_MATCHES) return;
          const rating = calcRating(row, idx);
          allPlayers.push({
            player: row.player,
            currentGroup: idx + 1,
            gp: Number(row.gp),
            wins: Number(row.wins),
            losses: Number(row.losses),
            diff: Number(row.diff),
            rating,
          });
        });
      });

      // Sort ascending (lower rating = stronger)
      allPlayers.sort((a, b) => a.rating - b.rating);

      const total = allPlayers.length;
      const withSuggested = allPlayers.map((p, i) => ({
        ...p,
        rank: i + 1,
        // Always divide into 6 groups evenly regardless of player count
        suggestedGroup: Math.min(6, Math.floor(i * 6 / total) + 1),
      }));

      setRanked(withSuggested);

      const sg = Array.from({ length: 6 }, (_, i) =>
        withSuggested.filter(p => p.suggestedGroup === i + 1)
      );
      setSuggestedGroups(sg);
      setLoading(false);
    });
  }, []);

  const misplaced = ranked.filter(p => p.currentGroup !== p.suggestedGroup);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Users className="w-6 h-6 text-yellow-400" /> Group Planner
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Veterans-style ratings: Base Rate (group #) ± point diff per game ÷ 10
          </p>
          <div className="mt-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
            <span>Rating = Group Base (1–6) + Avg Point Diff / 10. Lower = stronger. A Group 6 player stays near 6.0 even if dominant — no unfair leaps.</span>
          </div>
        </div>

        {/* Tabs */}
        {/* Base rate reference */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {[1,2,3,4,5,6].map(g => (
            <span key={g} className="text-xs bg-white/10 text-slate-300 rounded px-2 py-1">
              G{g} base: <span className="font-bold text-yellow-300">{g}.0</span>
            </span>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {[{ id: "master", label: "📋 Master Ranking" }, { id: "suggested", label: "🗂️ Suggested Groups" }, { id: "misplaced", label: `⚠️ Misplaced (${misplaced.length})` }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                view === tab.id ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : (
          <>
            {/* Master Ranking View */}
            {view === "master" && (
              <Card className="shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">All Players — Ranked by Adjusted WR</CardTitle>
                  <p className="text-xs text-muted-foreground">Groups of 8. Top 8 = Group 1, next 8 = Group 2, etc.</p>
                </CardHeader>
                <CardContent className="space-y-1 p-3">
                  {ranked.map((p, i) => {
                   const isMisplaced = p.currentGroup !== p.suggestedGroup;
                   const isNewBand = i > 0 && ranked[i].suggestedGroup !== ranked[i-1].suggestedGroup;
                   const isExpanded = expandedPlayer === p.player;
                   return (
                     <div key={p.player}>
                       {isNewBand && (
                         <div className="border-t border-dashed border-slate-200 my-2 pt-1">
                           <p className="text-xs text-muted-foreground font-semibold">— Suggested Group {p.suggestedGroup} —</p>
                         </div>
                       )}
                       <div
                         className={`rounded-lg px-3 py-2 cursor-pointer ${isMisplaced ? "bg-orange-50 border border-orange-200" : "bg-slate-50"}`}
                         onClick={() => setExpandedPlayer(isExpanded ? null : p.player)}
                       >
                         <div className="flex items-center gap-3">
                           <span className="text-xs font-bold text-muted-foreground w-6">#{p.rank}</span>
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-semibold truncate">{p.player}</p>
                             <p className="text-xs text-muted-foreground">{p.gp} MP · {p.wins}W · {p.losses}L · Diff: {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                           </div>
                           <div className="text-right shrink-0 space-y-0.5">
                             <p className="text-sm font-bold text-yellow-600">{p.rating}</p>
                             <div className="flex items-center gap-1 justify-end">
                               <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${isMisplaced ? "bg-orange-200 text-orange-800" : "bg-slate-200 text-slate-700"}`}>
                                 G{p.currentGroup}
                               </span>
                               {isMisplaced && (
                                 <>
                                   <ArrowRight className="w-3 h-3 text-orange-500" />
                                   <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-green-200 text-green-800">
                                     G{p.suggestedGroup}
                                   </span>
                                 </>
                               )}
                             </div>
                           </div>
                           {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />}
                         </div>
                         {isExpanded && <RatingBreakdown p={p} />}
                       </div>
                     </div>
                   );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Suggested Groups View */}
            {view === "suggested" && (
              <div className="space-y-4">
                {suggestedGroups.map((players, idx) => {
                  if (players.length === 0) return null;
                  const ratings = players.map(p => p.rating);
                  const min = Math.min(...ratings);
                  const max = Math.max(...ratings);
                  return (
                    <Card key={idx} className="shadow-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Suggested Group {idx + 1}</span>
                          <span className="text-xs text-muted-foreground font-normal">Rating: {min} – {max}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 p-3">
                        {players.map((p, i) => {
                         const isMisplaced = p.currentGroup !== p.suggestedGroup;
                         const isExpanded = expandedPlayer === p.player;
                         return (
                           <div
                             key={p.player}
                             className={`rounded-lg px-3 py-2 cursor-pointer ${isMisplaced ? "bg-orange-50 border border-orange-200" : "bg-slate-50"}`}
                             onClick={() => setExpandedPlayer(isExpanded ? null : p.player)}
                           >
                             <div className="flex items-center gap-3">
                               <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                               <div className="flex-1 min-w-0">
                                 <p className="text-sm font-semibold truncate">{p.player}</p>
                                 <p className="text-xs text-muted-foreground">{p.gp} MP · rank #{p.rank} overall</p>
                               </div>
                               <div className="text-right shrink-0">
                                 <p className="text-sm font-bold text-yellow-600">{p.rating}</p>
                                 {isMisplaced ? (
                                   <span className="text-xs px-1.5 py-0.5 rounded bg-orange-200 text-orange-800 font-semibold">Currently G{p.currentGroup}</span>
                                 ) : (
                                   <p className="text-xs text-green-600 font-semibold">✓ Correct</p>
                                 )}
                               </div>
                               {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />}
                             </div>
                             {isExpanded && <RatingBreakdown p={p} />}
                           </div>
                         );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Misplaced Players View */}
            {view === "misplaced" && (
              <Card className="shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Players in Wrong Group
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Based on adjusted WR ranking, these players would benefit from a group change.</p>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {misplaced.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">All eligible players are in the correct group! 🎉</p>
                  ) : (
                    misplaced.map(p => (
                      <div key={p.player} className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{p.player}</p>
                          <p className="text-xs text-muted-foreground">Rank #{p.rank} · Rating {p.rating} · {p.gp} MP · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-700 font-semibold">Group {p.currentGroup}</span>
                          <ArrowRight className="w-4 h-4 text-orange-500" />
                          <span className="text-xs px-2 py-1 rounded bg-green-200 text-green-800 font-semibold">Group {p.suggestedGroup}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlayerPairingModal from "./PlayerPairingModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Loader2, TrendingUp, ChevronDown, ChevronUp, Info } from "lucide-react";
import RatingTrendChart from "./RatingTrendChart";

function RatingBreakdown({ p }) {
  if (!p.hasStats) {
    return (
      <div className="mt-2 bg-slate-100 rounded-lg p-3 text-xs text-slate-500">
        No round data recorded yet — using base group only.
        <br />Base Group = <strong>{p.currentGroup}</strong>
      </div>
    );
  }

  // Group rounds by year (round numbers don't have years, so group under "2026")
  // Rounds are just round numbers; label the season as current year
  const season = "2026";
  const rounds = p.rounds || [];

  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg overflow-hidden text-xs text-slate-700">
      {/* Season header */}
      <div className="bg-blue-200 px-3 py-1.5 font-bold text-blue-900 text-xs">{season} SEASON</div>

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-blue-100 text-slate-600">
            <th className="text-left px-2 py-1">Round</th>
            <th className="text-center px-2 py-1">Group</th>
            <th className="text-center px-2 py-1">GP</th>
            <th className="text-center px-2 py-1">Diff</th>
            <th className="text-center px-2 py-1">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
              <td className="px-2 py-1">Round {r.round}</td>
              <td className="text-center px-2 py-1">{r.group}</td>
              <td className="text-center px-2 py-1">{r.gp}</td>
              <td className="text-center px-2 py-1">{r.diff >= 0 ? "+" : ""}{r.diff}</td>
              <td className="text-center px-2 py-1 font-semibold">{r.sessionRating}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-200 font-bold text-blue-900">
            <td className="px-2 py-1" colSpan={2}>Total Games Played: {p.gp}</td>
            <td className="text-center px-2 py-1">{p.gp}</td>
            <td className="text-center px-2 py-1">{p.diff >= 0 ? "+" : ""}{p.diff}</td>
            <td className="text-center px-2 py-1 text-yellow-700">avg: {p.rating}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function OverallRankings({ groups }) {
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    base44.functions.invoke("getPlayerRatings", {})
      .then(res => setRatings(res.data?.players || []))
      .finally(() => setLoadingRatings(false));
  }, []);

  const risingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup > 1 && p.rating < p.currentGroup
  );

  const strugglingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup < 6 && p.rating > p.currentGroup
  );

  return (
    <>
    <div className="space-y-4">
      {/* Explainer */}
      <div className="bg-white border border-slate-200 rounded-xl shadow">
        <button
          onClick={() => setShowExplainer(!showExplainer)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <span>📊 How are ratings calculated?</span>
          {showExplainer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showExplainer && (
          <div className="px-4 pb-4 text-xs text-slate-600 space-y-3 border-t pt-3">
            <p><span className="font-bold">Formula (Veterans Method):</span> Each weekly session is treated as a separate tournament. Per session: <em>Session Rating = Group − (Diff ÷ GP ÷ 10)</em>. Final rating = weighted average of all session ratings, weighted by games played.</p>
            <p>A <span className="font-semibold">lower rating</span> means a stronger player. Base starts at your group number (e.g. Group 3 = 3.0).</p>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-700">Example — Alex in Group 3:</p>
              <p>• Week 1: 3 games, diff <strong>+6</strong> → 3 − (6÷3÷10) = <strong>2.80</strong></p>
              <p>• Week 2: 3 games, diff <strong>−3</strong> → 3 − (−3÷3÷10) = <strong>3.10</strong></p>
              <p>• Final: (2.80×3 + 3.10×3) ÷ 6 = <strong>2.95</strong></p>
            </div>
            <p className="text-slate-400 italic">Any player with at least one round of data receives a calculated rating.</p>
          </div>
        )}
      </div>
      {loadingRatings && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading ratings...
        </div>
      )}

      {/* All Player Rankings */}
      <Card className="shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">All Player Ratings</CardTitle>
          <div className="flex items-start gap-2 text-xs text-slate-400 mt-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
            <span>Rating = Group Base − Avg Point Diff per game ÷ 10. Tap a player to see breakdown.</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 p-3">
          {ratings.map((p, i) => {
            const isExpanded = expandedPlayer === p.player;
            return (
              <div
                key={p.player}
                className="rounded-lg px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedPlayer(isExpanded ? null : p.player)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.player}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.gp > 0 ? `${p.gp} MP · Diff ${p.diff >= 0 ? "+" : ""}${p.diff}` : "No games recorded"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className={`text-sm font-bold ${p.hasStats ? "text-yellow-600" : "text-slate-400"}`}>{p.rating}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
          <>
            <RatingBreakdown p={p} />
            <RatingTrendChart rounds={p.rounds} overallRating={p.rating} groupBase={p.currentGroup} />
          </>
        )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Rising Players */}
      {risingPlayers.length > 0 && (
        <Card className="shadow-2xl border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" /> Rising Players
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Players whose rating has crossed below their current group number — worth watching for promotion.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {risingPlayers.sort((a, b) => a.rating - b.rating).map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                <TrendingUp className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.gp} MP · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                  </div>
                  <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-yellow-700">Rating {p.rating}</p>
                  <p className="text-xs text-green-600 font-semibold">↑ Group {Math.ceil(p.rating)} territory</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Demotion Watch */}
      {strugglingPlayers.length > 0 && (
        <Card className="shadow-2xl border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-orange-500" /> Room for Improvement
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Players whose rating has risen above their current group number — may be better suited to a lower group.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {strugglingPlayers.sort((a, b) => b.rating - a.rating).map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <ArrowDown className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.gp} MP · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-orange-700">Rating {p.rating}</p>
                  <p className="text-xs text-orange-500 font-semibold">↓ Group {Math.floor(p.rating) + 1} territory</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
    {selectedPlayer && <PlayerPairingModal player={selectedPlayer} groupName={selectedGroup} onClose={() => setSelectedPlayer(null)} />}
    </>
  );
}
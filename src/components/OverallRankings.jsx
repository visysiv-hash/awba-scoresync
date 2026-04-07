import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlayerPairingModal from "./PlayerPairingModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Loader2, TrendingUp, ChevronDown, ChevronUp, Info } from "lucide-react";

function RatingBreakdown({ p }) {
  if (!p.hasStats) {
    return (
      <div className="mt-2 bg-slate-100 rounded-lg p-3 text-xs text-slate-500">
        Not enough games played (&lt;6 matches) — using weighted base rate only.
        <br />Weighted Base Rate = <strong>{p.currentGroup}</strong>
      </div>
    );
  }
  const diffPerGame = (p.diff / p.gp).toFixed(2);
  const adjustment = (p.diff / p.gp / 10).toFixed(2);
  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1 text-slate-700">
      <p className="font-semibold text-blue-700 mb-1">Rating Calculation</p>
      <p>Weighted Base Rate: <span className="font-bold">{p.currentGroup}</span> <span className="text-slate-400">(avg group weighted by games played)</span></p>
      <p>Total Point Diff: <span className="font-bold">{p.diff >= 0 ? "+" : ""}{p.diff}</span></p>
      <p>Total Games: <span className="font-bold">{p.gp}</span></p>
      <p>Diff per game: <span className="font-bold">{diffPerGame}</span></p>
      <p>Adjustment: <span className="font-bold">{adjustment}</span></p>
      <p className="border-t pt-1 font-bold text-blue-800">Rating = {p.currentGroup} − {adjustment} = {p.rating}</p>
      <p className="text-slate-500 italic">Lower rating = stronger player</p>
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
            <p><span className="font-bold">Formula:</span> Rating = Group Base − (Total Point Diff ÷ Games Played ÷ 10)</p>
            <p>A <span className="font-semibold">lower rating</span> means a stronger player. The base starts at your current group number (e.g. Group 3 = 3.0). Your average point differential per game shifts it up or down.</p>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-700">Example — Alex in Group 3:</p>
              <p>• Base rate: <strong>3.0</strong></p>
              <p>• 20 games played, total point diff: <strong>+40</strong></p>
              <p>• Avg diff per game: 40 ÷ 20 = <strong>2.0</strong></p>
              <p>• Adjustment: 2.0 ÷ 10 = <strong>0.20</strong></p>
              <p>• Rating: 3.0 − 0.20 = <strong>2.80</strong> → performing at Group 2 level 🔥</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-slate-700">Example — Jordan in Group 2:</p>
              <p>• Base rate: <strong>2.0</strong></p>
              <p>• 15 games played, total point diff: <strong>−30</strong></p>
              <p>• Avg diff per game: −30 ÷ 15 = <strong>−2.0</strong></p>
              <p>• Adjustment: −2.0 ÷ 10 = <strong>−0.20</strong></p>
              <p>• Rating: 2.0 − (−0.20) = <strong>2.20</strong> → drifting into Group 3 territory</p>
            </div>
            <p className="text-slate-400 italic">Players need at least 6 games before a rating adjustment is applied.</p>
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
          <CardTitle className="text-sm flex items-center gap-2">All Player Rankings</CardTitle>
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
                      Group {p.currentGroup || "?"} · {p.hasStats ? `${p.gp} MP · Diff ${p.diff >= 0 ? "+" : ""}${p.diff}` : "< 6 games"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className={`text-sm font-bold ${p.hasStats ? "text-yellow-600" : "text-slate-400"}`}>{p.rating}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && <RatingBreakdown p={p} />}
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
                  <p className="text-xs text-muted-foreground">Currently Group {p.currentGroup} · {p.gp} games · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
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
                  <p className="text-xs text-muted-foreground">Currently Group {p.currentGroup} · {p.gp} games · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
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
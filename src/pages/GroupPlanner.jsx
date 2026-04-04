import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ChevronDown, ChevronUp, Info } from "lucide-react";

function RatingBreakdown({ p }) {
  if (!p.hasStats) {
    return (
      <div className="mt-2 bg-slate-100 rounded-lg p-3 text-xs text-slate-500">
        Not enough games played (&lt;6 matches) — using base rate only.
        <br />Rating = Group {p.currentGroup} base rate = <strong>{p.currentGroup}.0</strong>
      </div>
    );
  }
  const diffPerGame = (p.diff / p.gp).toFixed(2);
  const adjustment = (p.diff / p.gp / 10).toFixed(2);
  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1 text-slate-700">
      <p className="font-semibold text-blue-700 mb-1">Rating Calculation</p>
      <p>Base Rate (Suggested Group {p.currentGroup}): <span className="font-bold">{p.currentGroup}.0</span></p>
      <p>Total Point Diff (all groups): <span className="font-bold">{p.diff >= 0 ? "+" : ""}{p.diff}</span></p>
      <p>Total Games Played: <span className="font-bold">{p.gp}</span></p>
      <p>Diff per game: {p.diff} ÷ {p.gp} = <span className="font-bold">{diffPerGame}</span></p>
      <p>Adjustment: {diffPerGame} ÷ 10 = <span className="font-bold">{adjustment}</span></p>
      <p className="border-t pt-1 font-bold text-blue-800">
        Rating = {p.currentGroup}.0 − {adjustment} = {p.rating}
      </p>
      <p className="text-slate-500 italic">Lower rating = stronger player</p>
    </div>
  );
}

export default function GroupPlanner() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getPlayerRatings", {})
      .then(res => {
        setPlayers(res.data?.players || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Users className="w-6 h-6 text-yellow-400" /> Player Rankings
          </h1>
          <p className="text-slate-400 text-sm mt-1">Sorted by rating — lower = stronger</p>
          <div className="mt-2 bg-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 flex items-start gap-2">
            <Info className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
            <span>Rating = Group Base (1–6) − Avg Point Diff per game ÷ 10. Tap a player to see the breakdown.</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : error ? (
          <Card><CardContent className="py-8 text-center text-red-500 text-sm">{error}</CardContent></Card>
        ) : (
          <Card className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{players.length} Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3">
              {players.map((p, i) => {
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
                        <span className={`text-sm font-bold ${p.hasStats ? "text-yellow-600" : "text-slate-400"}`}>
                          {p.rating}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>
                    {isExpanded && <RatingBreakdown p={p} />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
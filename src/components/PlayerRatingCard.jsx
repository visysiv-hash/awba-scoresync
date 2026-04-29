import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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

  const season = "2026";
  const rounds = p.rounds || [];
  const hasOverride = p.ratingBaseGroup != null;

  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg overflow-hidden text-xs text-slate-700">
      <div className="bg-blue-200 px-3 py-1.5 font-bold text-blue-900 text-xs flex items-center justify-between">
        <span>{season} SEASON</span>
        {hasOverride && <span className="text-orange-600 font-semibold">* Base overridden → Group {p.ratingBaseGroup}</span>}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-blue-100 text-slate-600">
            <th className="text-left px-2 py-1">Round</th>
            <th className="text-center px-2 py-1">Own Grp</th>
            <th className="text-center px-2 py-1">Base Used</th>
            <th className="text-center px-2 py-1">MP</th>
            <th className="text-center px-2 py-1">Diff</th>
            <th className="text-left px-2 py-1">Calculation</th>
            <th className="text-center px-2 py-1">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r, i) => {
            const base = r.base;
            const hasStrengthAdj = r.adjustedDiff != null && r.adjustedDiff !== r.diff;
            const diffUsed = r.adjustedDiff ?? r.diff;
            const calc = `${base} − (${diffUsed >= 0 ? "+" : ""}${diffUsed} ÷ ${r.gp * 2} ÷ 30) = ${r.sessionRating}`;
            return (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                <td className="px-2 py-1">Round {r.round}</td>
                <td className="text-center px-2 py-1">{r.group}</td>
                <td className="text-center px-2 py-1">
                  <span className={r.isMixed ? "text-purple-600 font-semibold" : ""}>
                    {base}
                  </span>
                  {r.isMixed && <span className="ml-1 text-purple-400" title="Mixed group pairing — team avg used">⚡</span>}
                </td>
                <td className="text-center px-2 py-1">{r.gp}</td>
                <td className="text-center px-2 py-1">
                  {r.diff >= 0 ? "+" : ""}{r.diff}
                  {hasStrengthAdj && (
                    <span className="ml-1 text-green-600 font-semibold" title="Strength-adjusted diff">
                      →{diffUsed >= 0 ? "+" : ""}{diffUsed}⚖️
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 text-slate-400 font-mono">{calc}</td>
                <td className="text-center px-2 py-1 font-semibold">{r.sessionRating}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-blue-200 font-bold text-blue-900">
            <td className="px-2 py-1" colSpan={2}>Total MP: {p.gp}</td>
            <td className="text-center px-2 py-1">{p.gp}</td>
            <td className="text-center px-2 py-1">{p.diff >= 0 ? "+" : ""}{p.diff}</td>
            <td className="px-2 py-1"></td>
            <td className="text-center px-2 py-1 text-yellow-700">avg: {p.baseRating}</td>
          </tr>

        </tfoot>
      </table>
    </div>
  );
}

export default function PlayerRatingCard({ playerName }) {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPlayerData(null);
    base44.functions.invoke("getPlayerRatings", {})
      .then(res => {
        const players = res.data?.players || [];
        const found = players.find(p => p.player.toLowerCase() === playerName.toLowerCase());
        setPlayerData(found || null);
      })
      .finally(() => setLoading(false));
  }, [playerName]);

  if (loading) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading rating...
        </CardContent>
      </Card>
    );
  }

  if (!playerData) return null;

  return (
    <Card className="shadow-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Rating</span>
          <span className={`text-2xl font-bold ${playerData.hasStats ? "text-yellow-600" : "text-slate-400"}`}>
            {playerData.rating}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Group {playerData.currentGroup} · {playerData.gp} MP · Diff {playerData.diff >= 0 ? "+" : ""}{playerData.diff}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <RatingTrendChart rounds={playerData.rounds} overallRating={playerData.rating} groupBase={playerData.currentGroup} />

        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
        >
          <span>Round-by-round breakdown</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && <RatingBreakdown p={playerData} />}
      </CardContent>
    </Card>
  );
}
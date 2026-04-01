import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, TrendingUp, ArrowUpCircle } from "lucide-react";

const MIN_MATCHES = 6;
const DOMINATE_WIN_RATE = 70;

function getGroupNumber(groupName) {
  const match = groupName.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function calcScore(row, allDiffs) {
  const gp = Number(row.gp) || 0;
  if (gp === 0) return 0;
  const winRate = (Number(row.wins) / gp) * 100;
  const diff = Number(row.diff) || 0;
  const ladderPts = Number(row.ladderPts) || 0;

  // Normalize diff across all players (-100 to 100 → 0 to 100)
  const maxDiff = Math.max(...allDiffs.map(Math.abs), 1);
  const normDiff = ((diff / maxDiff) + 1) * 50;

  return (winRate * 0.5) + (normDiff * 0.3) + (Math.min(ladderPts, 100) * 0.2);
}

export default function OverallRankings({ groups }) {
  // Flatten all players, keep best row per player (most matches)
  const playerMap = {};
  Object.entries(groups).forEach(([groupName, rows]) => {
    rows.forEach(row => {
      const key = row.player?.toLowerCase();
      if (!key) return;
      const existing = playerMap[key];
      if (!existing || Number(row.gp) > Number(existing.gp)) {
        playerMap[key] = { ...row, groupName };
      }
    });
  });

  const allPlayers = Object.values(playerMap);
  const allDiffs = allPlayers.map(p => Number(p.diff) || 0);

  const ranked = allPlayers
    .map(p => {
      const gp = Number(p.gp) || 0;
      const wins = Number(p.wins) || 0;
      const winRate = gp > 0 ? Math.round((wins / gp) * 100) : 0;
      const score = calcScore(p, allDiffs);
      const groupNum = getGroupNumber(p.groupName);
      const isDominating = gp >= MIN_MATCHES && winRate >= DOMINATE_WIN_RATE;
      const promoteTo = isDominating && groupNum > 1 ? `Group ${groupNum - 1}` : null;
      return { ...p, gp, wins, winRate, score, groupNum, isDominating, promoteTo };
    })
    .filter(p => p.gp > 0)
    .sort((a, b) => b.score - a.score);

  const dominatingPlayers = ranked.filter(p => p.isDominating);

  return (
    <div className="space-y-4">
      {/* Promotion Alerts */}
      {dominatingPlayers.length > 0 && (
        <Card className="shadow-2xl border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <ArrowUpCircle className="w-5 h-5" /> Promotion Candidates
            </CardTitle>
            <p className="text-xs text-orange-600">Players dominating their group (≥{MIN_MATCHES} matches, ≥{DOMINATE_WIN_RATE}% win rate)</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {dominatingPlayers.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                <div>
                  <p className="font-semibold text-sm">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.groupName} · {p.wins}W / {p.gp}MP · {p.winRate}% WR</p>
                </div>
                {p.promoteTo && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> → {p.promoteTo}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overall Rankings Table */}
      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Overall Rankings</CardTitle>
          <p className="text-xs text-muted-foreground">Composite score: Win Rate (50%) + Point Diff (30%) + Ladder Pts (20%)</p>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
          ) : (
            <div className="space-y-2">
              {ranked.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${p.isDominating ? "bg-orange-50 border border-orange-100" : "bg-slate-50"}`}>
                  <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold truncate">{p.player}</p>
                      {p.isDominating && <Flame className="w-3 h-3 text-orange-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.groupName} · {p.gp} MP</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-purple-600">{p.winRate}%</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="text-right shrink-0 w-12">
                    <p className={`text-sm font-bold ${Number(p.diff) >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {Number(p.diff) >= 0 ? "+" : ""}{p.diff}
                    </p>
                    <p className="text-xs text-muted-foreground">Diff</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
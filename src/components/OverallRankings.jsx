import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

const MIN_MATCHES = 6;
const PROMOTE_WIN_RATE = 70;  // dominating → move UP (to harder group)
const RELEGATE_WIN_RATE = 30; // struggling → move DOWN (to easier group)

function getGroupNumber(groupName) {
  const match = groupName.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function getSuggestion(winRate, gp, groupNum) {
  if (gp < MIN_MATCHES) return { type: "none", label: "Insufficient data" };
  if (winRate >= PROMOTE_WIN_RATE && groupNum > 1)
    return { type: "up", label: `Move to Group ${groupNum - 1}` };
  if (winRate <= RELEGATE_WIN_RATE && groupNum < 6)
    return { type: "down", label: `Move to Group ${groupNum + 1}` };
  return { type: "stay", label: "Stay" };
}

export default function OverallRankings({ groups }) {
  const GROUP_NAMES = [
    "Group 1 Leaderboard",
    "Group 2 Leaderboard",
    "Group 3 Leaderboard",
    "Group 4 Leaderboard",
    "Group 5 Leaderboard",
    "Group 6 Leaderboard",
  ];

  const promotions = [];
  const relegations = [];

  return (
    <div className="space-y-4">
      {/* Summary of moves */}
      {GROUP_NAMES.map(groupName => {
        const rows = groups[groupName] || [];
        const groupNum = getGroupNumber(groupName);
        const sorted = [...rows]
          .filter(r => Number(r.gp) > 0)
          .sort((a, b) => {
            const gpA = Number(a.gp), gpB = Number(b.gp);
            const wrA = gpA > 0 ? Number(a.wins) / gpA : 0;
            const wrB = gpB > 0 ? Number(b.wins) / gpB : 0;
            return wrB - wrA;
          });

        sorted.forEach(r => {
          const gp = Number(r.gp);
          const wr = gp > 0 ? Math.round((Number(r.wins) / gp) * 100) : 0;
          const s = getSuggestion(wr, gp, groupNum);
          if (s.type === "up") promotions.push({ ...r, groupName, winRate: wr, suggestion: s });
          if (s.type === "down") relegations.push({ ...r, groupName, winRate: wr, suggestion: s });
        });

        return null; // just collecting data
      })}

      {/* Promotion candidates */}
      {promotions.length > 0 && (
        <Card className="shadow-2xl border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <ArrowUp className="w-4 h-4" /> Move Up — Dominating Their Group
            </CardTitle>
            <p className="text-xs text-green-600">≥{MIN_MATCHES} matches · ≥{PROMOTE_WIN_RATE}% win rate</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {promotions.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-100">
                <div>
                  <p className="font-semibold text-sm">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.groupName} · {p.wins}W/{p.gp}MP · {p.winRate}% WR · Diff: {Number(p.diff) >= 0 ? "+" : ""}{p.diff}</p>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                  <ArrowUp className="w-3 h-3" /> {p.suggestion.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Relegation candidates */}
      {relegations.length > 0 && (
        <Card className="shadow-2xl border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <ArrowDown className="w-4 h-4" /> Move Down — Struggling in Their Group
            </CardTitle>
            <p className="text-xs text-red-600">≥{MIN_MATCHES} matches · ≤{RELEGATE_WIN_RATE}% win rate</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {relegations.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                <div>
                  <p className="font-semibold text-sm">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.groupName} · {p.wins}W/{p.gp}MP · {p.winRate}% WR · Diff: {Number(p.diff) >= 0 ? "+" : ""}{p.diff}</p>
                </div>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                  <ArrowDown className="w-3 h-3" /> {p.suggestion.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {promotions.length === 0 && relegations.length === 0 && (
        <Card className="shadow-2xl">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No movement suggestions yet — players need ≥{MIN_MATCHES} matches to qualify.
          </CardContent>
        </Card>
      )}

      {/* Per-group breakdown */}
      {GROUP_NAMES.map(groupName => {
        const rows = groups[groupName] || [];
        const groupNum = getGroupNumber(groupName);
        const sorted = [...rows]
          .filter(r => Number(r.gp) > 0)
          .sort((a, b) => {
            const gpA = Number(a.gp), gpB = Number(b.gp);
            const wrA = gpA > 0 ? Number(a.wins) / gpA : 0;
            const wrB = gpB > 0 ? Number(b.wins) / gpB : 0;
            return wrB - wrA;
          });

        if (sorted.length === 0) return null;

        return (
          <Card key={groupName} className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sorted.map((r, i) => {
                const gp = Number(r.gp);
                const wr = gp > 0 ? Math.round((Number(r.wins) / gp) * 100) : 0;
                const s = getSuggestion(wr, gp, groupNum);
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    s.type === "up" ? "bg-green-50 border border-green-100" :
                    s.type === "down" ? "bg-red-50 border border-red-100" : "bg-slate-50"
                  }`}>
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.player}</p>
                      <p className="text-xs text-muted-foreground">{gp} MP · {r.wins}W · {r.losses}L · Diff: {Number(r.diff) >= 0 ? "+" : ""}{r.diff}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${wr >= PROMOTE_WIN_RATE ? "text-green-600" : wr <= RELEGATE_WIN_RATE ? "text-red-500" : "text-slate-700"}`}>
                        {wr}%
                      </p>
                      <p className="text-xs text-muted-foreground">WR</p>
                    </div>
                    <div className="shrink-0">
                      {s.type === "up" && <ArrowUp className="w-4 h-4 text-green-600" />}
                      {s.type === "down" && <ArrowDown className="w-4 h-4 text-red-500" />}
                      {s.type === "stay" && <Minus className="w-4 h-4 text-slate-400" />}
                      {s.type === "none" && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
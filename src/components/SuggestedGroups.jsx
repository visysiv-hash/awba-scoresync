import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

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

function groupAvg(players) {
  const ratedPlayers = players.filter(p => p.rating !== null);
  if (ratedPlayers.length === 0) return null;
  return parseFloat((ratedPlayers.reduce((s, p) => s + p.rating, 0) / ratedPlayers.length).toFixed(2));
}

export default function SuggestedGroups({ players }) {
  const groups = useMemo(() => buildGroups(players), [players]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 text-center">
        {players.length} players → {groups.length} group{groups.length !== 1 ? "s" : ""} of ~8
      </p>
      {groups.map(({ groupNum, players: gPlayers }) => {
        const avg = groupAvg(gPlayers);
        const preferred = groupNum;
        const acceptable = groupNum + 1;
        const isPreferred = avg !== null && avg <= preferred;
        const isAcceptable = avg !== null && avg <= acceptable;
        const status = isPreferred ? "preferred" : isAcceptable ? "acceptable" : "over";

        return (
          <Card key={groupNum} className="bg-slate-800 border-slate-700 text-white shadow">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="font-bold text-yellow-400">Group {groupNum}</span>
                <div className="flex items-center gap-2">
                  {avg !== null && (
                    <span className="text-xs text-slate-400">avg rating: <span className="font-bold text-white">{avg}</span></span>
                  )}
                  {status === "preferred" && (
                    <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Group {groupNum} standard
                    </span>
                  )}
                  {status === "acceptable" && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Acceptable
                    </span>
                  )}
                  {status === "over" && (
                    <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Above threshold
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {gPlayers.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate">{i + 1}. {p.name}</span>
                    <span className={`font-bold ml-2 shrink-0 ${p.hasStats ? "text-yellow-400" : "text-slate-500"}`}>
                      {p.rating !== null ? p.rating : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
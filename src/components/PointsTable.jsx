import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronUp, ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { key: "pointsFor", label: "Pts For" },
  { key: "pointsAgainst", label: "Pts Against" },
  { key: "diff", label: "Diff" },
  { key: "wins", label: "Wins" },
  { key: "gp", label: "GP" },
];

export default function PointsTable({ groups }) {
  const [sortKey, setSortKey] = useState("pointsFor");
  const [sortDir, setSortDir] = useState("desc");

  // Merge all players across groups, summing their points
  const players = useMemo(() => {
    const map = {};
    for (const rows of Object.values(groups)) {
      for (const r of rows) {
        const name = r.player;
        if (!name) continue;
        if (!map[name]) {
          map[name] = { player: name, gp: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 };
        }
        map[name].gp += Number(r.gp) || 0;
        map[name].wins += Number(r.wins) || 0;
        map[name].losses += Number(r.losses) || 0;
        map[name].pointsFor += Number(r.pointsFor) || 0;
        map[name].pointsAgainst += Number(r.pointsAgainst) || 0;
        map[name].diff += Number(r.diff) || 0;
      }
    }
    return Object.values(map).filter(p => p.gp > 0);
  }, [groups]);

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [players, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 text-yellow-400" />
      : <ChevronUp className="w-3 h-3 text-yellow-400" />;
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Points Table — All Rounds Combined</CardTitle>
        <p className="text-xs text-muted-foreground">Tap a column header to sort. Points are summed across all groups.</p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs">
              <th className="text-left px-3 py-2 sticky left-0 bg-slate-100">#</th>
              <th className="text-left px-3 py-2 sticky left-5 bg-slate-100 min-w-[120px]">Player</th>
              {SORT_OPTIONS.map(opt => (
                <th
                  key={opt.key}
                  className="px-3 py-2 text-center cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                  onClick={() => handleSort(opt.key)}
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    {opt.label} <SortIcon k={opt.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.player} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-3 py-2 text-xs font-bold text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2 font-semibold text-slate-800 min-w-[120px]">{p.player}</td>
                <td className={`px-3 py-2 text-center font-bold ${sortKey === "pointsFor" ? "text-blue-600" : ""}`}>{p.pointsFor}</td>
                <td className={`px-3 py-2 text-center ${sortKey === "pointsAgainst" ? "font-bold text-slate-600" : "text-muted-foreground"}`}>{p.pointsAgainst}</td>
                <td className={`px-3 py-2 text-center font-semibold ${p.diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {p.diff >= 0 ? "+" : ""}{p.diff}
                </td>
                <td className={`px-3 py-2 text-center text-green-600 ${sortKey === "wins" ? "font-bold" : ""}`}>{p.wins}</td>
                <td className={`px-3 py-2 text-center ${sortKey === "gp" ? "font-bold text-slate-700" : "text-muted-foreground"}`}>{p.gp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
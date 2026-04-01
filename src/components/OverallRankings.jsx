import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const MIN_MATCHES = 6;

const GROUP_NAMES = [
  "Group 1 Leaderboard",
  "Group 2 Leaderboard",
  "Group 3 Leaderboard",
  "Group 4 Leaderboard",
  "Group 5 Leaderboard",
  "Group 6 Leaderboard",
];

function winRate(row) {
  const gp = Number(row.gp) || 0;
  return gp > 0 ? Math.round((Number(row.wins) / gp) * 100) : 0;
}

function sortedByWinRate(rows) {
  return [...rows]
    .filter(r => Number(r.gp) >= MIN_MATCHES)
    .sort((a, b) => winRate(b) - winRate(a));
}

export default function OverallRankings({ groups }) {
  // Build swap recommendations between adjacent groups
  const swaps = [];

  for (let i = 0; i < GROUP_NAMES.length - 1; i++) {
    const upperGroupName = GROUP_NAMES[i];     // e.g. Group 1 (harder)
    const lowerGroupName = GROUP_NAMES[i + 1]; // e.g. Group 2 (easier)

    const upperSorted = sortedByWinRate(groups[upperGroupName] || []);
    const lowerSorted = sortedByWinRate(groups[lowerGroupName] || []);

    if (upperSorted.length === 0 || lowerSorted.length === 0) continue;

    // Bottom of upper group
    const bottomUpper = upperSorted[upperSorted.length - 1];
    // Top of lower group
    const topLower = lowerSorted[0];

    const bottomWR = winRate(bottomUpper);
    const topWR = winRate(topLower);

    // Only suggest swap if lower group top outperforms upper group bottom
    if (topWR > bottomWR) {
      swaps.push({
        upperGroup: upperGroupName,
        lowerGroup: lowerGroupName,
        moveDown: bottomUpper,
        moveDownWR: bottomWR,
        moveUp: topLower,
        moveUpWR: topWR,
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Swap Recommendations */}
      <Card className="shadow-2xl border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-blue-700">
            <ArrowUpDown className="w-4 h-4" /> Recommended Group Swaps
          </CardTitle>
          <p className="text-xs text-blue-600">Players eligible need ≥{MIN_MATCHES} matches played</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {swaps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No swaps recommended yet — not enough data or standings are balanced.
            </p>
          ) : (
            swaps.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-blue-100 p-3 space-y-2">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">
                  {s.upperGroup.replace(" Leaderboard", "")} ↔ {s.lowerGroup.replace(" Leaderboard", "")}
                </p>
                {/* Move Down */}
                <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                  <div>
                    <div className="flex items-center gap-1">
                      <ArrowDown className="w-3 h-3 text-red-500" />
                      <p className="text-sm font-semibold text-red-700">{s.moveDown.player}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently in {s.upperGroup.replace(" Leaderboard", "")} · {s.moveDown.wins}W/{s.moveDown.gp}MP · {s.moveDownWR}% WR
                    </p>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full shrink-0">
                    → {s.lowerGroup.replace(" Leaderboard", "")}
                  </span>
                </div>
                {/* Move Up */}
                <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                  <div>
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-3 h-3 text-green-600" />
                      <p className="text-sm font-semibold text-green-700">{s.moveUp.player}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently in {s.lowerGroup.replace(" Leaderboard", "")} · {s.moveUp.wins}W/{s.moveUp.gp}MP · {s.moveUpWR}% WR
                    </p>
                  </div>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full shrink-0">
                    → {s.upperGroup.replace(" Leaderboard", "")}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Per-group standings for context */}
      {GROUP_NAMES.map(groupName => {
        const rows = groups[groupName] || [];
        const eligible = sortedByWinRate(rows);
        const ineligible = rows.filter(r => Number(r.gp) < MIN_MATCHES);

        if (rows.length === 0) return null;

        return (
          <Card key={groupName} className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {eligible.map((r, i) => {
                const wr = winRate(r);
                const isTop = i === 0;
                const isBottom = i === eligible.length - 1;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    isTop ? "bg-green-50 border border-green-100" :
                    isBottom ? "bg-red-50 border border-red-100" : "bg-slate-50"
                  }`}>
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.player}</p>
                      <p className="text-xs text-muted-foreground">{r.gp} MP · {r.wins}W · {r.losses}L · Diff: {Number(r.diff) >= 0 ? "+" : ""}{r.diff}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${wr >= 70 ? "text-green-600" : wr <= 30 ? "text-red-500" : "text-slate-700"}`}>
                        {wr}%
                      </p>
                      <p className="text-xs text-muted-foreground">WR</p>
                    </div>
                    {isTop && <ArrowUp className="w-4 h-4 text-green-500 shrink-0" />}
                    {isBottom && <ArrowDown className="w-4 h-4 text-red-400 shrink-0" />}
                  </div>
                );
              })}
              {ineligible.length > 0 && (
                <p className="text-xs text-muted-foreground px-3 pt-1">
                  +{ineligible.length} player(s) with &lt;{MIN_MATCHES} matches (not eligible)
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
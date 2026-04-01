import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const MIN_MATCHES = 6;

function getGroupNumber(groupName) {
  const match = groupName.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function winRate(row) {
  const gp = Number(row.gp);
  return gp > 0 ? Math.round((Number(row.wins) / gp) * 100) : 0;
}

function PlayerCard({ player, groupName, arrow }) {
  const gp = Number(player.gp);
  const wr = winRate(player);
  return (
    <div className={`flex-1 rounded-lg p-3 border ${arrow === "up" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-1 mb-1">
        {arrow === "up"
          ? <ArrowUp className="w-3 h-3 text-green-600" />
          : <ArrowDown className="w-3 h-3 text-red-500" />}
        <span className="text-xs text-muted-foreground">{groupName}</span>
      </div>
      <p className="font-bold text-sm">{player.player}</p>
      <p className="text-xs text-muted-foreground">{gp} MP · {player.wins}W · {wr}% WR · Diff: {Number(player.diff) >= 0 ? "+" : ""}{player.diff}</p>
    </div>
  );
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

  // For each group, sort eligible players by win rate
  const groupRanked = {};
  GROUP_NAMES.forEach(name => {
    groupRanked[name] = (groups[name] || [])
      .filter(r => Number(r.gp) >= MIN_MATCHES)
      .sort((a, b) => winRate(b) - winRate(a));
  });

  // Build swap suggestions between adjacent groups
  const swaps = [];
  for (let i = 0; i < GROUP_NAMES.length - 1; i++) {
    const harderGroup = GROUP_NAMES[i];     // e.g. Group 1 (tougher)
    const easierGroup = GROUP_NAMES[i + 1]; // e.g. Group 2 (easier)

    const harderPlayers = groupRanked[harderGroup];
    const easierPlayers = groupRanked[easierGroup];

    if (harderPlayers.length === 0 || easierPlayers.length === 0) continue;

    // Worst in harder group = last in sorted list
    const worstInHarder = harderPlayers[harderPlayers.length - 1];
    // Best in easier group = first in sorted list
    const bestInEasier = easierPlayers[0];

    const wrWorse = winRate(worstInHarder);
    const wrBetter = winRate(bestInEasier);

    // Only suggest if the easier group top player is clearly outperforming the harder group bottom
    if (wrBetter > wrWorse) {
      swaps.push({
        harderGroup,
        easierGroup,
        moveDown: worstInHarder, // moves from harder → easier
        moveUp: bestInEasier,    // moves from easier → harder
        wrWorse,
        wrBetter,
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> Suggested Group Swaps
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Players eligible if they've played ≥{MIN_MATCHES} matches. Best from lower group replaces worst from upper group.
          </p>
        </CardHeader>
      </Card>

      {swaps.length === 0 ? (
        <Card className="shadow-2xl">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No swap suggestions yet — not enough eligible players (need ≥{MIN_MATCHES} matches).
          </CardContent>
        </Card>
      ) : (
        swaps.map((swap, i) => (
          <Card key={i} className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                {swap.harderGroup} ↔ {swap.easierGroup}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-center">
                <PlayerCard player={swap.moveDown} groupName={swap.harderGroup} arrow="down" />
                <div className="text-center shrink-0">
                  <ArrowUpDown className="w-5 h-5 text-slate-400 mx-auto" />
                  <p className="text-xs text-muted-foreground mt-1">Swap</p>
                </div>
                <PlayerCard player={swap.moveUp} groupName={swap.easierGroup} arrow="up" />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                <span className="text-red-500 font-semibold">{swap.moveDown.player}</span> ({swap.wrWorse}% WR) moves to {swap.easierGroup} ·{" "}
                <span className="text-green-600 font-semibold">{swap.moveUp.player}</span> ({swap.wrBetter}% WR) moves to {swap.harderGroup}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {/* Per-group standings for reference */}
      {GROUP_NAMES.map(groupName => {
        const ranked = groupRanked[groupName];
        const all = (groups[groupName] || []).filter(r => Number(r.gp) > 0).sort((a, b) => winRate(b) - winRate(a));
        if (all.length === 0) return null;
        return (
          <Card key={groupName} className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {all.map((r, i) => {
                const gp = Number(r.gp);
                const wr = winRate(r);
                const eligible = gp >= MIN_MATCHES;
                return (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.player}</p>
                      <p className="text-xs text-muted-foreground">{gp} MP · {r.wins}W · {r.losses}L · Diff: {Number(r.diff) >= 0 ? "+" : ""}{r.diff}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${wr >= 70 ? "text-green-600" : wr <= 30 ? "text-red-500" : "text-slate-700"}`}>{wr}%</p>
                      <p className="text-xs text-muted-foreground">{eligible ? "WR" : "< 6 MP"}</p>
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
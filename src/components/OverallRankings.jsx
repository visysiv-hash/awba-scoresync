import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";

const MIN_MATCHES = 6;

function getGroupNumber(groupName) {
  const match = groupName.match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function winRate(row) {
  const gp = Number(row.gp);
  return gp > 0 ? Math.round((Number(row.wins) / gp) * 100) : 0;
}

function PlayerCard({ player, groupName, arrow, adjStats }) {
  const gp = Number(player.gp);
  const wr = winRate(player);
  const adj = adjStats?.[player.player];
  return (
    <div className={`flex-1 rounded-lg p-3 border ${arrow === "up" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-1 mb-1">
        {arrow === "up"
          ? <ArrowUp className="w-3 h-3 text-green-600" />
          : <ArrowDown className="w-3 h-3 text-red-500" />}
        <span className="text-xs text-muted-foreground">{groupName.replace(" Leaderboard", "")}</span>
      </div>
      <p className="font-bold text-sm">{player.player}</p>
      <p className="text-xs text-muted-foreground">{gp} MP · {player.wins}W · {wr}% WR</p>
      {adj && (
        <div className="mt-1 text-xs">
          <span className="font-semibold text-purple-700">{adj.adjustedWR}% adj. WR</span>
          <span className="text-muted-foreground ml-1">(partner avg: {adj.avgPartnerWR}%)</span>
        </div>
      )}
    </div>
  );
}

export default function OverallRankings({ groups }) {
  const [adjStats, setAdjStats] = useState(null);
  const [loadingAdj, setLoadingAdj] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getPartnerAdjustedStats", {})
      .then(res => setAdjStats(res.data?.adjusted || {}))
      .finally(() => setLoadingAdj(false));
  }, []);

  const GROUP_NAMES = [
    "Group 1 Leaderboard",
    "Group 2 Leaderboard",
    "Group 3 Leaderboard",
    "Group 4 Leaderboard",
    "Group 5 Leaderboard",
    "Group 6 Leaderboard",
  ];

  // Helper: get adjusted WR if available, else raw win rate
  const effectiveWR = (row) => {
    if (adjStats && adjStats[row.player] !== undefined) return adjStats[row.player].adjustedWR;
    return winRate(row);
  };

  const groupRanked = {};
  GROUP_NAMES.forEach(name => {
    groupRanked[name] = (groups[name] || [])
      .filter(r => Number(r.gp) >= MIN_MATCHES)
      .sort((a, b) => effectiveWR(b) - effectiveWR(a));
  });

  // Build swap suggestions between adjacent groups (multiple per pair)
  const swapGroups = [];
  for (let i = 0; i < GROUP_NAMES.length - 1; i++) {
    const harderGroup = GROUP_NAMES[i];
    const easierGroup = GROUP_NAMES[i + 1];

    const harderPlayers = groupRanked[harderGroup];
    const easierPlayers = groupRanked[easierGroup];

    if (harderPlayers.length === 0 || easierPlayers.length === 0) continue;

    const pairs = [];
    // Compare from the bottom of harder group vs top of easier group
    const maxPairs = Math.min(harderPlayers.length, easierPlayers.length);
    for (let j = 0; j < maxPairs; j++) {
      const candidate = harderPlayers[harderPlayers.length - 1 - j]; // worst first
      const challenger = easierPlayers[j]; // best first
      const wrCandidate = effectiveWR(candidate);
      const wrChallenger = effectiveWR(challenger);
      if (wrChallenger > wrCandidate) {
        pairs.push({ moveDown: candidate, moveUp: challenger, wrCandidate, wrChallenger });
      }
    }

    if (pairs.length > 0) {
      swapGroups.push({ harderGroup, easierGroup, pairs });
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
            Rankings are partner-adjusted: win rate is corrected based on whether partners were stronger or weaker than the league average.
            Players eligible if they've played ≥{MIN_MATCHES} matches.
          </p>
          {loadingAdj && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading partner stats...</div>}
        </CardHeader>
      </Card>

      {swapGroups.length === 0 ? (
        <Card className="shadow-2xl">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No swap suggestions yet — not enough eligible players (need ≥{MIN_MATCHES} matches).
          </CardContent>
        </Card>
      ) : (
        swapGroups.map((sg, i) => (
          <Card key={i} className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {sg.harderGroup.replace(" Leaderboard", "")} ↔ {sg.easierGroup.replace(" Leaderboard", "")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sg.pairs.map((pair, j) => (
                <div key={j}>
                  {sg.pairs.length > 1 && (
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Swap {j + 1}</p>
                  )}
                  <div className="flex gap-3 items-center">
                    <PlayerCard player={pair.moveDown} groupName={sg.harderGroup} arrow="down" adjStats={adjStats} />
                    <div className="text-center shrink-0">
                      <ArrowUpDown className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">Swap</p>
                    </div>
                    <PlayerCard player={pair.moveUp} groupName={sg.easierGroup} arrow="up" adjStats={adjStats} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    <span className="text-red-500 font-semibold">{pair.moveDown.player}</span> ({pair.wrCandidate}% adj. WR) → {sg.easierGroup.replace(" Leaderboard", "")} ·{" "}
                    <span className="text-green-600 font-semibold">{pair.moveUp.player}</span> ({pair.wrChallenger}% adj. WR) → {sg.harderGroup.replace(" Leaderboard", "")}
                  </p>
                </div>
              ))}
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
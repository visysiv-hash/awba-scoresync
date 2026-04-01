import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, Info } from "lucide-react";

const MIN_MATCHES = 6;

const GROUP_NAMES = [
  "Group 1 Leaderboard",
  "Group 2 Leaderboard",
  "Group 3 Leaderboard",
  "Group 4 Leaderboard",
  "Group 5 Leaderboard",
  "Group 6 Leaderboard",
];

function PlayerCard({ player, groupName, adjWR, rawWR, arrow }) {
  const gp = Number(player.gp);
  return (
    <div className={`flex-1 rounded-lg p-3 border ${arrow === "up" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-1 mb-1">
        {arrow === "up"
          ? <ArrowUp className="w-3 h-3 text-green-600" />
          : <ArrowDown className="w-3 h-3 text-red-500" />}
        <span className="text-xs text-muted-foreground">{groupName.replace(" Leaderboard", "")}</span>
      </div>
      <p className="font-bold text-sm">{player.player}</p>
      <p className="text-xs text-muted-foreground">{gp} MP · {player.wins}W</p>
      <div className="mt-1 flex gap-2">
        <span className={`text-xs font-bold ${arrow === "up" ? "text-green-700" : "text-red-600"}`}>
          Adj WR: {adjWR}%
        </span>
        <span className="text-xs text-muted-foreground">(Raw: {rawWR}%)</span>
      </div>
    </div>
  );
}

export default function OverallRankings({ groups }) {
  const [adjustedStats, setAdjustedStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getPartnerAdjustedStats", {})
      .then(res => setAdjustedStats(res.data?.adjustedStats || {}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  // Merge group standings with adjusted stats
  const getAdjWR = (playerName) => {
    const key = playerName?.toLowerCase();
    return adjustedStats?.[key]?.adjustedWR ?? null;
  };
  const getRawWR = (playerName) => {
    const key = playerName?.toLowerCase();
    return adjustedStats?.[key]?.rawWR ?? null;
  };

  // For ranking within groups, use adjusted WR if available, else raw WR from standings
  function effectiveWR(row) {
    const gp = Number(row.gp);
    const adj = getAdjWR(row.player);
    if (adj !== null) return adj;
    return gp > 0 ? Math.round((Number(row.wins) / gp) * 100) : 0;
  }

  function sortedByEffectiveWR(rows) {
    return [...rows]
      .filter(r => Number(r.gp) >= MIN_MATCHES)
      .sort((a, b) => effectiveWR(b) - effectiveWR(a));
  }

  // Build ranked groups
  const groupRanked = {};
  GROUP_NAMES.forEach(name => {
    groupRanked[name] = sortedByEffectiveWR(groups[name] || []);
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
    const maxPairs = Math.min(harderPlayers.length, easierPlayers.length);
    for (let j = 0; j < maxPairs; j++) {
      const candidate = harderPlayers[harderPlayers.length - 1 - j];
      const challenger = easierPlayers[j];
      const wrCandidate = effectiveWR(candidate);
      const wrChallenger = effectiveWR(challenger);
      if (wrChallenger > wrCandidate) {
        pairs.push({
          moveDown: candidate,
          moveUp: challenger,
          wrCandidate,
          wrChallenger,
          rawCandidate: getRawWR(candidate.player) ?? Math.round((Number(candidate.wins) / Math.max(Number(candidate.gp), 1)) * 100),
          rawChallenger: getRawWR(challenger.player) ?? Math.round((Number(challenger.wins) / Math.max(Number(challenger.gp), 1)) * 100),
        });
      }
    }
    if (pairs.length > 0) swapGroups.push({ harderGroup, easierGroup, pairs });
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2">
        <Info className="w-4 h-4 text-white shrink-0 mt-0.5" />
        <p className="text-xs text-white/80">
          Rankings use <strong className="text-white">partner-adjusted win rate</strong> — wins with weaker partners count more, wins with stronger partners count less. Raw WR shown for comparison.
        </p>
      </div>

      {/* Swap cards */}
      <Card className="shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> Suggested Group Swaps
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ≥{MIN_MATCHES} matches required · sorted by partner-adjusted win rate
          </p>
        </CardHeader>
      </Card>

      {swapGroups.length === 0 ? (
        <Card className="shadow-2xl">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No swap suggestions — groups look balanced or not enough data yet (need ≥{MIN_MATCHES} matches).
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
            <CardContent className="space-y-4">
              {sg.pairs.map((pair, j) => (
                <div key={j}>
                  {sg.pairs.length > 1 && (
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Swap {j + 1}</p>
                  )}
                  <div className="flex gap-3 items-center">
                    <PlayerCard
                      player={pair.moveDown}
                      groupName={sg.harderGroup}
                      adjWR={pair.wrCandidate}
                      rawWR={pair.rawCandidate}
                      arrow="down"
                    />
                    <div className="text-center shrink-0">
                      <ArrowUpDown className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">Swap</p>
                    </div>
                    <PlayerCard
                      player={pair.moveUp}
                      groupName={sg.easierGroup}
                      adjWR={pair.wrChallenger}
                      rawWR={pair.rawChallenger}
                      arrow="up"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Per-group breakdown */}
      {GROUP_NAMES.map(groupName => {
        const all = (groups[groupName] || []).filter(r => Number(r.gp) > 0)
          .sort((a, b) => effectiveWR(b) - effectiveWR(a));
        if (all.length === 0) return null;
        return (
          <Card key={groupName} className="shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {all.map((r, i) => {
                const gp = Number(r.gp);
                const adjWR = effectiveWR(r);
                const rawWR = getRawWR(r.player) ?? Math.round((Number(r.wins) / Math.max(gp, 1)) * 100);
                const eligible = gp >= MIN_MATCHES;
                return (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.player}</p>
                      <p className="text-xs text-muted-foreground">{gp} MP · {r.wins}W · {r.losses}L · Diff: {Number(r.diff) >= 0 ? "+" : ""}{r.diff}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${adjWR >= 60 ? "text-green-600" : adjWR <= 40 ? "text-red-500" : "text-slate-700"}`}>
                        {adjWR}%
                      </p>
                      <p className="text-xs text-muted-foreground">{eligible ? `Adj WR` : "< 6 MP"}</p>
                    </div>
                    {eligible && adjWR !== rawWR && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{rawWR}%</p>
                        <p className="text-xs text-muted-foreground">Raw</p>
                      </div>
                    )}
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
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlayerPairingModal from "./PlayerPairingModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

const GROUP_NAMES = [
  "Group 1 Leaderboard",
  "Group 2 Leaderboard",
  "Group 3 Leaderboard",
  "Group 4 Leaderboard",
  "Group 5 Leaderboard",
  "Group 6 Leaderboard",
];

function winRate(row) {
  const gp = Number(row.gp);
  return gp > 0 ? Math.round((Number(row.wins) / gp) * 100) : 0;
}

function SwapExplainer({ pair }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mx-auto"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Hide" : "How is this calculated?"}
      </button>
      {open && (
        <div className="mt-2 bg-slate-50 rounded-lg p-3 text-xs space-y-2 border">
          <p className="font-semibold text-slate-700">Rating-Based Swap Analysis</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="font-bold text-red-600 mb-1">{pair.moveDown.player}</p>
              <p className="text-muted-foreground">Current Group: {pair.moveDown.currentGroup}</p>
              <p className="text-muted-foreground">Rating: <span className="font-bold text-slate-700">{pair.moveDown.rating}</span></p>
              <p className="text-muted-foreground">{pair.moveDown.gp} games · Diff {pair.moveDown.diff >= 0 ? "+" : ""}{pair.moveDown.diff}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <p className="font-bold text-green-600 mb-1">{pair.moveUp.player}</p>
              <p className="text-muted-foreground">Current Group: {pair.moveUp.currentGroup}</p>
              <p className="text-muted-foreground">Rating: <span className="font-bold text-slate-700">{pair.moveUp.rating}</span></p>
              <p className="text-muted-foreground">{pair.moveUp.gp} games · Diff {pair.moveUp.diff >= 0 ? "+" : ""}{pair.moveUp.diff}</p>
            </div>
          </div>
          <p className="text-slate-500">
            {pair.moveUp.player} (rating {pair.moveUp.rating}) is rated stronger than {pair.moveDown.player} (rating {pair.moveDown.rating}) despite being in a lower group.
          </p>
          <p className="text-xs text-blue-600 font-semibold border-t pt-1">Rating = Base Group − (Avg Point Diff per game ÷ 10). Lower = stronger.</p>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, groupName, arrow }) {
  return (
    <div className={`flex-1 rounded-lg p-3 border ${arrow === "up" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-center gap-1 mb-1">
        {arrow === "up"
          ? <ArrowUp className="w-3 h-3 text-green-600" />
          : <ArrowDown className="w-3 h-3 text-red-500" />}
        <span className="text-xs text-muted-foreground">{groupName.replace(" Leaderboard", "")}</span>
      </div>
      <p className="font-bold text-sm">{player.player}</p>
      <p className="text-xs text-muted-foreground">{player.gp} games · Diff {player.diff >= 0 ? "+" : ""}{player.diff}</p>
      <p className="text-xs font-semibold text-yellow-700 mt-0.5">Rating: {player.rating}</p>
    </div>
  );
}

export default function OverallRankings({ groups }) {
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getPlayerRatings", {})
      .then(res => setRatings(res.data?.players || []))
      .finally(() => setLoadingRatings(false));
  }, []);

  // Group players by their actual currentGroup (from leaderboard data)
  const ratingsByGroup = {};
  ratings.forEach(p => {
    if (!p.hasStats) return; // need >= 6 games
    if (!ratingsByGroup[p.currentGroup]) ratingsByGroup[p.currentGroup] = [];
    ratingsByGroup[p.currentGroup].push(p);
  });
  Object.values(ratingsByGroup).forEach(arr => arr.sort((a, b) => a.rating - b.rating));

  // Build swap suggestions: if best in Group N+1 has lower rating than worst in Group N → swap
  const swapGroups = [];
  for (let i = 1; i <= 5; i++) {
    const harderPlayers = ratingsByGroup[i] || [];
    const easierPlayers = ratingsByGroup[i + 1] || [];
    if (!harderPlayers.length || !easierPlayers.length) continue;
    const worstInHarder = harderPlayers[harderPlayers.length - 1];
    const bestInEasier = easierPlayers[0];
    if (bestInEasier.rating < worstInHarder.rating) {
      swapGroups.push({
        harderGroup: `Group ${i} Leaderboard`,
        easierGroup: `Group ${i + 1} Leaderboard`,
        pairs: [{ moveDown: worstInHarder, moveUp: bestInEasier }]
      });
    }
  }

  // Rising players: rating has crossed below their current group number
  // e.g. Group 3 player with rating < 3.0 → potentially ready for Group 2
  const risingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup > 1 && p.rating < p.currentGroup
  );

  return (
    <>
    <div className="space-y-4">
      <Card className="shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" /> Suggested Group Swaps
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Based on player ratings (group base − avg point diff ÷ 10). Players eligible if they've played ≥6 matches.
          </p>
          {loadingRatings && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading ratings...</div>}
        </CardHeader>
      </Card>

      {swapGroups.length === 0 ? (
        <Card className="shadow-2xl">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No swap suggestions yet — not enough eligible players (need ≥6 matches).
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
                  <div className="flex gap-3 items-center">
                    <PlayerCard player={pair.moveDown} groupName={sg.harderGroup} arrow="down" />
                    <div className="text-center shrink-0">
                      <ArrowUpDown className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-xs text-muted-foreground mt-1">Swap</p>
                    </div>
                    <PlayerCard player={pair.moveUp} groupName={sg.easierGroup} arrow="up" />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    <span className="text-red-500 font-semibold">{pair.moveDown.player}</span> (rating {pair.moveDown.rating}) → {sg.easierGroup.replace(" Leaderboard", "")} ·{" "}
                    <span className="text-green-600 font-semibold">{pair.moveUp.player}</span> (rating {pair.moveUp.rating}) → {sg.harderGroup.replace(" Leaderboard", "")}
                  </p>
                  <SwapExplainer pair={pair} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Rising Players */}
      {risingPlayers.length > 0 && (
        <Card className="shadow-2xl border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" /> Rising Players
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Players whose rating has crossed below their current group number — worth watching for promotion.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {risingPlayers.sort((a, b) => a.rating - b.rating).map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                <TrendingUp className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.player}</p>
                  <p className="text-xs text-muted-foreground">Currently Group {p.currentGroup} · {p.gp} games · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-yellow-700">Rating {p.rating}</p>
                  <p className="text-xs text-green-600 font-semibold">↑ Group {Math.ceil(p.rating)} territory</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-group standings for reference */}
      {GROUP_NAMES.map(groupName => {
        const all = (groups[groupName] || []).filter(r => Number(r.gp) > 0).sort((a, b) => {
            const ra = ratings.find(p => p.player === a.player);
            const rb = ratings.find(p => p.player === b.player);
            if (ra && rb) return ra.rating - rb.rating;
            if (ra) return -1;
            if (rb) return 1;
            return winRate(b) - winRate(a);
          });
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
                const ratingEntry = ratings.find(p => p.player === r.player);
                return (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate cursor-pointer hover:text-blue-600 hover:underline" onClick={() => { setSelectedPlayer(r.player); setSelectedGroup(groupName); }}>{r.player}</p>
                      <p className="text-xs text-muted-foreground">{gp} MP · {r.wins}W · {r.losses}L · Diff: {Number(r.diff) >= 0 ? "+" : ""}{r.diff}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${wr >= 70 ? "text-green-600" : wr <= 30 ? "text-red-500" : "text-slate-700"}`}>{wr}%</p>
                      {ratingEntry && <p className="text-xs text-yellow-600 font-semibold">R: {ratingEntry.rating}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
    {selectedPlayer && <PlayerPairingModal player={selectedPlayer} groupName={selectedGroup} onClose={() => setSelectedPlayer(null)} />}
    </>
  );
}
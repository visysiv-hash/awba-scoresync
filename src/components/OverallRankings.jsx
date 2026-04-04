import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlayerPairingModal from "./PlayerPairingModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Loader2, TrendingUp } from "lucide-react";

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

  const risingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup > 1 && p.rating < p.currentGroup
  );

  const strugglingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup < 6 && p.rating > p.currentGroup
  );

  return (
    <>
    <div className="space-y-4">
      {loadingRatings && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading ratings...
        </div>
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

      {/* Struggling Players */}
      {strugglingPlayers.length > 0 && (
        <Card className="shadow-2xl border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-red-500" /> Struggling Players
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Players whose rating has risen above their current group number — may be better suited to a lower group.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {strugglingPlayers.sort((a, b) => b.rating - a.rating).map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <ArrowDown className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.player}</p>
                  <p className="text-xs text-muted-foreground">Currently Group {p.currentGroup} · {p.gp} games · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-700">Rating {p.rating}</p>
                  <p className="text-xs text-red-500 font-semibold">↓ Group {Math.floor(p.rating) + 1} territory</p>
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
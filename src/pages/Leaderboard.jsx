import { useState, useEffect, useCallback } from "react";
import PlayerStats from "../components/PlayerStats";
import LeaderboardSkeleton from "../components/LeaderboardSkeleton";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Trophy, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GROUP_NAMES = [
  "Group 1 Leaderboard",
  "Group 2 Leaderboard",
  "Group 3 Leaderboard",
  "Group 4 Leaderboard",
  "Group 5 Leaderboard",
  "Group 6 Leaderboard",
];

export default function Leaderboard() {
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(GROUP_NAMES[0]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [chartGroup, setChartGroup] = useState(GROUP_NAMES[0]);
  const [roundsStats, setRoundsStats] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const [standingsRes, roundsRes] = await Promise.all([
      base44.functions.invoke("getStandings", {}),
      base44.functions.invoke("getRoundsWon", {}),
    ]);
    setGroups(standingsRes.data?.groups || {});
    setRoundsStats(roundsRes.data?.stats || {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentGroupData = groups[selectedGroup] || [];

  const allPlayers = Object.entries(groups).flatMap(([grp, rows]) =>
    rows.map(r => ({ ...r, group: grp }))
  );
  const playerData = selectedPlayer
    ? allPlayers.filter(p => p.player.toLowerCase().includes(selectedPlayer.toLowerCase()))
    : [];

  // Auto-select the group where player has most games played
  useEffect(() => {
    if (!selectedPlayer || playerData.length === 0) return;
    const best = playerData.reduce((a, b) => Number(a.gp) >= Number(b.gp) ? a : b);
    if (best?.group) setChartGroup(best.group);
  }, [selectedPlayer, JSON.stringify(playerData)]);

  const playerInChartGroup = selectedPlayer
    ? (groups[chartGroup] || []).find(r => r.player.toLowerCase().includes(selectedPlayer.toLowerCase())) || null
    : null;

  const getStreak = (row) => {
    if (!row) return null;
    const w = Number(row.wins), l = Number(row.losses);
    if (w - l >= 3) return { label: `${w - l} Win Streak`, color: "text-orange-500" };
    if (l - w >= 3) return { label: `${l - w} Loss Streak`, color: "text-red-500" };
    return null;
  };

  const chartGroupData = (groups[chartGroup] || [])
    .filter(r => Number(r.gp) > 0)
    .sort((a, b) => Number(b.ladderPts) - Number(a.ladderPts))
    .map(r => ({
      name: r.player,
      wins: Number(r.wins),
      winPct: Number(r.gp) > 0 ? Math.round((Number(r.wins) / Number(r.gp)) * 100) : 0
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={load} className="text-white hover:text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="flex-1 text-center">
            <img
              src="https://media.base44.com/images/public/69c519111fbf9fefe3d69538/38fc332c7_image.png"
              alt="Albury Wodonga Badminton"
              className="mx-auto h-12 object-contain mb-1"
            />
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" /> League Leaderboard
            </h1>
          </div>
          <div className="w-20" />
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : (
          <div className="space-y-6">

            {/* My Results */}
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg">My Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Search by player name..."
                  value={selectedPlayer}
                  onChange={e => setSelectedPlayer(e.target.value)}
                />

                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Select Group:</label>
                  <Select value={chartGroup} onValueChange={setChartGroup}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_NAMES.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlayer && playerData.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                      Showing stats for: <span className="font-semibold">{chartGroup}</span>
                      {playerInChartGroup && <> · Rank: <span className="font-bold text-blue-600">#{playerInChartGroup.rank}</span></>}
                      {playerInChartGroup && getStreak(playerInChartGroup) && (
                        <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full bg-orange-50 ${getStreak(playerInChartGroup).color}`}>
                          <Flame className="w-3 h-3" /> {getStreak(playerInChartGroup).label}
                        </span>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {[
                        { label: "GP", value: playerInChartGroup?.gp ?? "—" },
                        { label: "Wins", value: playerInChartGroup?.wins ?? "—", color: "text-green-600" },
                        { label: "Losses", value: playerInChartGroup?.losses ?? "—", color: "text-red-500" },
                        { label: "Draws", value: playerInChartGroup?.draws ?? "—" },
                        { label: "Pts For", value: playerInChartGroup?.pointsFor ?? "—", color: "text-blue-600" },
                        { label: "Pts Against", value: playerInChartGroup?.pointsAgainst ?? "—", color: "text-slate-500" },
                      ].map(stat => (
                        <div key={stat.label} className="bg-slate-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className={`text-xl font-bold ${stat.color || ""}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Derived stats row */}
                    {playerInChartGroup && (
                      <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Point Diff: </span>
                          <span className={`font-bold text-lg ${Number(playerInChartGroup.diff) >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {Number(playerInChartGroup.diff) >= 0 ? "+" : ""}{playerInChartGroup.diff}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Win Rate: </span>
                          <span className="font-bold text-lg text-purple-600">
                            {Number(playerInChartGroup.gp) > 0 ? Math.round((Number(playerInChartGroup.wins) / Number(playerInChartGroup.gp)) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    )}

                    <PlayerStats playerName={selectedPlayer} />

                    {/* Wins / Win% Charts */}
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-semibold">Group Leaderboard Chart</p>
                      {chartGroupData.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4 text-sm">No games played in this group yet.</p>
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartGroupData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Legend verticalAlign="top" />
                              <Bar dataKey="wins" fill="#16a34a" name="Wins" />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-sm font-semibold mt-4 mb-2">Win %</p>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartGroupData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                              <Tooltip formatter={(val) => `${val}%`} />
                              <Legend verticalAlign="top" />
                              <Bar dataKey="winPct" fill="#7c3aed" name="Win %" />
                            </BarChart>
                          </ResponsiveContainer>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedPlayer && playerData.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No results found for this player.</p>
                )}

                {/* Rounds Won Charts — always visible for selected group */}
                {(() => {
                  const roundsChartData = (groups[chartGroup] || [])
                    .filter(r => Number(r.gp) > 0)
                    .sort((a, b) => Number(b.ladderPts) - Number(a.ladderPts))
                    .map(r => {
                      const rs = Object.values(roundsStats).find(s => s.player.toLowerCase() === r.player.toLowerCase());
                      const rw = rs?.roundsWon || 0;
                      const rp = rs?.roundsPlayed || 0;
                      return {
                        name: r.player,
                        roundsWon: rw,
                        roundsWinPct: rp > 0 ? Math.round((rw / rp) * 100) : 0,
                      };
                    });
                  if (roundsChartData.length === 0) return null;
                  return (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-semibold">Rounds Won — {chartGroup}</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={roundsChartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend verticalAlign="top" />
                          <Bar dataKey="roundsWon" fill="#0ea5e9" name="Rounds Won" />
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-sm font-semibold mt-4 mb-2">Round Win %</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={roundsChartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                          <Tooltip formatter={(val) => `${val}%`} />
                          <Legend verticalAlign="top" />
                          <Bar dataKey="roundsWinPct" fill="#f97316" name="Round Win %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
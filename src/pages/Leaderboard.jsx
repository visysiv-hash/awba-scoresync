import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PlayerStats from "../components/PlayerStats";
import RoundStandingsChart from "../components/RoundStandingsChart";
import OverallRankings from "../components/OverallRankings";
import LeaderboardSkeleton from "../components/LeaderboardSkeleton";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const navigate = useNavigate();
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [activeTab, setActiveTab] = useState("search");
  const [visitCount, setVisitCount] = useState(null);

  useEffect(() => {
    base44.entities.PageVisit.create({ page: 'leaderboard' });
    base44.entities.PageVisit.filter({ page: 'leaderboard' }).then(visits => setVisitCount(visits.length));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const standingsRes = await base44.functions.invoke("getStandings", {});
    setGroups(standingsRes.data?.groups || {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allPlayers = Object.entries(groups).flatMap(([grp, rows]) =>
    rows.map(r => ({ ...r, group: grp }))
  );
  const playerData = selectedPlayer
    ? allPlayers.filter(p => p.player.toLowerCase() === selectedPlayer.toLowerCase())
    : [];

  const getStreak = (row) => {
    if (!row) return null;
    const w = Number(row.wins), l = Number(row.losses);
    if (w - l >= 3) return { label: `${w - l} Win Streak`, color: "text-orange-500" };
    if (l - w >= 3) return { label: `${l - w} Loss Streak`, color: "text-red-500" };
    return null;
  };

  // Generate chart data for each group
  const getChartDataForGroup = (groupName) => {
    return (groups[groupName] || [])
      .filter(r => Number(r.gp) > 0)
      .sort((a, b) => Number(b.ladderPts) - Number(a.ladderPts))
      .map(r => ({
        name: r.player,
        winPct: Number(r.gp) > 0 ? Math.round((Number(r.wins) / Number(r.gp)) * 100) : 0
      }));
  };

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
            {visitCount !== null && (
              <p className="text-xs text-slate-400 mt-1">{visitCount} visits</p>
            )}
          </div>
          <div className="w-20" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[{ id: "search", label: "Player Search" }, { id: "rankings", label: "🏆 Ratings" }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-slate-900"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : activeTab === "rankings" ? (
          <OverallRankings groups={groups} />
        ) : (
          <div className="space-y-6">

            {/* 1. Player Search */}
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Player Search</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Search by player name..."
                  value={selectedPlayer}
                  onChange={e => setSelectedPlayer(e.target.value)}
                />
                {selectedPlayer && playerData.length === 0 && (
                  <p className="text-muted-foreground text-center py-4 text-sm">No results found for this player.</p>
                )}
              </CardContent>
            </Card>

            {/* Player name header */}
            {selectedPlayer && playerData.length > 0 && (
              <div className="text-center py-2">
                <h2 className="text-2xl font-bold text-white cursor-pointer hover:text-blue-300 transition-colors" onClick={() => navigate(`/player?name=${encodeURIComponent(selectedPlayer)}`)}>{selectedPlayer}</h2>
                <p className="text-slate-300 text-sm">Click name to see full profile</p>
              </div>
            )}

            {/* 1. Games cards and stats */}
            {selectedPlayer && playerData.length > 0 && <PlayerStats playerName={selectedPlayer} />}

            {/* 2. Weekly standings */}
            {selectedPlayer && <RoundStandingsChart playerName={selectedPlayer} />}

            {/* 4. Group standings - show all groups player played in */}
            {selectedPlayer && playerData.length > 0 && (
              <div className="space-y-6">
                {playerData.filter(p => Number(p.gp) > 0).map((playerInGroup) => {
                  const groupName = playerInGroup.group;
                  const gp = Number(playerInGroup.gp);
                  const wr = gp > 0 ? Math.round((Number(playerInGroup.wins) / gp) * 100) : 0;
                  const streak = getStreak(playerInGroup);
                  const chartData = getChartDataForGroup(groupName);

                  return (
                    <Card key={groupName} className="shadow-2xl">
                      <CardHeader>
                        <CardTitle className="text-lg">{groupName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{selectedPlayer}</span>
                          {playerInGroup.rank && <> · Rank: <span className="font-bold text-blue-600">#{playerInGroup.rank}</span></>}
                          {streak && (
                            <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full bg-orange-50 ${streak.color}`}>
                              <Flame className="w-3 h-3" /> {streak.label}
                            </span>
                          )}
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                          {[
                            { label: "MP", value: gp },
                            { label: "Wins", value: playerInGroup.wins, color: "text-green-600" },
                            { label: "Losses", value: playerInGroup.losses, color: "text-red-500" },
                            { label: "Draws", value: playerInGroup.draws ?? "—" },
                            { label: "Pts For", value: playerInGroup.pointsFor ?? "—", color: "text-blue-600" },
                            { label: "Pts Against", value: playerInGroup.pointsAgainst ?? "—", color: "text-slate-500" },
                          ].map(stat => (
                            <div key={stat.label} className="bg-slate-50 rounded-lg p-3 text-center">
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                              <p className={`text-xl font-bold ${stat.color || ""}`}>{stat.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Derived stats */}
                        <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between flex-wrap gap-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Point Diff: </span>
                            <span className={`font-bold text-lg ${Number(playerInGroup.diff) >= 0 ? "text-green-600" : "text-red-500"}`}>
                              {Number(playerInGroup.diff) >= 0 ? "+" : ""}{playerInGroup.diff}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Win Rate: </span>
                            <span className="font-bold text-lg text-purple-600">{wr}%</span>
                          </div>
                        </div>

                        {/* Win% Chart */}
                        <div className="border-t pt-4 space-y-3">
                          <p className="text-sm font-semibold">Win % in {groupName.replace(" Leaderboard", "")}</p>
                          {chartData.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4 text-sm">No games played in this group yet.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                                <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                                <Tooltip formatter={(val) => `${val}%`} />
                                <Legend verticalAlign="top" />
                                <Bar dataKey="winPct" fill="#7c3aed" name="Win %" />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
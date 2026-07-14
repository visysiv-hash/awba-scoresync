import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PlayerStats from "../components/PlayerStats";
import PlayerRatingCard from "../components/PlayerRatingCard";
import RoundStandingsChart from "../components/RoundStandingsChart";
import OverallRankings from "../components/OverallRankings";
import GroupStandingsSection from "../components/GroupStandingsSection";
import PointsTable from "../components/PointsTable";
import LeaderboardSkeleton from "../components/LeaderboardSkeleton";
import PageBanner from "../components/PageBanner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Trophy, Flame, ChevronDown, ChevronUp } from "lucide-react";
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
  const urlParams = new URLSearchParams(window.location.search);
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(urlParams.get("name") || "");
  const [activeTab, setActiveTab] = useState(urlParams.get("tab") || "rankings");
  const [visitCount, setVisitCount] = useState(null);

  useEffect(() => {
    base44.entities.PageVisit.create({ page: 'leaderboard' }).catch(() => {});
    base44.entities.PageVisit.filter({ page: 'leaderboard' }).then(visits => setVisitCount(visits.length)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const standingsRes = await base44.functions.invoke("getStandings", {});
      setGroups(standingsRes.data?.groups || {});
    } catch (e) {
      console.error("Failed to load standings:", e);
    } finally {
      setLoading(false);
    }
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
            <PageBanner className="h-12 mb-1" />
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
          {[{ id: "search", label: "Player Search" }, { id: "rankings", label: "🏆 Ratings" }, { id: "points", label: "📊 Points" }].map(tab => (
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
        ) : activeTab === "points" ? (
          <PointsTable groups={groups} />
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

            {/* Rating card - first */}
            {selectedPlayer && playerData.length > 0 && <PlayerRatingCard playerName={selectedPlayer} />}

            {/* Weekly standings - immediately below rating card */}
            {selectedPlayer && <RoundStandingsChart playerName={selectedPlayer} />}

            {/* 1. Games cards and stats */}
            {selectedPlayer && playerData.length > 0 && <PlayerStats playerName={selectedPlayer} />}

            {/* 4. Group standings - show all groups player played in */}
            {selectedPlayer && playerData.length > 0 && (
              <GroupStandingsSection
                playerData={playerData}
                selectedPlayer={selectedPlayer}
                getStreak={getStreak}
                getChartDataForGroup={getChartDataForGroup}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}
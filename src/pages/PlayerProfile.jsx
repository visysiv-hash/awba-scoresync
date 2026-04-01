import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function PlayerProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerName) {
      navigate("/leaderboard");
      return;
    }

    const loadPlayerHistory = async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("getPlayerHistory", { player: playerName });
        setGames(res.data?.history || []);
      } catch (error) {
        console.error("Error loading player history:", error);
      }
      setLoading(false);
    };

    loadPlayerHistory();
  }, [playerName, navigate]);

  if (!playerName) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  // Calculate cumulative metrics
  let cumulativeWins = 0;
  let cumulativeLosses = 0;
  let cumulativePointDiff = 0;
  const trendData = games.map((game) => {
    cumulativeWins += game.result === "win" ? 1 : game.result === "loss" ? 0 : 0;
    cumulativeLosses += game.result === "loss" ? 1 : game.result === "win" ? 0 : 0;
    cumulativePointDiff += (game.pointsFor || 0) - (game.pointsAgainst || 0);
    return {
      date: new Date(game.timestamp).toLocaleDateString(),
      timestamp: new Date(game.timestamp).getTime(),
      pointDiff: cumulativePointDiff,
      matchNum: games.indexOf(game) + 1,
    };
  }).sort((a, b) => a.timestamp - b.timestamp);

  const totalGames = games.length;
  const wins = games.filter(g => g.result === "win").length;
  const losses = games.filter(g => g.result === "loss").length;
  const draws = games.filter(g => g.result === "draw").length;
  const totalPointsFor = games.reduce((s, g) => s + (g.pointsFor || 0), 0);
  const totalPointsAgainst = games.reduce((s, g) => s + (g.pointsAgainst || 0), 0);
  const totalPointDiff = totalPointsFor - totalPointsAgainst;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/leaderboard")} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">{playerName}</h1>
            <p className="text-slate-300 text-sm">Player Profile</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Matches", value: totalGames },
            { label: "Wins", value: wins, color: "text-green-400" },
            { label: "Losses", value: losses, color: "text-red-400" },
            { label: "Win Rate", value: `${winRate}%`, color: "text-purple-400" },
          ].map(stat => (
            <Card key={stat.label} className="shadow-lg">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color || "text-white"}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Metrics */}
        <Card className="shadow-2xl mb-6">
          <CardHeader>
            <CardTitle>Cumulative Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Points For", value: totalPointsFor },
              { label: "Points Against", value: totalPointsAgainst },
              { label: "Point Differential", value: totalPointDiff, color: totalPointDiff >= 0 ? "text-green-600" : "text-red-500" },
              { label: "Draws", value: draws },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color || ""}`}>{stat.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        {trendData.length > 0 && (
          <Card className="shadow-2xl mb-6">
            <CardHeader>
              <CardTitle>Point Differential Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="matchNum" label={{ value: "Match Number", position: "insideBottomRight", offset: -5 }} />
                  <YAxis label={{ value: "Cumulative Point Diff", angle: -90, position: "insideLeft" }} />
                  <Tooltip 
                    formatter={(value) => value}
                    labelFormatter={(label) => `Match ${label}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="pointDiff" stroke="#7c3aed" strokeWidth={2} name="Point Differential" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Match History Table */}
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>Match History</CardTitle>
          </CardHeader>
          <CardContent>
            {games.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No match history found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Opponent</th>
                      <th className="px-4 py-2 text-center font-semibold">Result</th>
                      <th className="px-4 py-2 text-center font-semibold">Points For</th>
                      <th className="px-4 py-2 text-center font-semibold">Points Against</th>
                      <th className="px-4 py-2 text-center font-semibold">Differential</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game, i) => {
                      const diff = (game.pointsFor || 0) - (game.pointsAgainst || 0);
                      const resultColor = game.result === "win" ? "text-green-600 font-bold" : game.result === "loss" ? "text-red-500 font-bold" : "text-slate-500";
                      return (
                        <tr key={i} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-2">{new Date(game.timestamp).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{game.opponent || "—"}</td>
                          <td className={`px-4 py-2 text-center ${resultColor}`}>{game.result?.toUpperCase()}</td>
                          <td className="px-4 py-2 text-center">{game.pointsFor || 0}</td>
                          <td className="px-4 py-2 text-center">{game.pointsAgainst || 0}</td>
                          <td className={`px-4 py-2 text-center font-semibold ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {diff >= 0 ? "+" : ""}{diff}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
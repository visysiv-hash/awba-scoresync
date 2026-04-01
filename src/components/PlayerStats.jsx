import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DOT = { W: "✅", L: "❌", D: "🟡" };

function FormGuide({ games }) {
  const last5 = games.slice(0, 6).reverse();
  if (!last5.length) return <span className="text-muted-foreground text-sm">No games yet</span>;
  return (
    <span className="text-xl tracking-widest">
      {last5.map((g, i) => <span key={i} title={`vs ${g.opponent} ${g.myScore}-${g.oppScore}`}>{DOT[g.result]}</span>)}
    </span>
  );
}

export default function PlayerStats({ playerName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!playerName) return;
    setData(null);
    load(playerName);
  }, [playerName]);

  const load = async (player) => {
    setLoading(true);
    const res = await base44.functions.invoke("getPlayerHistory", { player, opponent: "" });
    setData(res.data);
    setLoading(false);
  };

  if (!playerName) return null;
  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const { games, h2h } = data;

  // Points scored vs conceded per recent game (last 10)
  const chartData = games.slice(0, 10).reverse().map((g, i) => ({
    name: `M${i + 1}`,
    "Points For": g.myScore,
    "Points Against": g.oppScore,
  }));

  // Games won per match: 42 = won both (2), opponent 42 = won 0, else each won 1
  const gamesChartData = games.slice(0, 10).reverse().map((g, i) => {
    const myGamesWon = Number(g.myScore) === 42 ? 2 : Number(g.oppScore) === 42 ? 0 : 1;
    const oppGamesWon = 2 - myGamesWon;
    return { name: `M${i + 1}`, "Games Won": myGamesWon, "Games Lost": oppGamesWon };
  });

  const totalGamesWon = games.reduce((sum, g) => sum + (Number(g.myScore) === 42 ? 2 : Number(g.oppScore) === 42 ? 0 : 1), 0);
  const totalGamesLost = games.reduce((sum, g) => sum + (Number(g.oppScore) === 42 ? 2 : Number(g.myScore) === 42 ? 0 : 1), 0);

  return (
    <div className="space-y-4 mt-4 border-t pt-4">

      {/* Form Guide */}
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Last 6 Games (oldest → newest)</p>
        <FormGuide games={games} />
        {games.length > 0 && (
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>W: {games.filter(g => g.result === "W").length}</span>
            <span>L: {games.filter(g => g.result === "L").length}</span>
            <span>D: {games.filter(g => g.result === "D").length}</span>
            <span>Total: {games.length}</span>
          </div>
        )}
      </div>

      {/* Games Won vs Lost Summary */}
      {games.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Total Games Won vs Lost</p>
          <div className="flex gap-4 justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{totalGamesWon}</p>
              <p className="text-xs text-muted-foreground">Games Won</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{totalGamesLost}</p>
              <p className="text-xs text-muted-foreground">Games Lost</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {totalGamesWon + totalGamesLost > 0 ? Math.round((totalGamesWon / (totalGamesWon + totalGamesLost)) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Game Win %</p>
            </div>
          </div>
        </div>
      )}

      {/* Games Won per Match Chart */}
      {gamesChartData.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Games Won per Match (last {gamesChartData.length})</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gamesChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 2]} ticks={[0, 1, 2]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Games Won" fill="#16a34a" />
              <Bar dataKey="Games Lost" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Points For vs Against Chart */}
      {chartData.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">Points Scored vs Conceded (last {chartData.length} matches)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Points For" fill="#16a34a" />
              <Bar dataKey="Points Against" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
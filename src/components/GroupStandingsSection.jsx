import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function GroupCard({ playerInGroup, selectedPlayer, getStreak, getChartDataForGroup }) {
  const [expanded, setExpanded] = useState(false);
  const groupName = playerInGroup.group;
  const gp = Number(playerInGroup.gp);
  const wr = gp > 0 ? Math.round((Number(playerInGroup.wins) / gp) * 100) : 0;
  const streak = getStreak(playerInGroup);
  const chartData = getChartDataForGroup(groupName);

  return (
    <Card className="shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{groupName}</CardTitle>
          <div className="flex items-center gap-2">
            {playerInGroup.rank && (
              <span className="text-sm font-bold text-blue-600">#{playerInGroup.rank}</span>
            )}
            {streak && (
              <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full bg-orange-50 ${streak.color}`}>
                <Flame className="w-3 h-3" /> {streak.label}
              </span>
            )}
          </div>
        </div>
        {/* Summary row always visible */}
        <div className="flex gap-4 text-sm mt-1">
          <span><span className="text-muted-foreground">MP:</span> <strong>{gp}</strong></span>
          <span><span className="text-green-600 font-bold">{playerInGroup.wins}W</span></span>
          <span><span className="text-red-500 font-bold">{playerInGroup.losses}L</span></span>
          <span><span className="text-muted-foreground">Win Rate:</span> <strong className="text-purple-600">{wr}%</strong></span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
        >
          <span>Full Stats & Chart</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="space-y-4 mt-3">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GroupStandingsSection({ playerData, selectedPlayer, getStreak, getChartDataForGroup }) {
  return (
    <div className="space-y-6">
      {playerData.filter(p => Number(p.gp) > 0).map((playerInGroup) => (
        <GroupCard
          key={playerInGroup.group}
          playerInGroup={playerInGroup}
          selectedPlayer={selectedPlayer}
          getStreak={getStreak}
          getChartDataForGroup={getChartDataForGroup}
        />
      ))}
    </div>
  );
}
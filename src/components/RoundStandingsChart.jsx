import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

export default function RoundStandingsChart({ playerName }) {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState([]);
  const [data, setData] = useState({});
  const [selectedRound, setSelectedRound] = useState("");
  const [metric, setMetric] = useState("wins");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await base44.functions.invoke("getRoundStandings", {});
    const { rounds: r, data: d } = res.data;
    setRounds(r || []);
    setData(d || {});
    if (r && r.length > 0) setSelectedRound(r[0]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build per-round data for the specific player
  const playerChartData = rounds.map(round => {
    const rows = data[round] || [];
    const row = rows.find(r => (r.player || r.name || Object.values(r)[0] || "").toLowerCase().includes(playerName.toLowerCase()));
    return {
      name: round,
      wins: Number(row?.wins) || 0,
      losses: Number(row?.losses) || 0,
      pointsFor: Number(row?.["points for"] || row?.pointsfor || row?.["pts for"] || row?.pointsFor) || 0,
      pointsAgainst: Number(row?.["points against"] || row?.pointsagainst || row?.["pts against"] || row?.pointsAgainst) || 0,
      diff: Number(row?.diff || row?.difference) || 0,
    };
  }).filter(r => r.wins || r.losses || r.pointsFor || r.pointsAgainst || r.diff);

  const metricOptions = [
    { value: "wins", label: "Wins" },
    { value: "losses", label: "Losses" },
    { value: "pointsFor", label: "Points For" },
    { value: "pointsAgainst", label: "Points Against" },
    { value: "diff", label: "Point Diff" },
  ];

  const colors = { wins: "#16a34a", losses: "#dc2626", pointsFor: "#2563eb", pointsAgainst: "#9333ea", diff: "#f59e0b" };

  return (
    <Card className="shadow-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Round Standings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : rounds.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">No round data available.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">Metric</p>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metricOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {playerChartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No round data found for this player.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={playerChartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" />
                  <Bar dataKey={metric} fill={colors[metric]} name={metricOptions.find(m => m.value === metric)?.label} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
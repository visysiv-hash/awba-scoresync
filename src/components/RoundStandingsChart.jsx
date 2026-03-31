import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

export default function RoundStandingsChart() {
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

  const chartData = (data[selectedRound] || [])
    .map(row => ({
      name: row.player || row.name || Object.values(row)[0],
      wins: Number(row.wins) || 0,
      losses: Number(row.losses) || 0,
      pointsFor: Number(row["points for"] || row.pointsfor || row["pts for"] || row.ptsfor || row.pointsFor) || 0,
      pointsAgainst: Number(row["points against"] || row.pointsagainst || row["pts against"] || row.ptsagainst || row.pointsAgainst) || 0,
      diff: Number(row.diff || row.difference) || 0,
    }))
    .filter(r => r.name);

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Round</p>
                <Select value={selectedRound} onValueChange={setSelectedRound}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rounds.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Metric</p>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {metricOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No data for this round.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
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
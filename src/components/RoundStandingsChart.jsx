import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function RoundStandingsChart({ playerName }) {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState([]);
  const [data, setData] = useState({});
  const [selectedRound, setSelectedRound] = useState("");

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

  const selectedRoundRows = data[selectedRound] || [];
  const player = selectedRound
    ? selectedRoundRows.find(r => (r.player || r.name || Object.values(r)[0] || "").toLowerCase().includes(playerName.toLowerCase()))
    : null;

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
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Select Round</p>
              <Select value={selectedRound} onValueChange={setSelectedRound}>
                <SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger>
                <SelectContent>
                  {rounds.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedRound && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{selectedRound} — Stats</p>
                {player ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Wins", value: player.wins ?? "—", color: "text-green-600" },
                      { label: "Losses", value: player.losses ?? "—", color: "text-red-500" },
                      { label: "Draws", value: player.draws ?? "—", color: "text-yellow-500" },
                      { label: "Pts For", value: player["points for"] ?? player.pointsFor ?? "—", color: "text-blue-600" },
                      { label: "Pts Against", value: player["points against"] ?? player.pointsAgainst ?? "—", color: "text-slate-500" },
                      { label: "Diff", value: player.diff ?? "—", color: Number(player.diff) >= 0 ? "text-green-600" : "text-red-500" },
                    ].map(stat => (
                      <div key={stat.label} className="text-center">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">No data for this player in {selectedRound}.</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
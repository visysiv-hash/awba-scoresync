import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function RoundStandingsChart({ playerName }) {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState([]);
  const [data, setData] = useState({});
  const [roundDateMap, setRoundDateMap] = useState({});
  const [selectedRound, setSelectedRound] = useState("");
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await base44.functions.invoke("getRoundStandings", {});
    const { rounds: r, data: d, roundDateMap: rdm } = res.data;
    setRoundDateMap(rdm || {});
    setRounds(r || []);
    setData(d || {});
    if (r && r.length > 0) setSelectedRound(r[0]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedRound || !playerName) { setGames([]); return; }
    setGamesLoading(true);
    base44.functions.invoke("getRoundGames", { player: playerName, round: selectedRound })
      .then(res => {
        const raw = res.data?.games || [];
        // Deduplicate by netId (keep first occurrence)
        const seen = new Set();
        const unique = raw.filter(g => {
          if (seen.has(g.netId)) return false;
          seen.add(g.netId);
          return true;
        });
        setGames(unique);
      })
      .finally(() => setGamesLoading(false));
  }, [selectedRound, playerName]);

  const selectedRoundRows = data[selectedRound] || [];
  const player = selectedRound
    ? selectedRoundRows.find(r => (r.player || r.name || Object.values(r)[0] || "").toLowerCase().includes(playerName.toLowerCase()))
    : null;

  return (
    <div className="space-y-4">
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
                    {rounds.map(r => <SelectItem key={r} value={r}>{r}{roundDateMap[r] ? ` (${roundDateMap[r]})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedRound && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Round {selectedRound} — Stats{roundDateMap[selectedRound] ? ` · ${roundDateMap[selectedRound]}` : ""}
                  </p>
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
                    <p className="text-sm text-muted-foreground text-center">No data for this player in Round {selectedRound}.</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Games Card */}
      {selectedRound && (
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Round {selectedRound} Games</CardTitle>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : games.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No games found for this player in Round {selectedRound}.</p>
            ) : (
              <div className="space-y-3">
                {games.map((g, i) => {
                  const players = g.gameChoice.split("&").map(p => p.trim());
                  const score1 = Number(g.team1Score);
                  const score2 = Number(g.team2Score);
                  const team1Won = score1 === 42;
                  const team2Won = score2 === 42;
                  const isDraw = !team1Won && !team2Won;
                  const renderTeam = (teamPlayers) => teamPlayers.map((p, idx) => (
                    <span key={idx}>
                      {idx > 0 && " & "}
                      <span className={p.toLowerCase().includes(playerName.toLowerCase()) ? "underline font-bold" : ""}>{p}</span>
                    </span>
                  ));
                  return (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">

                        <p className="text-sm font-medium leading-snug">
                          <span className="text-blue-600 inline-flex items-center gap-1 flex-wrap">{renderTeam(players.slice(0, 2))}</span>{" "}
                          <span className="text-red-500 font-bold">Vs</span>{" "}
                          <span className="text-purple-600 inline-flex items-center gap-1 flex-wrap">{renderTeam(players.slice(2))}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xl font-bold ${team1Won ? "text-green-600" : team2Won ? "text-red-500" : "text-yellow-500"}`}>
                          {g.team1Score}
                        </span>
                        <span className="text-muted-foreground text-sm">–</span>
                        <span className={`text-xl font-bold ${team2Won ? "text-green-600" : team1Won ? "text-red-500" : "text-yellow-500"}`}>
                          {g.team2Score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
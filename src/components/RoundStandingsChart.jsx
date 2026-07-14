import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function RoundStandingsChart({ playerName }) {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState([]);
  const [roundDateMap, setRoundDateMap] = useState({});
  const [selectedRound, setSelectedRound] = useState("");
  const [allGames, setAllGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  // Load round metadata once
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getRoundStandings", {});
      const { rounds: r, roundDateMap: rdm } = res.data;
      setRoundDateMap(rdm || {});
      const sorted = (r || []).slice().sort((a, b) => parseInt(a) - parseInt(b));
      setRounds(sorted);
      if (sorted.length > 0) {
        const lastPlayedRound = [...sorted].reverse().find(round => (rdm || {})[round]);
        setSelectedRound(lastPlayedRound || sorted[sorted.length - 1]);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetch ALL games for the player in ONE call — no per-round race condition possible
  useEffect(() => {
    if (!playerName) { setAllGames([]); return; }
    let cancelled = false;
    setGamesLoading(true);
    base44.functions.invoke("getPlayerHistory", { player: playerName.trim(), opponent: "" })
      .then(res => {
        if (cancelled) return;
        const games = res.data?.games || [];
        // Sort by round ascending for consistent display
        games.sort((a, b) => parseInt(a.round || "0") - parseInt(b.round || "0"));
        setAllGames(games);

        // Auto-select the player's most recent round that has a date
        if (games.length > 0) {
          const playerRounds = [...new Set(games.map(g => String(g.round)))].sort((a, b) => parseInt(b) - parseInt(a));
          const rdm = {}; // roundDateMap may not be loaded yet; just pick most recent
          // Only override if user hasn't manually selected yet or current round has no games
          setSelectedRound(prev => {
            if (prev && games.some(g => String(g.round) === String(prev))) return prev;
            return playerRounds[0] || prev;
          });
        }
      })
      .catch(() => { if (!cancelled) setAllGames([]); })
      .finally(() => { if (!cancelled) setGamesLoading(false); });
    return () => { cancelled = true; };
  }, [playerName]);

  // Filter games for the selected round locally — instant, no fetch
  const games = allGames.filter(g => String(g.round) === String(selectedRound));

  // Compute stats from the filtered games (uses myScore/oppScore from getPlayerHistory)
  const computedStats = games.reduce((acc, g) => {
    const myScore = Number(g.myScore);
    const oppScore = Number(g.oppScore);
    const won = myScore === 42;
    const lost = oppScore === 42;
    if (won) acc.wins++;
    else if (lost) acc.losses++;
    else acc.draws++;
    acc.ptsFor += myScore;
    acc.ptsAgainst += oppScore;
    return acc;
  }, { wins: 0, losses: 0, draws: 0, ptsFor: 0, ptsAgainst: 0 });
  computedStats.diff = computedStats.ptsFor - computedStats.ptsAgainst;

  return (
    <div className="space-y-4">
      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Standings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : rounds.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">No round data available.</p>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Select Week</p>
                <Select value={selectedRound} onValueChange={setSelectedRound}>
                  <SelectTrigger><SelectValue placeholder="Select round" /></SelectTrigger>
                  <SelectContent>
                    {rounds.map(r => <SelectItem key={r} value={r}>Week {r}{roundDateMap[r] ? ` (${roundDateMap[r]})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedRound && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Week {selectedRound} — Stats{roundDateMap[selectedRound] ? ` · ${roundDateMap[selectedRound]}` : ""}
                  </p>
                  {gamesLoading ? (
                    <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                  ) : games.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Wins", value: computedStats.wins, color: "text-green-600" },
                        { label: "Losses", value: computedStats.losses, color: "text-red-500" },
                        { label: "Draws", value: computedStats.draws, color: "text-yellow-500" },
                        { label: "Pts For", value: computedStats.ptsFor, color: "text-blue-600" },
                        { label: "Pts Against", value: computedStats.ptsAgainst, color: "text-slate-500" },
                        { label: "Diff", value: computedStats.diff, color: computedStats.diff >= 0 ? "text-green-600" : "text-red-500" },
                      ].map(stat => (
                        <div key={stat.label} className="text-center">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">No data for this player in Week {selectedRound}.</p>
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
            <CardTitle className="text-lg">Week {selectedRound} Games</CardTitle>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : games.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No games found for this player in Week {selectedRound}.</p>
            ) : (
              <div className="space-y-3">
                {games.map((g, i) => {
                  const myScore = Number(g.myScore);
                  const oppScore = Number(g.oppScore);
                  const won = myScore === 42;
                  const lost = oppScore === 42;
                  const renderTeam = (teamStr) => {
                    const players = (teamStr || "").split("&").map(p => p.trim());
                    return players.map((p, idx) => (
                      <span key={idx}>
                        {idx > 0 && " & "}
                        <span className={p.toLowerCase().includes(playerName.toLowerCase()) ? "underline font-bold" : ""}>{p}</span>
                      </span>
                    ));
                  };
                  return (
                    <div key={i} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          <span className="text-blue-600 inline-flex items-center gap-1 flex-wrap">{renderTeam(g.myTeam)}</span>{" "}
                          <span className="text-red-500 font-bold">Vs</span>{" "}
                          <span className="text-purple-600 inline-flex items-center gap-1 flex-wrap">{renderTeam(g.opponent)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xl font-bold ${won ? "text-green-600" : lost ? "text-red-500" : "text-yellow-500"}`}>
                          {myScore}
                        </span>
                        <span className="text-muted-foreground text-sm">–</span>
                        <span className={`text-xl font-bold ${lost ? "text-green-600" : won ? "text-red-500" : "text-yellow-500"}`}>
                          {oppScore}
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
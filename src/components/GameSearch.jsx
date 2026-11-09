import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Loader2, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function GameSearch({ onSelectGame, submittedScores = {}, query, onQueryChange, results, onResultsChange, autoSearch = false }) {
  const [loading, setLoading] = useState(false);
  const [nightDate, setNightDate] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please select a name.");
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke("searchGames", {
      query: query.trim(),
      date: nightDate || undefined,
    });
    setLoading(false);
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      onResultsChange(res.data?.results || []);
    }
  };

  // Auto-run the search once on mount when a name is pre-filled (e.g. from member login)
  useEffect(() => {
    if (autoSearch && query.trim() && results === null) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="shadow-2xl">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="night-date" className="text-muted-foreground">Night</label>
          <input
            id="night-date"
            type="date"
            value={nightDate}
            onChange={(e) => { setNightDate(e.target.value); onResultsChange(null); }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-muted-foreground">Blank uses the latest night</span>
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search by player name..."
            value={query}
            onChange={e => { onQueryChange(e.target.value); onResultsChange(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading || !query}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {results !== null && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matches found.
                <span className="block text-xs mt-1">The draw for this night may not be published yet.</span>
              </p>
            ) : (
              results.map((g, i) => {
                const localSubmit = submittedScores[`${g.net}-${g.game}`];
                const noResult = !!g.noResult;
                const isScored = (g.submitted || !!localSubmit) && !noResult;
                const displayRounds = localSubmit?.rounds || g.rounds;
                const displayTotal1 = localSubmit?.total1 ?? g.total1;
                const displayTotal2 = localSubmit?.total2 ?? g.total2;
                return (
                  <div
                    key={i}
                    className="border rounded-lg p-3 text-sm space-y-1 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => { if (!noResult) onSelectGame(g); }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Net {g.net} · Match {g.game}</span>
                          {noResult && <span className="text-amber-600 font-medium">No score by Wednesday</span>}
                          {isScored && <span className="text-green-600 font-medium">✓ Scored</span>}
                        </div>
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-blue-600">{g.team1}</span>
                          <span className="text-muted-foreground text-xs">VS</span>
                          <span className="text-red-600">{g.team2}</span>
                        </div>
                        {isScored && displayRounds && (
                          <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t mt-1">
                            {displayRounds.map((r, ri) => (
                              <p key={ri}>Game {ri + 1}: <b>{r.score1}</b> – <b>{r.score2}</b></p>
                            ))}
                            <p className="font-semibold">Total: <b>{displayTotal1}</b> – <b>{displayTotal2}</b></p>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
                    </div>
                    {noResult && (
                      <p className="text-xs text-amber-700 font-medium">
                        No score was entered by the Wednesday deadline, so both pairs take the rating penalty.
                        Ask the committee if the score was missed.
                      </p>
                    )}
                    {!isScored && !noResult && (
                      <p className="text-xs text-blue-600 font-medium">
                        {g.closed
                          ? "Wednesday deadline passed — entry closed."
                          : "Click to enter scores (due by 11:59pm Wednesday) →"}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
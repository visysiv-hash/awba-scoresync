import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Loader2, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function GameSearch({ onSelectGame }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please select a name.");
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke("searchGames", { query: query.trim() });
    setLoading(false);
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      setResults(res.data?.results || []);
    }
  };

  return (
    <Card className="shadow-2xl">
      <CardContent className="pt-6 space-y-4">
        <div className="flex gap-2">
          <input
            className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Search by player name..."
            value={query}
            onChange={e => { setQuery(e.target.value); setResults(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading || !query}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {results !== null && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No games found.</p>
            ) : (
              results.map((g, i) => (
                <div
                  key={i}
                  className="border rounded-lg p-3 text-sm space-y-1 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onSelectGame(g)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Net {g.net} · Game {g.game}</span>
                        {g.submitted && <span className="text-green-600 font-medium">✓ Scored</span>}
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-blue-600">{g.team1}</span>
                        <span className="text-muted-foreground text-xs">VS</span>
                        <span className="text-red-600">{g.team2}</span>
                      </div>
                      {g.submitted && (
                        <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t mt-1">
                          {g.rounds?.map((r, ri) => (
                            <p key={ri}>Round {ri + 1}: <b>{r.score1}</b> – <b>{r.score2}</b></p>
                          ))}
                          <p className="font-semibold">Total: <b>{g.total1}</b> – <b>{g.total2}</b></p>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
                  </div>
                  {!g.submitted && (
                    <p className="text-xs text-blue-600 font-medium">Click to enter scores →</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
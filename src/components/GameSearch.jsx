import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export default function GameSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a team or player name.");
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
          <Input
            placeholder="Search by team or player name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {results !== null && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No games found.</p>
            ) : (
              results.map((g, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Net {g.net} · Game {g.game}</span>
                    {g.submitted && <span className="text-green-600 font-medium">✓ Scored</span>}
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-blue-600">{g.team1}</span>
                    <span className="text-muted-foreground text-xs">VS</span>
                    <span className="text-red-600">{g.team2}</span>
                  </div>
                  {g.submitted && (
                    <div className="text-xs text-muted-foreground space-y-0.5 pt-1 border-t">
                      {g.rounds?.map((r, ri) => (
                        <p key={ri}>Round {ri + 1}: <b>{r.score1}</b> – <b>{r.score2}</b></p>
                      ))}
                      <p className="font-semibold">Total: <b>{g.total1}</b> – <b>{g.total2}</b></p>
                    </div>
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
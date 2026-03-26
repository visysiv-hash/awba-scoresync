import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function Dashboard() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await base44.functions.invoke("getResults", {});
      setLoading(false);
      if (!res.data?.error) {
        setResults(res.data?.results || []);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Results Dashboard</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No results submitted yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {results.map((g, i) => {
              const winner = g.total1 > g.total2 ? g.team1 : g.total2 > g.total1 ? g.team2 : "Draw";
              return (
                <Card key={i}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted-foreground">Net {g.net} · Game {g.game}</span>
                      <span className="text-xs text-green-600 font-medium">
                        {winner === "Draw" ? "Draw" : `🏆 ${winner}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600 text-sm">{g.team1}</span>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{g.total1} – {g.total2}</div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {g.rounds?.map((r, ri) => (
                            <div key={ri}>R{ri + 1}: {r.score1}–{r.score2}</div>
                          ))}
                        </div>
                      </div>
                      <span className="font-bold text-red-600 text-sm">{g.team2}</span>
                    </div>
                    {g.timestamp && (
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        {new Date(g.timestamp).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
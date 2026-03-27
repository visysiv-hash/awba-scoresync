import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays } from "lucide-react";

export default function TodaysResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getResults", {}).then(res => {
      setResults(res.data?.results || []);
      setLoading(false);
    });
  }, []);

  return (
    <Card className="shadow-2xl mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" /> Today's Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">No results submitted today yet.</p>
        ) : (
          <div className="space-y-2">
            {results.slice(0, 5).map((g, i) => {
              const winner = g.total1 > g.total2 ? g.team1 : g.total2 > g.total1 ? g.team2 : "Draw";
              return (
                <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-blue-600 truncate max-w-[30%]">{g.team1}</span>
                  <div className="text-center">
                    <span className="font-bold text-base">{g.total1} – {g.total2}</span>
                    <p className="text-xs text-muted-foreground">Net {g.net}</p>
                  </div>
                  <span className="font-medium text-red-600 truncate max-w-[30%] text-right">{g.team2}</span>
                </div>
              );
            })}
            {results.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{results.length - 5} more results</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Swords } from "lucide-react";
import AppDrawView from "./AppDrawView";
import { generateDraw } from "../../lib/drawGenerator";

// App-only scheduling: players come from today's bookings in the app, ratings
// from the app's own results, and the draw is generated here — the spreadsheet
// option on this page is left exactly as it is.
export default function AppDrawPanel({ players, onLoadPlayers, loading }) {
  const [showDraw, setShowDraw] = useState(false);
  const [variant, setVariant] = useState("normal");
  const [appRatings, setAppRatings] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("getAppRatings", {})
      .then((res) => setAppRatings(res.data?.players || []))
      .catch(() => setAppRatings([]));
  }, []);

  const merged = useMemo(() => {
    const ratings = {};
    for (const p of appRatings || []) ratings[String(p.player).toLowerCase()] = p.rating;
    return (players || []).map((p) => {
      const key = String(p.name).toLowerCase();
      return { ...p, rating: ratings[key] ?? p.rating ?? null, fromApp: ratings[key] !== undefined };
    });
  }, [players, appRatings]);

  const draw = useMemo(() => (showDraw ? generateDraw(merged, variant) : null), [showDraw, merged, variant]);

  const missing = merged.filter((p) => p.rating === null).length;

  return (
    <div className="space-y-3">
      <Button
        onClick={onLoadPlayers}
        disabled={loading}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {loading ? "Loading today's bookings…" : "Load today's app bookings"}
      </Button>

      <Button
        onClick={() => setShowDraw((s) => !s)}
        className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold"
      >
        <Swords className="w-4 h-4 mr-2" />
        {showDraw ? "Hide app draw" : "Generate app draw"}
      </Button>

      {showDraw && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={() => setVariant("normal")}
              className={variant === "normal" ? "bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold" : "bg-slate-700 hover:bg-slate-600 text-white"}
            >
              Standard
            </Button>
            <Button
              size="sm"
              onClick={() => setVariant("unique")}
              className={variant === "unique" ? "bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold" : "bg-slate-700 hover:bg-slate-600 text-white"}
            >
              Unique games
            </Button>
          </div>

          {appRatings === null ? (
            <p className="text-[11px] text-slate-400 text-center">Loading app ratings…</p>
          ) : (
            <>
              {missing > 0 && (
                <p className="text-[11px] text-amber-200 bg-amber-900/30 border border-amber-600/40 rounded-lg px-2 py-1.5">
                  {missing} player{missing === 1 ? " has" : "s have"} no app rating yet and are placed at the end.
                </p>
              )}
              <AppDrawView draw={draw} />
            </>
          )}
        </>
      )}
    </div>
  );
}
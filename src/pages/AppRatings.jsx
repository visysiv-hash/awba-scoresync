import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageBanner from "../components/PageBanner";
import AppRatingCard from "../components/ratings/AppRatingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, ArrowLeft } from "lucide-react";

const prettyDate = (d) => {
  if (!d) return "";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function AppRatings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (round) => {
    setLoading(true);
    const res = await base44.functions.invoke("getAppRatings", round ? { round } : {});
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const rounds = data?.rounds || [];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <PageBanner className="h-14 mb-2" />

        <div className="flex items-center gap-3 pt-1">
          <Link to="/" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </Link>
          <Calculator className="w-6 h-6 text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">App Ratings (Trial)</h1>
            <p className="text-[11px] text-slate-400">Calculated only from results stored in the app</p>
          </div>
        </div>

        <p className="text-[11px] text-amber-200/90 bg-amber-900/30 border border-amber-600/40 rounded-lg px-3 py-2 leading-snug">
          Trial calculation, kept separate from the spreadsheet ratings. Nothing here changes the Leaderboard.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        ) : !data?.round ? (
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 text-center">
            <p className="text-sm text-slate-300">No match results stored in the app yet.</p>
            <p className="text-xs text-slate-500 mt-1">Import the score history to fill this in.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Select value={String(data.round)} onValueChange={(v) => load(v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rounds.map((r) => (
                    <SelectItem key={r.round} value={String(r.round)}>
                      Round {r.round} · {prettyDate(r.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-slate-400 shrink-0">{data.matchCount} matches</span>
            </div>

            <div className="flex items-center gap-2 px-3 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
              <span className="w-4" />
              <span className="flex-1">Player</span>
              <span className="w-14 text-right">Diff</span>
              <span className="w-12 text-right">Rating</span>
              <span className="w-4" />
            </div>

            <div className="space-y-1.5">
              {data.players.map((p, i) => (
                <AppRatingCard key={p.player} p={p} rank={i + 1} />
              ))}
            </div>

            <p className="text-[11px] text-slate-500 text-center pb-2 leading-snug">
              Ratings as at Round {data.round}. Tap a player for their round-by-round history.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
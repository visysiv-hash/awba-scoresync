import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Star } from "lucide-react";
import { buildHistory, fetchRatedGames, ratingFlags } from "@/lib/ratingHistory";

// The ratings players have already given, read back onto tonight's draw: a pair
// who partnered before and rated it low, or two pairs who met and rated it low.
// Purely a nudge — the admin decides whether to change it.
export default function PairingHistoryReview({ record }) {
  const [games, setGames] = useState(null);

  useEffect(() => {
    fetchRatedGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  const flags = useMemo(
    () => (games ? ratingFlags(record?.matches, buildHistory(games)) : []),
    [games, record]
  );

  if (games === null) {
    return (
      <p className="text-[11px] text-slate-400 flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Checking how these pairs rated before…
      </p>
    );
  }

  if (!games.length) {
    return (
      <p className="text-[11px] text-slate-400">
        No past game ratings yet — once players rate their games, low-rated pairings show up here.
      </p>
    );
  }

  if (!flags.length) {
    return (
      <p className="text-[11px] text-emerald-300 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> No repeated pairing or matchup in this draw has
        been rated low before.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Rated low before · worth a change
      </p>
      {flags.map((flag, i) => (
        <div
          key={`${flag.net}-${flag.game}-${flag.kind}-${i}`}
          className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5 space-y-1"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              Net {flag.net} · Game {flag.game}
            </p>
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
              {flag.average.toFixed(1)}
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-slate-400 font-semibold">avg</span>
            </span>
          </div>
          <p className="text-xs text-amber-100 inline-flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{flag.text}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
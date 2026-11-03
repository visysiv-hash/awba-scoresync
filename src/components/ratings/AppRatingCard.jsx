import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AppRatingCard({ p, rank }) {
  const [open, setOpen] = useState(false);
  const rounds = [...(p.rounds || [])].reverse();

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <span className="text-[10px] text-slate-500 w-4">{rank ?? ""}</span>
        <span className="flex-1 text-sm font-semibold text-white truncate">
          {p.player}
          {p.provisional && <span className="ml-1.5 text-[9px] uppercase text-amber-400/80">prov</span>}
        </span>
        <span className="text-[10px] text-slate-400">grp {p.currentGroup}</span>
        <span className="text-[10px] text-slate-400">gp {p.gp}</span>
        <span className="text-[11px] text-slate-300 w-14 text-right">
          {p.diff >= 0 ? "+" : ""}{p.diff}
        </span>
        <span className="text-sm font-bold text-yellow-400 w-12 text-right">{p.rating.toFixed(2)}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 space-y-1 border-t border-slate-700/60">
          <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            <span>Round · group</span>
            <span>Games · diff</span>
            <span>÷</span>
            <span>Rating</span>
          </div>
          {rounds.map((r) => (
            <div key={r.round} className="flex justify-between items-center text-[11px] py-0.5">
              <span className="text-slate-300 w-20">R{r.round} · G{r.group}</span>
              <span className="text-slate-400 w-16 text-right">
                {r.gp} · {r.diff >= 0 ? "+" : ""}{r.diff}
              </span>
              <span className="text-slate-500 w-8 text-right">{r.divisor}</span>
              <span className="text-white font-semibold w-12 text-right">{r.sessionRating.toFixed(2)}</span>
            </div>
          ))}
          <p className="text-[10px] text-slate-500 pt-1 leading-snug">
            Each round starts from the previous round's rating and subtracts the adjusted diff ÷ (games × 2) ÷ divisor.
          </p>
        </div>
      )}
    </div>
  );
}
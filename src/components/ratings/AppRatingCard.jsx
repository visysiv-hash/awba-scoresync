import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function AppRatingCard({ p, rank }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <span className="text-[10px] text-slate-500 w-4">{rank}</span>
        <span className="flex-1 text-sm font-semibold text-white truncate">{p.player}</span>
        <span className="text-[10px] text-slate-400">gp {p.gp}</span>
        <span className="text-[11px] text-slate-300 w-14 text-right">
          {p.diff >= 0 ? "+" : ""}{p.diff}
        </span>
        <span className="text-sm font-bold text-yellow-400 w-12 text-right">{p.rating.toFixed(2)}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-slate-700/60">
          <p className="text-[11px] text-slate-400 leading-snug">
            Group base {p.group} − (({p.diff >= 0 ? "+" : ""}{p.diff} ÷ {p.gp * 2}) ÷ {p.divisor}) ={" "}
            <span className="text-yellow-400 font-bold">{p.rating.toFixed(2)}</span>
          </p>
          {p.matches.map((m, i) => (
            <div key={i} className="rounded-lg bg-slate-700/50 px-2 py-1.5 space-y-0.5">
              <p className="text-[11px] text-slate-300 font-semibold">Net {m.net} · Game {m.game}</p>
              <p className="text-[11px] text-slate-400 truncate">
                with {m.partner.length ? m.partner.join(" & ") : "—"} vs {m.opponents.join(" & ")}
              </p>
              <p className="text-[11px] text-white">
                {m.scoreFor}–{m.scoreAgainst}{" "}
                <span className={m.diff >= 0 ? "text-green-400" : "text-red-400"}>
                  ({m.diff >= 0 ? "+" : ""}{m.diff})
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { Trophy, Users } from "lucide-react";

const auDate = (value) => {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "";
};

export default function WrappedPartners({ partners = [], bigWin, bestNight, totals, opponentCount }) {
  return (
    <div className="space-y-2">
      {bigWin && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-300" />
            <p className="text-sm font-bold text-white">Best win</p>
          </div>
          <p className="mt-1 text-lg font-black text-emerald-200">
            {bigWin.score} <span className="text-xs font-semibold text-emerald-300/80">+{bigWin.margin}</span>
          </p>
          <p className="text-xs text-slate-300">
            {bigWin.myTeam} beat {bigWin.opponent}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{auDate(bigWin.date)}</p>
        </div>
      )}

      {partners.length > 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-300" />
            <p className="text-sm font-bold text-white">Most played with</p>
          </div>
          <div className="mt-2 space-y-1.5">
            {partners.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="truncate text-slate-200">{p.name}</span>
                <span className="shrink-0 text-slate-400">
                  {p.games} game{p.games === 1 ? "" : "s"} · {p.wins} won
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Points for", value: totals.pointsFor },
          { label: "Point diff", value: `${totals.diff >= 0 ? "+" : ""}${totals.diff}` },
          { label: "Faced", value: opponentCount },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800/60 p-2.5 text-center">
            <p className={`text-lg font-black leading-none ${s.label === "Point diff" ? (totals.diff >= 0 ? "text-emerald-300" : "text-rose-300") : "text-white"}`}>
              {s.value}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {bestNight && (
        <p className="px-1 text-[11px] text-slate-400">
          Best night: {auDate(bestNight.date)} — {bestNight.wins} of {bestNight.games} won,{" "}
          {bestNight.diff >= 0 ? "+" : ""}
          {bestNight.diff} points
        </p>
      )}
    </div>
  );
}
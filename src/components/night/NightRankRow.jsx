import { Crown } from "lucide-react";

const MEDALS = [
  "bg-amber-400 text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-400 text-orange-950",
];

export default function NightRankRow({ rank, player, max, isMe }) {
  const pct = max > 0 ? Math.max(7, Math.round((player.points / max) * 100)) : 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border px-2.5 py-2 ${
        isMe ? "border-teal-400/70 bg-teal-500/15" : "border-white/10 bg-white/5"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
          isMe
            ? "bg-gradient-to-r from-teal-400/40 to-cyan-300/10"
            : "bg-gradient-to-r from-cyan-500/25 to-transparent"
        }`}
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center gap-2">
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
            MEDALS[rank - 1] || "bg-white/10 text-slate-300"
          }`}
        >
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate flex items-center gap-1">
            <span className="truncate">{player.name}</span>
            {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
            {isMe && (
              <span className="text-[9px] font-black uppercase tracking-wider text-teal-100 bg-teal-500/40 rounded px-1 shrink-0">
                You
              </span>
            )}
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">
            {player.won}W · {player.drawn}D · {player.lost}L · {player.diff >= 0 ? "+" : ""}
            {player.diff} diff
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-black text-white leading-none">{player.points}</p>
          <p className="text-[9px] uppercase tracking-wider text-slate-400">pts</p>
        </div>
      </div>
    </div>
  );
}
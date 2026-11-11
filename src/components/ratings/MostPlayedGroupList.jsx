import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Players who have played most of their rounds in a group other than the one they
// are placed in. Ticking someone starts their rating from that most-played group.
const SETTLED_SHARE = 0.75;

export default function MostPlayedGroupList({ rows, onApply, applying }) {
  const [picked, setPicked] = useState([]);

  // New results mean the old picks no longer line up with the list.
  useEffect(() => {
    setPicked([]);
  }, [rows]);

  const isPicked = (player) => picked.includes(player);
  const toggle = (player) =>
    setPicked((current) =>
      current.includes(player) ? current.filter((p) => p !== player) : [...current, player]
    );

  // A player is settled in that group once three quarters of their rounds were
  // played there — below that they have only been passing through it.
  const settled = rows.filter((r) => r.share >= SETTLED_SHARE).map((r) => r.player);
  const allSettled = settled.length > 0 && settled.every(isPicked);
  const moves = rows.filter((r) => isPicked(r.player)).map((r) => ({ player: r.player, to: r.top }));

  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        Everyone has played most of their rounds in the group they are placed in.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-300">
          {settled.length} of {rows.length} played 75% or more of their rounds in that group.
        </p>
        <button
          onClick={() => setPicked(allSettled ? [] : settled)}
          className="shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] font-semibold text-slate-200"
        >
          {allSettled ? "Clear" : "Tick the 75% group"}
        </button>
      </div>

      <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 max-h-[420px] overflow-y-auto">
        {rows.map((row) => (
          <label
            key={row.player}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
              isPicked(row.player)
                ? "bg-yellow-400/10"
                : row.share >= SETTLED_SHARE
                  ? "bg-white/[0.03]"
                  : ""
            }`}
          >
            <input
              type="checkbox"
              checked={isPicked(row.player)}
              onChange={() => toggle(row.player)}
              className="w-3.5 h-3.5 shrink-0 accent-yellow-400"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-200 truncate">{row.player}</p>
              <p className="text-[10px] text-slate-500 tabular-nums">
                {row.plays} of {row.rounds} rounds in G{row.top} · {Math.round(row.share * 100)}%
              </p>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                row.top > row.placed ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              G{row.placed ?? "—"} → G{row.top}
            </span>
            <p className="w-12 text-right text-xs font-bold tabular-nums text-white shrink-0">
              {row.rating ?? "—"}
            </p>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onApply(moves)}
          disabled={!moves.length || applying}
          className="flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-bold text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {applying && <Loader2 className="w-3 h-3 animate-spin" />}
          Start {moves.length || "no"} player{moves.length === 1 ? "" : "s"} from their most-played group
        </button>
      </div>

      <p className="text-[10px] text-slate-500">
        Nothing changes until you press this. A player's rating is replayed from their base group round by round, so
        moving it re-derives their whole rating from that starting point.
      </p>
    </div>
  );
}
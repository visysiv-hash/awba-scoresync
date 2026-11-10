import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Players whose own results disagree with the group they are placed in, biggest
// disagreement first, with tick boxes so only the ones you pick get moved.
export default function GroupMismatchList({ rows, onApply, applying }) {
  const [picked, setPicked] = useState([]);

  // Fresh results mean the old picks no longer line up with the list.
  useEffect(() => {
    setPicked([]);
  }, [rows]);

  const isPicked = (player) => picked.includes(player);
  const toggle = (player) =>
    setPicked((current) =>
      current.includes(player) ? current.filter((p) => p !== player) : [...current, player]
    );

  const clearOnes = rows.filter((r) => r.clear).map((r) => r.player);
  const allClearPicked = clearOnes.length > 0 && clearOnes.every(isPicked);
  const moves = rows.filter((r) => isPicked(r.player)).map((r) => ({ player: r.player, to: r.to }));

  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        Everyone is in the group their results put them in.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-300">
          {rows.filter((r) => r.clear).length} of {rows.length} sit a whole group or more away from where
          their results put them.
        </p>
        <button
          onClick={() => setPicked(allClearPicked ? [] : clearOnes)}
          className="shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] font-semibold text-slate-200"
        >
          {allClearPicked ? "Clear" : "Tick the whole-group ones"}
        </button>
      </div>

      <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 max-h-[380px] overflow-y-auto">
        {rows.map((row) => (
          <label
            key={row.player}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
              isPicked(row.player) ? "bg-yellow-400/10" : row.clear ? "bg-amber-400/[0.06]" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={isPicked(row.player)}
              onChange={() => toggle(row.player)}
              className="w-3.5 h-3.5 shrink-0 accent-yellow-400"
            />
            <p className="flex-1 min-w-0 truncate text-[11px] text-slate-200">{row.player}</p>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                row.to > row.base ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              G{row.base} → G{row.to}
            </span>
            <p
              className={`w-14 text-right text-[11px] tabular-nums shrink-0 ${
                row.drift > 0 ? "text-sky-300" : "text-amber-300"
              }`}
            >
              {row.drift > 0 ? "+" : ""}
              {row.drift}
            </p>
            <p className="w-10 text-right text-[10px] text-slate-500 tabular-nums shrink-0">{row.gp}g</p>
            <p className="w-12 text-right text-xs font-bold tabular-nums text-white shrink-0">{row.rating}</p>
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
          Move {moves.length || "no"} player{moves.length === 1 ? "" : "s"} to their results group
        </button>
        <p className="text-[10px] text-slate-500">
          Nothing changes until you press this. Ticked players keep their results — only the group their
          rating starts from changes.
        </p>
      </div>

      <p className="text-[10px] text-slate-500">
        "G4 → G5" means placed in group 4 but the results have moved them a group up. The number is how far the
        results have taken them from that group — anything at or past 1.0 is a whole group.
      </p>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";

// The group each player's results place them in, worked out from the points margin
// they hold in every group they have played. Nothing is saved until you press the
// button, and only ticked players move.
export default function GroupFitList({ rows, onApply, applying }) {
  const [picked, setPicked] = useState([]);

  // New results mean the old picks no longer line up with the list.
  useEffect(() => {
    setPicked([]);
  }, [rows]);

  const moves = rows.filter((r) => picked.includes(r.player)).map((r) => ({ player: r.player, to: r.to }));
  const allPicked = rows.length > 0 && picked.length === rows.length;

  const marginText = (c) => `${c.margin > 0 ? "+" : ""}${c.margin}`;

  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        Everyone is playing at the level their results show.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-300">
          <span className="font-semibold text-slate-100">{rows.length}</span> players are placed away from where their
          points margin says they belong
        </p>
        <button
          onClick={() => setPicked(allPicked ? [] : rows.map((r) => r.player))}
          className="shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] font-semibold text-slate-200"
        >
          {allPicked ? "Clear" : "Tick all"}
        </button>
      </div>

      <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 max-h-[440px] overflow-y-auto">
        {rows.map((row) => (
          <label
            key={row.player}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
              picked.includes(row.player) ? "bg-yellow-400/10" : row.up ? "bg-emerald-500/[0.06]" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={picked.includes(row.player)}
              onChange={() =>
                setPicked((current) =>
                  current.includes(row.player)
                    ? current.filter((p) => p !== row.player)
                    : [...current, row.player]
                )
              }
              className="w-3.5 h-3.5 shrink-0 accent-yellow-400"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-200 truncate">{row.player}</p>
              <p className="text-[10px] text-slate-500 tabular-nums">
                {row.groups.map((c, i) => (
                  <span key={c.group} className={c.group === row.to ? "text-slate-200" : ""}>
                    {i > 0 && " · "}G{c.group} {marginText(c)}
                  </span>
                ))}
                {row.level % 1 !== 0 && <span className="text-slate-600"> → level {row.level}</span>}
              </p>
            </div>
            {row.up && (
              <span className="shrink-0 flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                <TrendingUp className="w-2.5 h-2.5" /> UP
              </span>
            )}
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                row.up ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              G{row.placed ?? "—"} → G{row.to}
            </span>
            <p className="w-12 text-right text-xs font-bold tabular-nums text-white shrink-0">{row.rating ?? "—"}</p>
          </label>
        ))}
      </div>

      <button
        onClick={() => onApply(moves)}
        disabled={!moves.length || applying}
        className="flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-[11px] font-bold text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {applying && <Loader2 className="w-3 h-3 animate-spin" />}
        Start {moves.length || "no"} player{moves.length === 1 ? "" : "s"} from their results group
      </button>

      <p className="text-[10px] text-slate-500">
        The margin is points a game in that group: around zero means they hold their own there. Their rating is
        replayed from the base group, so setting one re-derives their whole rating from that starting point.
      </p>
    </div>
  );
}
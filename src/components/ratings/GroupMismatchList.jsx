// Players whose own results disagree with the group they are placed in, biggest
// disagreement first. Read-only: nothing here changes a group.
export default function GroupMismatchList({ rows }) {
  const clear = rows.filter((r) => r.clear).length;

  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        Everyone is in the group their results put them in.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-slate-300">
        {clear} of {rows.length} sit a whole group or more away from where their results put them.
      </p>
      <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 max-h-[380px] overflow-y-auto">
        {rows.map((row) => (
          <div
            key={row.player}
            className={`flex items-center gap-2 px-3 py-1.5 ${row.clear ? "bg-amber-400/[0.06]" : ""}`}
          >
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
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">
        "G4 → G5" means placed in group 4 but the results have moved them a group up. The number is how far the
        results have taken them from that group — anything at or past 1.0 is a whole group.
      </p>
    </div>
  );
}
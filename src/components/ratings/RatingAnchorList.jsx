export default function RatingAnchorList({ rows }) {
  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        Every settled player already sits on their whole grade — no half step needed.
      </p>
    );
  }
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 overflow-hidden">
      {rows.map((row) => (
        <div key={row.player} className="flex items-center gap-2 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-200 truncate">{row.player}</p>
            <p className="text-[10px] text-slate-500">
              Rating {row.rating} · {row.gp} games · now in group {row.currentGroup ?? "—"}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 tabular-nums">
            {row.base == null ? "auto" : row.base} → <span className="text-yellow-400 font-bold">{row.anchor}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
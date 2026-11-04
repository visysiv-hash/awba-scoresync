// Alphabetical player list with the nets each player is on tonight, like the
// printed sheet's "FirstName / Court Numbers" columns.
export default function PlayerCourts({ matches = [], className = "" }) {
  const nets = {};
  for (const m of matches) {
    for (const n of [...(m.team1 || []), ...(m.team2 || [])]) {
      (nets[n] = nets[n] || new Set()).add(Number(m.net));
    }
  }
  const rows = Object.keys(nets).sort((a, b) => a.localeCompare(b));

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800 p-2 print:p-1 print:border-black/60 ${className}`}>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 gap-3 print:hidden">
        <span>Player</span>
        <span>Court numbers</span>
      </div>
      <div className="print:max-h-none max-h-[520px] overflow-y-auto print:overflow-visible print:grid print:grid-cols-2 print:gap-x-4">
        {[0, 1].map((i) => (
          <div
            key={`head-${i}`}
            className="hidden print:flex justify-between gap-3 text-[9px] font-bold uppercase tracking-widest mb-0.5"
          >
            <span>Player</span>
            <span>Court numbers</span>
          </div>
        ))}
        {rows.map((n) => (
          <div key={n} className="flex justify-between gap-3 text-[11px] print:text-[9px] leading-snug print:leading-tight text-slate-200 border-b border-slate-700/50 print:border-black">
            <span>{n}</span>
            <span className="font-bold text-yellow-400">
              {[...nets[n]].sort((a, b) => a - b).join(" & ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
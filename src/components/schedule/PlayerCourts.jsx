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
    <div className={`rounded-xl border border-slate-700 bg-slate-800 p-2 ${className}`}>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 gap-3">
        <span>Player</span>
        <span>Court numbers</span>
      </div>
      <div className="print:max-h-none max-h-[520px] overflow-y-auto print:overflow-visible">
        {rows.map((n) => (
          <div key={n} className="flex justify-between gap-3 text-[11px] leading-snug text-slate-200 border-b border-slate-700/50 print:border-black/30">
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
// Alphabetical player list with the nets each player is on tonight, in game order,
// like the printed sheet's "FirstName / Court Numbers" columns.
import { playerNets } from "@/lib/playerNets";

export default function PlayerCourts({ matches = [], className = "" }) {
  const rows = playerNets(matches);

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800 p-2 print:p-1 print:border-black/60 ${className}`}>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 gap-3 print:hidden">
        <span>Player</span>
        <span>Net numbers</span>
      </div>
      <div className="print:max-h-none max-h-[520px] overflow-y-auto print:overflow-visible print:grid print:grid-cols-2 print:gap-x-4">
        {[0, 1].map((i) => (
          <div
            key={`head-${i}`}
            className="hidden print:flex justify-between gap-3 text-[9px] font-bold uppercase tracking-widest mb-0.5"
          >
            <span>Player</span>
            <span>Net numbers</span>
          </div>
        ))}
        {rows.map(({ name, nets }) => (
          <div key={name} className="flex justify-between gap-3 text-[11px] print:text-[9px] leading-snug print:leading-tight text-slate-200 border-b border-slate-700/50 print:border-black">
            <span>{name}</span>
            <span className="font-bold text-yellow-400">
              {nets.length ? nets.join(" & ") : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
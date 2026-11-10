export default function BandBlockCard({ band, inVenue }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        inVenue ? "bg-slate-800 border-slate-700" : "bg-slate-800/40 border-slate-800"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className={`text-xs font-bold ${inVenue ? "text-white" : "text-slate-500"}`}>Block {band.index}</p>
        <p className="text-[10px] text-slate-400">
          {band.players.length} players · avg {band.average}
        </p>
      </div>
      <p className="text-[10px] text-slate-500 mt-0.5">
        Spread {band.spread}
        {band.cutGap != null && ` · gap below ${band.cutGap}`}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
        {band.players.map((p) => (
          <p key={p.player} className="text-[11px] text-slate-300 truncate">
            {p.player} <span className="text-slate-500">{Number(p.rating).toFixed(2)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
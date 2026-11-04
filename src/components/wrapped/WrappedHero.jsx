export default function WrappedHero({ data }) {
  const { player, seasonLabel, range, rating, totals } = data;
  const change = rating.change;
  const stats = [
    { label: "Games", value: totals.games },
    { label: "Wins", value: totals.wins },
    { label: "Win rate", value: `${totals.winRate}%` },
    { label: "Nights", value: totals.nights },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 p-5 shadow-2xl">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
      <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-black/10" />

      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          {seasonLabel} · Stats
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-white">{player}</h1>
        {range?.from && (
          <p className="mt-0.5 text-xs text-white/70">
            {new Date(`${range.from}T00:00:00`).toLocaleDateString()} onward
          </p>
        )}

        <div className="mt-4 flex items-end gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/70">Rating</p>
            <p className="text-4xl font-black text-white">
              {rating.now != null ? rating.now.toFixed(2) : "—"}
            </p>
          </div>
          {change != null && (
            <span
              className={`mb-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                change >= 0 ? "bg-emerald-400/90 text-emerald-950" : "bg-rose-500/90 text-white"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)} this season
            </span>
          )}
        </div>
        {rating.group != null && (
          <p className="mt-1 text-xs text-white/75">
            Playing Group {rating.group}
            {rating.provisional ? " · provisional" : ""}
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/15 p-2 text-center backdrop-blur">
              <p className="text-lg font-black leading-none text-white">{s.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
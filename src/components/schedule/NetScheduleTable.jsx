// One block per net, three games down it, exactly like the printed schedule:
// game number, pair, vs, pair, then two empty score boxes. Names are tappable so
// an admin can swap any two players, in the same group or a different one.
const nameBtn = (name, picked, onPick) => {
  const active = picked === name;
  return (
    <button
      key={name}
      type="button"
      disabled={!onPick}
      onClick={() => onPick?.(name)}
      className={`rounded px-0.5 transition-colors ${
        active ? "bg-yellow-400 text-slate-900 font-bold" : onPick ? "hover:bg-black/10" : "cursor-default"
      }`}
    >
      {name}
    </button>
  );
};

const pair = (team, picked, onPick) => {
  const names = team || [];
  if (!names.length) return <span className="text-black/30">—</span>;
  return names.map((n, i) => (
    <span key={n}>
      {i > 0 && <span className="font-semibold"> &amp; </span>}
      {nameBtn(n, picked, onPick)}
    </span>
  ));
};

export default function NetScheduleTable({ matches = [], picked, onPick }) {
  if (!matches.length) return null;

  const nets = [...new Set(matches.map((m) => Number(m.net)))]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {nets.map((net) => (
        <div
          key={net}
          className="rounded-lg border-2 border-black/70 overflow-hidden break-inside-avoid bg-orange-200 text-black"
        >
          <div className="bg-orange-300 border-b-2 border-black/70 text-center py-1">
            <p className="text-[8px] font-bold tracking-[0.2em] text-black/70">NET NUMBER</p>
            <p className="text-xl font-black leading-none">{net}</p>
          </div>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {[1, 2, 3].map((game) => {
                const m = matches.find((x) => Number(x.net) === net && Number(x.game) === game);
                return (
                  <tr key={game} className="border-t border-black/30 first:border-t-0">
                    <td className="w-5 text-center font-bold border-r border-black/30">{game}</td>
                    <td className="px-1.5 py-1 leading-snug">{pair(m?.team1, picked, onPick)}</td>
                    <td className="w-6 text-center">
                      <span className="inline-block bg-white text-red-600 font-bold px-1 rounded-sm">vs</span>
                    </td>
                    <td className="px-1.5 py-1 leading-snug">{pair(m?.team2, picked, onPick)}</td>
                    <td className="w-6 border-l border-black/30" />
                    <td className="w-6 border-l border-black/30" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
// One block per net, three games down it, exactly like the printed schedule:
// game number, pair, vs, pair, then two empty score boxes. Each pair shows its
// average rating so an admin can see at a glance how balanced the game is.
// Names are tappable so an admin can swap any two players.
import { pairAverage } from "@/lib/appRatingMap";

const nameBtn = (name, picked, onPick, match) => {
  const active = picked === name;
  return (
    <button
      key={name}
      type="button"
      disabled={!onPick}
      onClick={() => onPick?.(name, match)}
      className={`rounded px-0.5 transition-colors ${
        active ? "bg-yellow-400 text-slate-900 font-bold" : onPick ? "hover:bg-black/10" : "cursor-default"
      }`}
    >
      {name}
    </button>
  );
};

const pair = (team, picked, onPick, match, ratings) => {
  const names = team || [];
  if (!names.length) return <span className="text-black/30">—</span>;
  const total = pairAverage(names, ratings);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span className="inline-flex flex-wrap items-baseline">
        {names.map((n, i) => (
          <span key={n}>
            {i > 0 && <span className="font-semibold"> &amp; </span>}
            {nameBtn(n, picked, onPick, match)}
          </span>
        ))}
      </span>
      {total !== null && (
        <span className="text-[9px] font-bold text-black/50 leading-none print:text-[8px]">{total.toFixed(2)}</span>
      )}
    </span>
  );
};

export default function NetScheduleTable({ matches = [], picked, pickedGame, onPick, ratings = {} }) {
  if (!matches.length) return null;

  const nets = [...new Set(matches.map((m) => Number(m.net)))]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 print:gap-1 print:w-full">
      {nets.map((net) => (
        <div
          key={net}
          className="rounded-lg border-2 border-black/70 overflow-hidden break-inside-avoid bg-orange-200 text-black print:rounded-none print:overflow-visible print:border-black"
        >
          <div className="bg-orange-300 border-b-2 border-black/70 text-center py-1 print:py-0 print:border-black">
            <p className="text-[8px] font-bold tracking-[0.2em] text-black/70">NET NUMBER</p>
            <p className="text-xl font-black leading-none print:text-[11px]">{net}</p>
          </div>
          <table className="w-full table-fixed border-collapse text-[11px] print:text-[9px]">
            <colgroup>
              <col className="w-5" />
              <col />
              <col className="w-7 print:w-6" />
              <col />
            </colgroup>
            <tbody>
              {[1, 2, 3].map((game) => {
                const m = matches.find((x) => Number(x.net) === net && Number(x.game) === game);
                const selected = !pickedGame || (pickedGame.net === net && pickedGame.game === game) ? picked : null;
                return (
                  <tr key={game} className="border-t border-black/30 first:border-t-0 print:border-black">
                    <td className="text-center font-bold border-r border-black/30 print:border-black">{game}</td>
                    <td className="px-1.5 py-1 leading-snug align-middle text-right print:py-0.5 print:px-1.5 print:leading-tight">{pair(m?.team1, selected, onPick, m, ratings)}</td>
                    <td className="px-0.5 text-center align-middle border-x border-black/30 print:border-black">
                      <span className="inline-block bg-white text-red-600 font-bold px-0.5 rounded-sm">vs</span>
                    </td>
                    <td className="px-1.5 py-1 leading-snug align-middle print:py-0.5 print:px-1.5 print:leading-tight">{pair(m?.team2, selected, onPick, m, ratings)}</td>
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
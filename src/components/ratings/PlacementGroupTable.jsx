const marginClass = (margin) =>
  margin > 0 ? "text-emerald-600" : margin < 0 ? "text-rose-500" : "text-slate-500";
const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

// Every group a player has turned out in, with the margin they hold there.
export default function PlacementGroupTable({ groups = [], placed, anchorGroup }) {
  if (!groups.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-[10px] tabular-nums">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-2 py-1 text-left font-semibold">Group</th>
            <th className="px-2 py-1 text-right font-semibold">Games</th>
            <th className="px-2 py-1 text-right font-semibold">Points/game</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.map((g) => (
            <tr
              key={g.group}
              className={g.group === placed ? "bg-amber-50" : g.group === anchorGroup ? "bg-slate-50" : ""}
            >
              <td className="px-2 py-1 text-slate-700">
                G{g.group}
                {g.group === placed && <span className="text-amber-700"> · placed</span>}
                {g.group === anchorGroup && <span className="text-slate-500"> · main</span>}
                {!g.counted && <span className="text-slate-400"> · small sample</span>}
              </td>
              <td className="px-2 py-1 text-right text-slate-600">{g.games}</td>
              <td className={`px-2 py-1 text-right font-bold ${marginClass(g.margin)}`}>
                {signed(g.margin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
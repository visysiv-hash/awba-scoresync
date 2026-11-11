const marginClass = (margin) =>
  margin > 0 ? "text-emerald-600" : margin < 0 ? "text-rose-500" : "text-slate-500";
const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

// The same games cut two ways: against their own group or against other groups,
// and alongside a stronger or a weaker partner.
export default function PlacementSplits({ splits }) {
  if (!splits) return null;

  const rows = [
    { label: "Against their own group", data: splits.ownGroup },
    { label: "Against other groups", data: splits.otherGroups },
    { label: "With a stronger partner", data: splits.strongPartner },
    { label: "With a weaker partner", data: splits.weakPartner },
  ].filter((r) => r.data && r.data.games > 0);

  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-[10px] tabular-nums">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-2 py-1 text-left font-semibold">Split</th>
            <th className="px-2 py-1 text-right font-semibold">Games</th>
            <th className="px-2 py-1 text-right font-semibold">Points/game</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-2 py-1 text-slate-700">{r.label}</td>
              <td className="px-2 py-1 text-right text-slate-600">{r.data.games}</td>
              <td className={`px-2 py-1 text-right font-bold ${marginClass(r.data.margin)}`}>
                {signed(r.data.margin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
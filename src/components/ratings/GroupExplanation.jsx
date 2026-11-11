import { Info } from "lucide-react";

const marginClass = (margin) =>
  margin > 0 ? "text-emerald-600" : margin < 0 ? "text-rose-500" : "text-slate-500";
const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

// Why a player sits in the group they do, read from the groups they have actually
// played. Move suggestions are only drawn when an admin is looking.
export default function GroupExplanation({ detail, admin = false }) {
  if (!detail) return null;
  const { placed, to, groups, anchorGroup, reasons, suggestions = [], moves = [] } = detail;

  return (
    <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Why Group {placed ?? "—"}
        </h3>
        {admin && placed != null && to != null && to !== placed && (
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 tabular-nums">
            Results say G{to}
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-[11px] text-slate-500">No games recorded yet.</p>
      ) : (
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
                  className={
                    g.group === placed
                      ? "bg-amber-50"
                      : g.group === anchorGroup
                      ? "bg-slate-50"
                      : ""
                  }
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
      )}

      <ul className="space-y-1">
        {reasons.map((line) => (
          <li key={line} className="text-[11px] text-slate-600 leading-snug flex gap-1.5">
            <span className="text-slate-400">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {admin && suggestions.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5">
          {suggestions.map((line) => (
            <li key={line} className="text-[11px] text-amber-800 leading-snug flex gap-1.5">
              <span className="text-amber-500">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {moves.length > 0 && (
        <details className="text-[11px] text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-700">How a player moves up or down</summary>
          <ul className="mt-1 space-y-1">
            {moves.map((line) => (
              <li key={line} className="leading-snug flex gap-1.5">
                <span className="text-slate-400">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[10px] text-slate-500">
        Points per game is points for minus points against, averaged over the games they played in that group. Their
        main group is the one holding most of their games — that margin is what places them.
      </p>
    </section>
  );
}
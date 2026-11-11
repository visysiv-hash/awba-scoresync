import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Info } from "lucide-react";
import { explainPlacement } from "@/lib/placementExplain";

const marginClass = (margin) =>
  margin > 0 ? "text-emerald-300" : margin < 0 ? "text-rose-300" : "text-slate-300";
const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

// Everything behind one player's group: the groups they have played, how they went,
// where their results point, and what would move them up or down.
export default function PlacementExplainer({ player, baseGroup, onClose }) {
  if (!player) return null;
  const detail = explainPlacement(player, baseGroup);
  const { name, rating, gp, placed, to, groups, anchorGroup, reasons, suggestions = [], moves } = detail;
  const move = placed != null && to != null && to !== placed;

  return (
    <Dialog open={!!player} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            {name}
            <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900 tabular-nums">
              {rating ?? "—"}
            </span>
            <span className="text-[11px] font-normal text-slate-400">{gp} games</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <div>
            <p className="text-[10px] text-slate-400">Placed</p>
            <p className="text-sm font-bold">G{placed ?? "—"}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 mt-3" />
          <div>
            <p className="text-[10px] text-slate-400">Results say</p>
            <p className={`text-sm font-bold ${move ? "text-yellow-300" : "text-emerald-300"}`}>G{to ?? "—"}</p>
          </div>
          {detail.level != null && (
            <p className="ml-auto text-[10px] text-slate-500 text-right tabular-nums">
              level {detail.level}
              {move && <span className="block text-yellow-300/80">{to < placed ? "move up" : "move down"}</span>}
            </p>
          )}
        </div>

        <section className="space-y-1">
          <h3 className="text-[11px] font-bold text-slate-300">Where they have played</h3>
          {groups.length === 0 ? (
            <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              No games recorded yet.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-[10px] tabular-nums">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="text-left font-medium px-2 py-1">Group</th>
                    <th className="text-right font-medium px-2 py-1">Games</th>
                    <th className="text-right font-medium px-2 py-1">Points/game</th>
                    <th className="text-right font-medium px-2 py-1">Best</th>
                    <th className="text-right font-medium px-2 py-1">Worst</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {groups.map((g) => (
                    <tr
                      key={g.group}
                      className={
                        g.group === placed
                          ? "bg-yellow-400/10"
                          : g.group === anchorGroup
                          ? "bg-white/[0.04]"
                          : ""
                      }
                    >
                      <td className="px-2 py-1 text-slate-200">
                        G{g.group}
                        {g.group === placed && <span className="text-yellow-300"> · placed</span>}
                        {g.group === anchorGroup && <span className="text-slate-400"> · main</span>}
                        {!g.counted && <span className="text-slate-500"> · {g.games}/{9}</span>}
                      </td>
                      <td className="px-2 py-1 text-right text-slate-300">{g.games}</td>
                      <td className={`px-2 py-1 text-right font-bold ${marginClass(g.margin)}`}>
                        {signed(g.margin)}
                      </td>
                      <td className="px-2 py-1 text-right text-emerald-300/80">{signed(g.best)}</td>
                      <td className="px-2 py-1 text-right text-rose-300/80">{signed(g.worst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-slate-500">
            Best and worst are their best and worst single round (points for minus against across that round's
            games). Their main group is the one holding most of their games — that margin is what places them.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
            <Info className="w-3 h-3" /> Why G{placed ?? "—"}
          </h3>
          <div className="space-y-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
            {reasons.map((line) => (
              <p key={line} className="text-[11px] leading-relaxed text-slate-300">
                {line}
              </p>
            ))}
          </div>
        </section>

        {suggestions.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-yellow-400/10 border border-yellow-400/30 px-3 py-2">
            {suggestions.map((line) => (
              <li key={line} className="text-[11px] text-yellow-200 leading-snug flex gap-1.5">
                <span className="text-yellow-500">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-1">
          <h3 className="text-[11px] font-bold text-slate-300">How they move</h3>
          <ul className="space-y-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
            {moves.map((line) => (
              <li key={line} className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                <span className="text-slate-600">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[10px] text-slate-500">
          Applying a move only changes the group their rating starts from — every result they have played stays
          exactly as it is, and the rating is replayed from the new starting point.
        </p>
      </DialogContent>
    </Dialog>
  );
}
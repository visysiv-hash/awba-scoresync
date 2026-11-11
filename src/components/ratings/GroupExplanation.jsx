import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import PlacementGroupTable from "./PlacementGroupTable";
import PlacementSplits from "./PlacementSplits";

// Why a player sits in the group they do, read from the groups they have actually
// played and the strength of the partners and opponents they met there. Move
// suggestions and the fairness flags are only drawn when an admin is looking.
export default function GroupExplanation({ detail, admin = false, title, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);
  if (!detail) return null;

  const { placed, to, groups, anchorGroup, reasons, suggestions = [], moves = [], splits } = detail;
  const heading = title ?? `Why Group ${placed ?? "—"}`;

  const header = (
    <>
      <span className="flex items-center gap-1">
        <Info className="w-3.5 h-3.5" /> {heading}
      </span>
      {admin && placed != null && to != null && to !== placed && (
        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 tabular-nums">
          Results say G{to}
        </span>
      )}
    </>
  );

  if (collapsible && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
      >
        {header}
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
      </button>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      {collapsible ? (
        <button
          onClick={() => setOpen(false)}
          className="flex w-full items-center justify-between gap-2 text-xs font-bold text-slate-700"
        >
          {header}
          <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" />
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">{header}</h3>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-[11px] text-slate-500">No games recorded yet.</p>
      ) : (
        <PlacementGroupTable groups={groups} placed={placed} anchorGroup={anchorGroup} />
      )}

      <PlacementSplits splits={splits} />

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
        Points per game is points for minus points against, averaged over the games in that group. Their main group is
        the one holding most of their games — that margin places them. The split shows whether that margin was built
        against their own group or borrowed from a stronger partner.
      </p>
    </section>
  );
}
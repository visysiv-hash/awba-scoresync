import { useState } from "react";

const TONE = {
  yellow: "bg-yellow-500/15 text-yellow-300 border-yellow-400/40",
  green: "bg-green-500/15 text-green-300 border-green-400/40",
  gray: "bg-white/5 text-slate-400 border-white/10",
};

export default function BaseGroupCheckList({ rows }) {
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const flagged = rows.filter((r) => r.tone === "yellow");
  const shown = flaggedOnly ? flagged : rows;

  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        No rated player yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-slate-500 flex-1">
          {rows.length} rated players · {flagged.length} look wrong
        </p>
        <button
          type="button"
          onClick={() => setFlaggedOnly(true)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            flaggedOnly ? "bg-yellow-500 text-slate-900" : "bg-white/10 text-slate-300"
          }`}
        >
          Flagged {flagged.length}
        </button>
        <button
          type="button"
          onClick={() => setFlaggedOnly(false)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            !flaggedOnly ? "bg-white text-slate-900" : "bg-white/10 text-slate-300"
          }`}
        >
          All players
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-[11px] text-green-300 bg-green-500/10 border border-green-400/30 rounded-lg px-3 py-2">
          Every starting group is backed by that player's history.
        </p>
      ) : (
        <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 overflow-hidden">
          {shown.map((row) => (
            <div key={row.player} className="px-3 py-2 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-200 flex-1 min-w-0 truncate">{row.player}</p>
                <p className="text-[11px] text-slate-400 tabular-nums shrink-0">
                  base <span className="text-white font-bold">{row.base ?? "—"}</span>
                  <span className="text-slate-500"> {row.manual ? "by hand" : "auto"}</span> · rating {row.rating}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 flex-1 min-w-0">
                  {row.level == null ? "no games played" : `plays around ${row.level}`}
                  {row.margin != null && ` · ${row.margin > 0 ? "+" : ""}${row.margin} pts/game`}
                  {` · ${row.games} games`}
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${TONE[row.tone]}`}
                >
                  {row.verdict}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
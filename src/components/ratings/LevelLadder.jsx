import { useState } from "react";

// Every player on the ladder their own results put them on: the rolling rating,
// with how far it has moved from the group they started in. Nothing here treats a
// starting group as truth, so two players can be compared on results alone.
export default function LevelLadder({ rows }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => r.player.toLowerCase().includes(needle)) : rows;

  if (!rows.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        No player has played a game yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a player to compare…"
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400/60"
      />
      <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 overflow-hidden max-h-[420px] overflow-y-auto">
        {shown.map((row) => (
          <div key={row.player} className="flex items-center gap-2 px-3 py-1.5">
            <p className="text-[11px] text-slate-200 flex-1 min-w-0 truncate">{row.player}</p>
            <p className="text-[11px] tabular-nums text-slate-400 shrink-0">
              {row.margin != null && (
                <span className={row.margin > 0 ? "text-green-400" : "text-red-400"}>
                  {row.margin > 0 ? "+" : ""}
                  {row.margin}{" "}
                </span>
              )}
              {row.games}g
            </p>
            <p className="w-16 text-right text-[11px] tabular-nums shrink-0">
              {row.drift == null ? (
                <span className="text-slate-500">—</span>
              ) : (
                <span className={row.drift > 0 ? "text-green-400" : row.drift < 0 ? "text-red-400" : "text-slate-500"}>
                  {row.drift > 0 ? "+" : ""}
                  {row.drift}
                </span>
              )}
            </p>
            <p className="w-12 text-right text-xs font-bold tabular-nums text-white shrink-0">{row.rating}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">
        Rating = where their own results have taken them. The coloured number is how far that has moved from the
        group they started in. A whole group is about 1.0 apart, so two players less than 0.5 apart are the same level.
      </p>
    </div>
  );
}
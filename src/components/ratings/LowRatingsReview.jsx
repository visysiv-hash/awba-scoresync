import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Star } from "lucide-react";

const auDate = (value) => {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value || "");
};

/**
 * Admin view of the low star ratings: every player who marked a game down, and the
 * game they marked down. Recent nights only, so the list stays short enough to read.
 */
export default function LowRatingsReview() {
  const [rows, setRows] = useState(null);
  const [limit, setLimit] = useState(2);

  useEffect(() => {
    base44.entities.MatchResult.list({ sort: "-date", limit: 200 })
      .then((page) => setRows(page.items || []))
      .catch(() => setRows([]));
  }, []);

  const { low, games } = useMemo(() => {
    const out = [];
    for (const m of rows || []) {
      for (const r of m.player_ratings || []) {
        const stars = Number(r.rating);
        if (!stars || stars > limit) continue;
        out.push({
          date: m.date,
          net: m.net,
          game: m.game,
          team1: m.team1,
          team2: m.team2,
          player: r.player,
          rating: stars,
        });
      }
    }
    out.sort((a, b) => a.rating - b.rating || String(b.date).localeCompare(String(a.date)));
    const keys = new Set(out.map((r) => `${r.date}|${r.net}|${r.game}`));
    return { low: out, games: keys.size };
  }, [rows, limit]);

  return (
    <div className="mt-4 bg-white rounded-lg border shadow-sm p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Low ratings</h2>
          <p className="text-[11px] text-slate-500">
            Who marked a game down, and which game — from the last 200 rated results.
          </p>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
        >
          <option value={1}>1 star</option>
          <option value={2}>2 or less</option>
          <option value={3}>3 or less</option>
        </select>
      </div>

      {rows === null ? (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading ratings…
        </p>
      ) : !low.length ? (
        <p className="text-xs text-slate-500">Nobody has rated a game {limit} stars or less.</p>
      ) : (
        <>
          <p className="text-[11px] font-semibold text-slate-600">
            {low.length} low {low.length === 1 ? "rating" : "ratings"} across {games}{" "}
            {games === 1 ? "game" : "games"}
          </p>
          <div className="divide-y rounded-lg border max-h-72 overflow-y-auto">
            {low.map((r, i) => (
              <div key={i} className="px-2.5 py-2 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 truncate">{r.player}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                    {r.rating}
                    <Star className="w-3 h-3 fill-red-500 text-red-500" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {auDate(r.date)} · Net {r.net} · Match {r.game}
                </p>
                <p className="text-[11px] text-slate-600">
                  {r.team1} <span className="text-slate-400">vs</span> {r.team2}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
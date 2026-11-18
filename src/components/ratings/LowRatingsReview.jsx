import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Star } from "lucide-react";

const auDate = (value) => {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value || "");
};

// Every way the committee can slice the ratings: the low ones to spot problems, the
// high ones to see which games people loved.
const FILTERS = [
  { value: "low", label: "2 or less", match: (s) => s <= 2, high: false },
  { value: "3low", label: "3 or less", match: (s) => s <= 3, high: false },
  { value: "one", label: "Only 1 star", match: (s) => s === 1, high: false },
  { value: "5", label: "5 stars", match: (s) => s === 5, high: true },
  { value: "4", label: "4 stars", match: (s) => s === 4, high: true },
  { value: "4up", label: "4 or more", match: (s) => s >= 4, high: true },
  { value: "3", label: "3 stars", match: (s) => s === 3, high: true },
  { value: "all", label: "All ratings", match: () => true, high: true },
];

const colour = (stars) =>
  stars <= 2 ? "text-red-600" : stars === 3 ? "text-amber-600" : "text-emerald-600";
const starFill = (stars) =>
  stars <= 2 ? "fill-red-500 text-red-500" : stars === 3 ? "fill-amber-500 text-amber-500" : "fill-emerald-500 text-emerald-500";

/**
 * Admin view of who rated a game, and which game. Pick a star level to see the low
 * ones that need attention or the 5-star games worth celebrating. Recent nights only,
 * so the list stays short enough to read.
 */
export default function LowRatingsReview() {
  const [rows, setRows] = useState(null);
  const [filterKey, setFilterKey] = useState("low");

  useEffect(() => {
    base44.entities.MatchResult.list({ sort: "-date", limit: 200 })
      .then((page) => setRows(page.items || []))
      .catch(() => setRows([]));
  }, []);

  const filter = FILTERS.find((f) => f.value === filterKey) || FILTERS[0];

  const { list, games } = useMemo(() => {
    const out = [];
    for (const m of rows || []) {
      for (const r of m.player_ratings || []) {
        const stars = Number(r.rating);
        if (!stars || !filter.match(stars)) continue;
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
    out.sort((a, b) =>
      filter.high ? b.rating - a.rating : a.rating - b.rating
      || String(b.date).localeCompare(String(a.date))
    );
    const keys = new Set(out.map((r) => `${r.date}|${r.net}|${r.game}`));
    return { list: out, games: keys.size };
  }, [rows, filterKey]);

  return (
    <div className="mt-4 bg-white rounded-lg border shadow-sm p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Game ratings</h2>
          <p className="text-[11px] text-slate-500">
            Who rated a game, and which game — from the last 200 rated results.
          </p>
        </div>
        <select
          value={filterKey}
          onChange={(e) => setFilterKey(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {rows === null ? (
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading ratings…
        </p>
      ) : !list.length ? (
        <p className="text-xs text-slate-500">No one has rated a game {filter.label.toLowerCase()} yet.</p>
      ) : (
        <>
          <p className="text-[11px] font-semibold text-slate-600">
            {list.length} {list.length === 1 ? "rating" : "ratings"} across {games}{" "}
            {games === 1 ? "game" : "games"}
          </p>
          <div className="divide-y rounded-lg border max-h-72 overflow-y-auto">
            {list.map((r, i) => (
              <div key={i} className="px-2.5 py-2 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800 truncate">{r.player}</span>
                  <span className={`flex items-center gap-1 text-xs font-bold ${colour(r.rating)}`}>
                    {r.rating}
                    <Star className={`w-3 h-3 ${starFill(r.rating)}`} />
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
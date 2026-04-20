import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import SuggestedSchedule from "../components/SuggestedSchedule";

export default function PlayerAvailability() {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("rating");
  const [sortDir, setSortDir] = useState("asc");
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.functions.invoke("getPlayerAvailability", {}),
      base44.functions.invoke("getPlayerRatings", {}),
    ]).then(([availRes, ratingsRes]) => {
      setAvailablePlayers(availRes.data?.players || []);
      setRatings(ratingsRes.data?.players || []);
    }).finally(() => setLoading(false));
  }, []);

  const ratingMap = useMemo(() => {
    const map = {};
    for (const p of ratings) map[p.player] = p;
    return map;
  }, [ratings]);

  const merged = useMemo(() => {
    return availablePlayers.map(name => {
      const r = ratingMap[name];
      return {
        name,
        rating: r ? r.rating : null,
        gp: r ? r.gp : 0,
        diff: r ? r.diff : 0,
        currentGroup: r ? r.currentGroup : null,
        hasStats: r ? r.hasStats : false,
      };
    });
  }, [availablePlayers, ratingMap]);

  const sorted = useMemo(() => {
    return [...merged].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Put nulls at end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [merged, sortField, sortDir]);

  const schedulePlayers = useMemo(() => {
    return [...merged].sort((a, b) => {
      if (a.rating === null && b.rating === null) return 0;
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return a.rating - b.rating;
    });
  }, [merged]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-yellow-500" /> : <ArrowDown className="w-3 h-3 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2 pb-1">
          <Users className="w-6 h-6 text-yellow-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tuesday Night Availability</h1>
            <p className="text-xs text-slate-400">Players available this week, sorted by rating</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        ) : (
          <>
          <Button
            onClick={() => setShowSchedule(s => !s)}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {showSchedule ? "Hide Suggested Schedule" : "Suggest Schedule"}
          </Button>

          {showSchedule && <SuggestedSchedule players={schedulePlayers} />}

          <Card className="bg-slate-800 border-slate-700 text-white shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{sorted.length} players available</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 border-b border-slate-700 text-xs text-slate-400">
                <button
                  className="col-span-1 text-left flex items-center gap-1"
                  onClick={() => handleSort("rating")}
                >
                  # <SortIcon field="rating" />
                </button>
                <button
                  className="col-span-5 text-left flex items-center gap-1"
                  onClick={() => handleSort("name")}
                >
                  Player <SortIcon field="name" />
                </button>
                <button
                  className="col-span-2 text-right flex items-center justify-end gap-1"
                  onClick={() => handleSort("currentGroup")}
                >
                  Grp <SortIcon field="currentGroup" />
                </button>
                <button
                  className="col-span-2 text-right flex items-center justify-end gap-1"
                  onClick={() => handleSort("gp")}
                >
                  MP <SortIcon field="gp" />
                </button>
                <button
                  className="col-span-2 text-right flex items-center justify-end gap-1"
                  onClick={() => handleSort("rating")}
                >
                  Rating <SortIcon field="rating" />
                </button>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-700/50">
                {sorted.map((p, i) => (
                  <div key={p.name} className="grid grid-cols-12 gap-1 px-3 py-2.5 hover:bg-slate-700/40 transition-colors text-sm">
                    <span className="col-span-1 text-xs text-slate-500 font-bold self-center">{i + 1}</span>
                    <div className="col-span-5 self-center">
                      <p className="font-semibold text-white leading-tight">{p.name}</p>
                      {p.gp > 0 && (
                        <p className="text-xs text-slate-400">Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                      )}
                    </div>
                    <span className="col-span-2 text-right self-center text-slate-300 text-xs">
                      {p.currentGroup !== null ? p.currentGroup : "—"}
                    </span>
                    <span className="col-span-2 text-right self-center text-slate-300 text-xs">
                      {p.gp > 0 ? p.gp : "—"}
                    </span>
                    <span className={`col-span-2 text-right self-center font-bold text-sm ${p.hasStats ? "text-yellow-400" : "text-slate-500"}`}>
                      {p.rating !== null ? p.rating : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </>
        )}

        <p className="text-xs text-slate-500 text-center pb-2">
          Lower rating = stronger player · Tap column headers to sort
        </p>
      </div>
    </div>
  );
}
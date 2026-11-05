import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Flame, Loader2, ChevronRight } from "lucide-react";
import { getCurrentMember } from "@/lib/currentMember";
import { formatAusDate } from "@/lib/dateFormat";
import NightRankRow from "./NightRankRow";

export default function NightProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const member = getCurrentMember();
  const myName = String(member?.display_name || member?.full_name || "").trim().toLowerCase();

  useEffect(() => {
    base44.functions
      .invoke("getNightProgress", {})
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const players = data?.players || [];
  const max = players[0]?.points || 0;
  const shown = players.slice(0, showAll ? 10 : 5);
  const myIndex = myName ? players.findIndex((p) => p.name.trim().toLowerCase() === myName) : -1;
  const me = myIndex >= 0 ? players[myIndex] : null;
  const meShown = myIndex >= 0 && myIndex < shown.length;
  const progress = data?.totalGames ? Math.round((data.scoredGames / data.totalGames) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/90 to-slate-900 shadow-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0 mt-0.5">
            {data?.live && <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-70 animate-ping" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${data?.live ? "bg-teal-400" : "bg-slate-500"}`} />
          </span>
          <div>
            <p className="text-sm font-black text-white leading-tight flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Night Ladder
            </p>
            <p className="text-[10px] text-slate-400 leading-tight">
              {data?.live ? "Live" : "Last session"}
              {data?.date ? ` · ${formatAusDate(data.date)}` : ""}
              {data?.totalGames ? ` · ${data.scoredGames}/${data.totalGames} games in` : ""}
            </p>
          </div>
        </div>
        <Link to="/leaderboard?tab=rankings" className="text-[11px] text-teal-300 font-semibold flex items-center gap-0.5 shrink-0">
          Season <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {data?.totalGames ? (
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      <div className="flex gap-1.5 mt-2.5 mb-2">
        {[5, 10].map((n) => (
          <button
            key={n}
            onClick={() => setShowAll(n === 10)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
              (n === 10) === showAll
                ? "bg-teal-500 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            Top {n}
          </button>
        ))}
        {players.length > 0 && <span className="text-[10px] text-slate-500 self-center ml-auto">{players.length} players scored</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading the night…
        </div>
      ) : players.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No games scored yet — the ladder fills up as scores come in.</p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((p, i) => (
            <NightRankRow key={p.name} rank={i + 1} player={p} max={max} isMe={myIndex === i} />
          ))}
          {me && !meShown && (
            <div className="pt-1.5 border-t border-white/10">
              <NightRankRow rank={myIndex + 1} player={me} max={max} isMe />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
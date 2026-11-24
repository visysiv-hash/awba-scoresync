import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { PlusCircle } from "lucide-react";

// Tonight's optional 4th game, as the admin published it. It is read-only by design:
// no scores are entered for it, and it only exists for that night.
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

export default function FourthGameCard() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    base44.entities.DrawNight.filter({ date: today() }, { sort: "-created_date", limit: 5 })
      .then((page) => {
        const record = (page.items || []).find((n) => !n.archived && n.extra_published);
        setGames(record?.extra_games || []);
      })
      .catch(() => {});
  }, []);

  if (!games.length) return null;

  return (
    <div className="rounded-xl bg-white border border-yellow-300 shadow-sm p-4 mb-4">
      <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
        <PlusCircle className="w-4 h-4 text-yellow-500" /> Optional 4th game
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Mixed grades, just for fun. No scores are entered and nothing here counts towards results or rankings.
      </p>
      <div className="mt-3 space-y-2">
        {games.map((game, i) => (
          <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Net {game.net}</p>
            <p className="text-sm text-slate-900">
              <span className="font-semibold">{(game.team1 || []).join(" & ")}</span>
              <span className="text-slate-400 text-xs"> vs </span>
              <span className="font-semibold">{(game.team2 || []).join(" & ")}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
import { Star } from "lucide-react";
import { gamePlayers } from "@/lib/teamNames";

/**
 * Who has given their stars for a game, and who is still to answer. Shown beside the
 * rating form so everyone can see where the game's average comes from.
 */
export default function GameRatingsSummary({ team1, team2, playerRatings = [], rating }) {
  const players = gamePlayers(team1, team2);
  if (!players.length) return null;

  const given = new Map(
    (playerRatings || [])
      .filter((r) => Number(r.rating) > 0)
      .map((r) => [String(r.player || "").trim().toLowerCase(), Number(r.rating)])
  );
  const count = players.filter((n) => given.has(n.toLowerCase())).length;

  return (
    <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Who has rated · {count} of {players.length}
      </p>
      {players.map((name) => {
        const stars = given.get(name.toLowerCase());
        return (
          <div key={name} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-700">{name}</span>
            {stars ? (
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                {stars}
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </span>
            ) : (
              <span className="text-xs text-slate-400">still to rate</span>
            )}
          </div>
        );
      })}
      {rating ? (
        <p className="pt-1 text-xs font-semibold text-slate-600 border-t">
          Game average: {rating}/5
        </p>
      ) : null}
    </div>
  );
}
import StarRating from "@/components/StarRating";
import { gamePlayers } from "@/lib/teamNames";

/** Every player in the game gets their own stars — one row per name. */
export default function GamePlayerRatingForm({ team1, team2, value = {}, onChange }) {
  const players = gamePlayers(team1, team2);
  if (!players.length) return null;

  return (
    <div className="divide-y rounded-lg border bg-white">
      {players.map((name) => (
        <div key={name} className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-sm font-medium text-slate-700">{name}</span>
          <StarRating value={value[name] || 0} onChange={(n) => onChange({ ...value, [name]: n })} size="sm" />
        </div>
      ))}
    </div>
  );
}
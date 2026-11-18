import StarRating from "@/components/StarRating";
import { gamePlayers } from "@/lib/teamNames";

/** Every player in the game gets their own stars — one row per name. Pass `only` to
 *  show a single player's row, which is what a non-admin sees: their own stars. */
export default function GamePlayerRatingForm({ team1, team2, value = {}, onChange, only }) {
  const all = gamePlayers(team1, team2);
  const norm = (n) => String(n || "").trim().toLowerCase();
  const players = only === undefined ? all : all.filter((n) => norm(n) === norm(only));
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
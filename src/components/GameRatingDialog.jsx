import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import GamePlayerRatingForm from "./GamePlayerRatingForm";
import GameRatingsSummary from "./GameRatingsSummary";
import { getCurrentMember, getCurrentPlayerName } from "@/lib/currentMember";
import { gamePlayers } from "@/lib/teamNames";

const norm = (n) => String(n || "").trim().toLowerCase();

// The logged-in player's own name inside this game, so their stars are the only ones
// they see. Admin reviewers see everybody's.
const ownNameIn = (game) => {
  const me = norm(getCurrentPlayerName());
  if (!me) return "";
  return gamePlayers(game.team1, game.team2).find((n) => norm(n) === me)
    || gamePlayers(game.team1, game.team2).find((n) => norm(n).startsWith(`${me} `))
    || "";
};

/**
 * Rate a game whose scores are already in. Each player gives their own stars and
 * can change their answer until the Wednesday 11:59pm cutoff.
 */
export default function GameRatingDialog({ game, date, onOpenChange, onSaved }) {
  const [ratings, setRatings] = useState({});
  const [saving, setSaving] = useState(false);
  const isAdmin = getCurrentMember()?.is_admin === true;
  const ownName = game ? ownNameIn(game) : "";

  useEffect(() => {
    if (!game) return;
    const saved = {};
    for (const r of game.player_ratings || []) {
      // A player only ever sees and sends their own stars; the committee sees all.
      if (!isAdmin && norm(r.player) !== norm(ownName)) continue;
      saved[r.player] = r.rating;
    }
    setRatings(saved);
  }, [game, isAdmin, ownName]);

  const handleSave = async () => {
    const list = Object.entries(ratings).map(([player, rating]) => ({ player, rating }));
    if (!list.some((r) => Number(r.rating) > 0)) {
      toast.error("Tap the stars for at least one player.");
      return;
    }
    setSaving(true);
    const res = await base44.functions.invoke("rateGame", {
      net: game.net,
      game: game.game,
      date: date || undefined,
      ratings: list,
    });
    setSaving(false);
    if (res.data?.error) {
      toast.error(res.data.error);
      return;
    }
    toast.success("Rating saved — thanks!");
    onSaved?.({ player_ratings: res.data.player_ratings, rating: res.data.rating });
    onOpenChange(false);
  };

  if (!game) return null;

  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Rate Net {game.net} · Match {game.game}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <span className="text-blue-600">{game.team1}</span>
            <span className="text-xs text-muted-foreground">VS</span>
            <span className="text-red-600">{game.team2}</span>
          </div>

          {isAdmin ? (
            <GamePlayerRatingForm team1={game.team1} team2={game.team2} value={ratings} onChange={setRatings} />
          ) : ownName ? (
            <GamePlayerRatingForm
              team1={game.team1}
              team2={game.team2}
              value={ratings}
              onChange={setRatings}
              only={ownName}
            />
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Only the players in this game can rate it.
            </p>
          )}

          {isAdmin && (
            <GameRatingsSummary
              team1={game.team1}
              team2={game.team2}
              playerRatings={game.player_ratings}
              rating={game.rating}
            />
          )}

          <p className="text-xs text-muted-foreground text-center">
            {isAdmin
              ? "Players rate their own game until 11:59pm Wednesday."
              : "Tap your own stars. Ratings stay open until 11:59pm Wednesday."}
          </p>

          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {saving ? "Saving..." : "Save Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
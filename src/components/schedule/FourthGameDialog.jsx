import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { appRatingMap, pairAverage } from "@/lib/appRatingMap";
import { lookupName } from "@/lib/nameMatch";
import { buildFourthGame } from "@/lib/fourthGame";
import FourthGamePlayers from "@/components/schedule/FourthGamePlayers";

const low = (value) => String(value || "").trim().toLowerCase();
const avg = (value) => (value == null ? "—" : Number(value).toFixed(1));

// The optional 4th game is drawn at the end of the night, once the three scheduled games
// are done, from whoever is still there — a completely different list is fine. The players
// who opted in on the home page start ticked and the admin can add or drop anyone. It is
// never scored, never counts in results, and only shows in Match Details once published.
export default function FourthGameDialog({ record, onSaved, onClose }) {
  const [players, setPlayers] = useState(null);
  const [opted, setOpted] = useState([]);
  const [picked, setPicked] = useState([]);
  const [ratings, setRatings] = useState({});
  const [played, setPlayed] = useState(null);
  const [drawn, setDrawn] = useState(record.extra_games || []);
  const [sittingOut, setSittingOut] = useState([]);
  const [published, setPublished] = useState(record.extra_published === true);
  const [busy, setBusy] = useState(false);

  const groups = {};
  for (const g of record.groups || []) {
    for (const name of g.players || []) groups[low(name)] = g.group;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const sessions = await base44.entities.Session.filter({ date: record.date });
      const ids = (sessions || []).map((s) => s.id);
      const [page, map, results] = await Promise.all([
        ids.length
          ? base44.entities.Booking.filter({ session_id: { $in: ids }, status: "confirmed" }, { limit: 300 })
          : Promise.resolve({ items: [] }),
        appRatingMap().catch(() => ({})),
        base44.entities.MatchResult.filter({ date: record.date }, { limit: 300 }).catch(() => ({ items: [] })),
      ]);
      if (!alive) return;
      const rows = page.items || [];
      const names = [...new Set(rows.map((b) => b.user_name).filter(Boolean))];
      const optedNames = [...new Set(rows.filter((b) => b.fourth_game).map((b) => b.user_name).filter(Boolean))];
      setRatings(map || {});
      setPlayers(names);
      setOpted(optedNames);
      setPicked(optedNames);
      setPlayed(((results || {}).items || []).length);
    })();
    return () => {
      alive = false;
    };
  }, [record.date]);

  const draw = (mix = false) => {
    const list = picked.map((name) => ({
      name,
      rating: lookupName(ratings, name),
      group: groups[low(name)],
    }));
    const result = buildFourthGame(list, { shuffle: mix });
    setDrawn(result.games.map((g) => ({
      net: g.net,
      team1: g.team1.map((p) => p.name),
      team2: g.team2.map((p) => p.name),
    })));
    setSittingOut(result.sittingOut);
    setPublished(false);
  };

  // The first look at the list draws the games straight away, so the admin only has to
  // check it and publish. Changing the list and pressing Draw again re-pairs it.
  useEffect(() => {
    if (players && !drawn.length && picked.length >= 4) draw(false);
  }, [players]);

  const save = async (games, publish) => {
    setBusy(true);
    try {
      await base44.entities.DrawNight.update(record.id, { extra_games: games, extra_published: publish });
      onSaved?.({ extra_games: games, extra_published: publish });
      setPublished(publish);
      toast.success(publish ? "4th game published — it's in Match Details now." : "4th game removed.");
    } catch {
      toast.error("Couldn't save the 4th game.");
    } finally {
      setBusy(false);
    }
  };

  const loading = players === null;
  const totalGames = (record.matches || []).length;
  const scored = played ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-yellow-500" /> Optional 4th game
          </DialogTitle>
          <DialogDescription>
            Run this after the three scheduled games. Tick whoever is still there — it can be a completely different
            list from the night's draw. Mixed grades, never scored, and it shows in Match Details tonight only.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {totalGames > 0 && (
                <span className={scored >= totalGames ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                  {scored} of {totalGames} games scored
                </span>
              )}
              {totalGames > 0 && " · "}
              {opted.length} asked for it · {drawn.length} game{drawn.length === 1 ? "" : "s"} drawn
              {published && <span className="text-green-600 font-semibold"> · published</span>}
            </p>

            {!players.length ? (
              <p className="text-sm text-slate-500">Nobody is booked in for this night.</p>
            ) : (
              <FourthGamePlayers players={players} opted={opted} picked={picked} onChange={setPicked} />
            )}

            {picked.length > 0 && picked.length < 4 && (
              <p className="text-sm text-amber-600">Four players are needed for a game — {picked.length} ticked.</p>
            )}

            {drawn.length > 0 && (
              <div className="space-y-2">
                {drawn.map((game, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Net {game.net}</p>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">
                        {(game.team1 || []).join(" & ")}
                        <span className="ml-1 text-xs font-normal text-slate-400">{avg(pairAverage(game.team1 || [], ratings))}</span>
                      </span>
                      <span className="text-slate-400 text-xs">vs</span>
                      <span className="font-semibold text-right">
                        {(game.team2 || []).join(" & ")}
                        <span className="ml-1 text-xs font-normal text-slate-400">{avg(pairAverage(game.team2 || [], ratings))}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sittingOut.length > 0 && (
              <p className="text-xs text-slate-500">Not in a game: {sittingOut.join(", ")}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => draw(true)} disabled={busy || picked.length < 4}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> {drawn.length ? "Draw again" : "Draw"}
              </Button>
              <Button size="sm" onClick={() => save(drawn, true)} disabled={busy || !drawn.length || published}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                {published ? "Published" : "Publish to Match Details"}
              </Button>
              {(drawn.length > 0 || published) && (
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => save([], false)} disabled={busy}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
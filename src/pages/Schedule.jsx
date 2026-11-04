import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Save, Swords, Trash2 } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import NightGroupsTable from "@/components/schedule/NightGroupsTable";
import NetScheduleTable from "@/components/schedule/NetScheduleTable";
import ScheduleAdminControls from "@/components/schedule/ScheduleAdminControls";
import NetAssignmentRow from "@/components/schedule/NetAssignmentRow";
import JuniorScheduleGuard from "@/components/schedule/JuniorScheduleGuard";
import useJuniorScheduleProtection from "@/components/schedule/useJuniorScheduleProtection";
import { shuffleNets, swapNets } from "@/lib/netAssign";
import SpreadsheetModeCard from "@/components/admin/SpreadsheetModeCard";
import PlayerCourts from "@/components/schedule/PlayerCourts";
import GameSwapSelector from "@/components/schedule/GameSwapSelector";
import UniqueGamesStatus from "@/components/schedule/UniqueGamesStatus";
import { scheduleUniqueness, uniquenessMessage } from "@/lib/scheduleUniqueness";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { swapPlayer, swapInGame, todayIso } from "@/lib/nightDraw";
import SchedulePdfExport from "@/components/schedule/SchedulePdfExport";
import { repairSchedule } from "@/lib/repairSchedule";
import { appRatingMap } from "@/lib/appRatingMap";
import { getCurrentMember } from "@/lib/currentMember";
import { toast } from "sonner";

const PRINT_CSS = `@media print {
  @page { size: A4; margin: 8mm; }
  body { background: #fff !important; }
  .no-print { display: none !important; }
  .fixed.bottom-0 { display: none !important; }
  .pb-16 { padding-bottom: 0 !important; }
  .print-plain * { color: #000 !important; }
  .print-plain table { border-collapse: collapse !important; }
  .print-plain .break-inside-avoid { break-inside: avoid; }
}`;

const auDate = (value) => {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value || "");
};

export default function Schedule() {
  const [date, setDate] = useState(
    () => new URLSearchParams(window.location.search).get("date") || todayIso()
  );
  const [record, setRecord] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [picked, setPicked] = useState(null);
  const [pickedGame, setPickedGame] = useState(null);
  const [pending, setPending] = useState(null);
  const [scope, setScope] = useState(-2);
  const [swapMode, setSwapMode] = useState("night");
  const [swapGame, setSwapGame] = useState(1);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ratings, setRatings] = useState({});
  const isAdmin = getCurrentMember()?.is_admin === true;
  const juniorSafety = useJuniorScheduleProtection(record);

  // Pair totals shown beside every pair, so the balance of each game is visible.
  useEffect(() => {
    appRatingMap().then(setRatings).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.DrawNight.list({ sort: "-date", limit: 24 })
      .then((page) => setRecent((page.items || []).filter((n) => !n.archived).slice(0, 12)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.entities.DrawNight.filter({ date }, { sort: "-created_date", limit: 10 })
      .then((page) => {
        if (!alive) return;
        // A draw removed from the Schedule keeps its games for score entry, so it
        // stays out of the way here.
        const saved = (page.items || []).find((n) => !n.archived) || null;
        setRecord(saved);
        setDirty(false);
        setPicked(null);
        setPickedGame(null);
        setSwapGame(1);
        setScope(saved?.pairing_scope ?? (saved?.variant === "unique" ? -2 : saved ? 1 : -2));
      })
      .catch(() => alive && setRecord(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  // Group names use the chosen game; a court name selects its exact game.
  // The second player can come from any group, with both game slots exchanged.
  const pick = (name, match) => {
    if (!record || !isAdmin) return;
    const gameMode = swapMode === "game";
    if (picked === name) {
      setPicked(null);
      setPickedGame(null);
      return;
    }
    if (!picked) {
      if (gameMode) {
        const source = match || (record.matches || []).find((m) =>
          Number(m.game) === swapGame && [...(m.team1 || []), ...(m.team2 || [])].includes(name)
        );
        if (!source) {
          toast.error(`${name} is resting in Game ${swapGame}. Select a playing player first.`);
          return;
        }
        setSwapGame(Number(source.game));
        setPickedGame({ net: Number(source.net), game: Number(source.game) });
      } else {
        setPickedGame(null);
      }
      setPicked(name);
      return;
    }
    if (gameMode && pickedGame) {
      if (match && Number(match.game) !== pickedGame.game) {
        toast.error(`Choose a player in Game ${pickedGame.game}, or tap their name in any group above.`);
        return;
      }
      setPending({ a: picked, b: name, game: pickedGame });
    } else {
      setPending({ a: picked, b: name, game: null });
    }
    setPicked(null);
    setPickedGame(null);
  };

  // Nothing moves until the admin confirms, so a stray second tap can't change the night.
  const confirmSwap = () => {
    if (!pending) return;
    try {
      const next = pending.game
        ? swapInGame(record, pending.a, pending.b, pending.game.net, pending.game.game)
        : swapPlayer(record, pending.a, pending.b);
      juniorSafety.assertSafe(next);
      setRecord(next);
      setDirty(true);
    } catch (error) {
      toast.error(error.message);
    }
    setPending(null);
  };

  // Re-pair the night with a different reach: each group of eight on its own, or any
  // player from 16 or 24 paired with any other and every round balanced across them.
  const changeScope = async (value) => {
    if (!record || scopeBusy) return;
    setScopeBusy(true);
    try {
      const next = await repairSchedule(record, value);
      setRecord((r) => ({ ...r, ...next }));
      setScope(value);
      setDirty(true);
      setPicked(null);
      setPickedGame(null);
      toast.success(
        value === -2
          ? uniquenessMessage(scheduleUniqueness(next))
          : value === 0
          ? "Re-paired: Games 1 and 3 in group, Game 2 two levels apart."
          : value === -1
          ? "Re-paired: Game 3 four levels apart to help beginners."
          : "Re-paired within each group."
      );
    } catch (error) {
      toast.error(error.message || "Couldn't re-pair the schedule.");
    } finally {
      setScopeBusy(false);
    }
  };

  // Nets can be reshuffled for the week, or two groups can trade theirs, so nobody
  // plays the same net every week.
  const shuffleNetNumbers = () => {
    setRecord((r) => (r ? shuffleNets(r) : r));
    setDirty(true);
    toast.success("Nets reshuffled — press Save to keep it.");
  };

  const tradeNets = (a, b) => {
    setRecord((r) => (r ? swapNets(r, a, b) : r));
    setDirty(true);
  };

  const changeSwapMode = (value) => {
    setSwapMode(value);
    setPicked(null);
    setPickedGame(null);
  };

  const changeSwapGame = (value) => {
    setSwapGame(value);
    setPicked(null);
    setPickedGame(null);
  };

  const save = async () => {
    if (!record) return;
    setSaving(true);
    try {
      juniorSafety.assertSafe(record);
      await base44.entities.DrawNight.update(record.id, {
        groups: record.groups, matches: record.matches,
        variant: record.variant, pairing_scope: record.pairing_scope,
      });
      setDirty(false);
      toast.success("Schedule saved.");
    } catch (error) {
      toast.error(error.message || "Couldn't save the schedule.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDraw = async () => {
    if (!record) return;
    setDeleting(true);
    try {
      // The night's games are kept, so scores can still be entered for them;
      // only the draw itself is taken off the Schedule.
      await base44.entities.DrawNight.update(record.id, { archived: true });
      setRecent((list) => list.filter((n) => n.id !== record.id));
      setRecord(null);
      setDirty(false);
      setPicked(null);
      setPickedGame(null);
      setConfirmDelete(false);
      toast.success("Draw removed — unscored games are still open for scores.");
    } catch {
      toast.error("Couldn't delete the draw.");
    } finally {
      setDeleting(false);
    }
  };

  const totalPlayers = (record?.groups || []).reduce((n, g) => n + (g.players || []).length, 0);



  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 print:p-0 print:pb-0 print:min-h-0">
      <style>{PRINT_CSS}</style>
      <div className="max-w-6xl mx-auto space-y-4 print:max-w-none print:mx-0 print:w-full">
        <PageBanner className="h-14 mb-2 print:h-8 print:mb-1" />

        <div className="flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Schedule</h1>
              <p className="text-xs text-slate-400">Groups, net numbers and pairings for the night</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-white"
            />
            {dirty && (
              <Button size="sm" onClick={save} disabled={saving} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => window.print()} disabled={!record}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
            <SchedulePdfExport record={record} date={date} dateLabel={auDate(date)} ratings={ratings} />
            {isAdmin && (
              <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={!record}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>

        {recent.length > 0 && (
          <div className="flex flex-wrap gap-1.5 no-print">
            {recent.map((n) => (
              <button
                key={n.id}
                onClick={() => setDate(n.date)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                  n.date === date ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {auDate(n.date)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        ) : !record ? (
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 text-center space-y-2">
            <p className="text-sm text-slate-300">No draw saved for {auDate(date)}.</p>
            <p className="text-xs text-slate-500">
              Generate the draw from {isAdmin ? "the session's Schedule button" : "your session"} and save it — it appears here straight away.
            </p>
            <Link
              to={isAdmin ? "/admin/sessions" : "/bookings"}
              className="inline-block text-xs font-bold text-yellow-400 hover:underline"
            >
              Go to Sessions
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 no-print">
              {[record.title, record.time_label].filter(Boolean).join(" · ")}
              {record.title ? " · " : ""}
              {record.groups?.length || 0} groups · {totalPlayers} players ·{" "}
              {record.matches?.length || 0} matches
              {isAdmin && (
                <span className="text-slate-500">
                  {swapMode === "game"
                    ? " · choose a game, then tap two players from any groups"
                    : " · tap any two players to swap them for the whole night"}
                </span>
              )}
              {picked && (
                <span className="text-yellow-400 font-semibold">
                  {" · "}{picked} selected{pickedGame ? ` for Game ${pickedGame.game} (Net ${pickedGame.net})` : ""}, now tap who to swap with in any group
                </span>
              )}
            </p>

            {isAdmin && (
              <JuniorScheduleGuard record={record} safety={juniorSafety} onRepaired={(next) => {
                setRecord((r) => ({ ...r, ...next }));
                setScope(next.pairing_scope);
                setDirty(false);
                setPicked(null);
                setPickedGame(null);
              }} />
            )}
            {isAdmin && (
              <ScheduleAdminControls
                scope={scope}
                busy={scopeBusy}
                onScope={changeScope}
                onRepair={() => changeScope(scope)}
                swapMode={swapMode}
                onSwapMode={changeSwapMode}
              />
            )}
            {isAdmin && (
              <NetAssignmentRow
                groups={record.groups || []}
                onShuffle={shuffleNetNumbers}
                onSwap={tradeNets}
              />
            )}
            {isAdmin && <SpreadsheetModeCard />}
            {(record.variant === "unique" || scope === -2) && <UniqueGamesStatus record={record} />}
            {isAdmin && swapMode === "game" && (
              <GameSwapSelector game={swapGame} onChange={changeSwapGame} />
            )}

            <div className="print-plain space-y-4 print:space-y-1">
              <h2 className="hidden print:flex justify-between text-sm font-black">
                <span>SCHEDULE - {[record.title, record.time_label ? `(${record.time_label})` : ""].filter(Boolean).join(" ")}</span>
                <span>{auDate(date)}</span>
              </h2>
              <div className="no-print">
                <NightGroupsTable
                  groups={record.groups || []}
                  picked={picked}
                  onPick={isAdmin ? pick : null}
                />
              </div>
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-start print:flex-col print:gap-1.5">
                <div className="flex-1 min-w-0">
                  <NetScheduleTable
                    matches={record.matches || []}
                    picked={picked}
                    pickedGame={pickedGame}
                    onPick={isAdmin ? pick : null}
                    ratings={ratings}
                  />
                </div>
                <PlayerCourts
                  matches={record.matches || []}
                  className="hidden lg:block print:block w-full lg:w-52 shrink-0"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent className="no-print">
          <AlertDialogHeader>
            <AlertDialogTitle>Swap these two players?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `${pending.a} and ${pending.b} will trade places${
                    pending.game ? ` in Game ${pending.game.game} on Net ${pending.game.net}` : " for the whole night"
                  }. Nothing is saved until you press Save.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPending(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwap}>Swap</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(false)}>
        <AlertDialogContent className="no-print">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the draw for {auDate(date)}?</AlertDialogTitle>
            <AlertDialogDescription>
              The groups and pairings for this night will be taken off the Schedule. Its games stay in Results, so any that are still unscored can be entered until the Wednesday deadline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDraw} disabled={deleting}>
              {deleting ? "Removing…" : "Remove draw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
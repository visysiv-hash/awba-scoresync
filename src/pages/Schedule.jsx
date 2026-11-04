import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Save, Swords } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import NightGroupsTable from "@/components/schedule/NightGroupsTable";
import NetScheduleTable from "@/components/schedule/NetScheduleTable";
import ScheduleAdminControls from "@/components/schedule/ScheduleAdminControls";
import GameSwapSelector from "@/components/schedule/GameSwapSelector";
import { swapPlayer, swapInGame, todayIso } from "@/lib/nightDraw";
import { repairSchedule } from "@/lib/repairSchedule";
import { appRatingMap } from "@/lib/appRatingMap";
import { getCurrentMember } from "@/lib/currentMember";
import { toast } from "sonner";

const PRINT_CSS = `@media print {
  body { background: #fff !important; }
  .no-print { display: none !important; }
  .print-plain * { color: #000 !important; background: #fff !important; }
  .print-plain table, .print-plain th, .print-plain td { border: 1px solid #000 !important; }
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
  const [scope, setScope] = useState(0);
  const [swapMode, setSwapMode] = useState("night");
  const [swapGame, setSwapGame] = useState(1);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [ratings, setRatings] = useState({});
  const isAdmin = getCurrentMember()?.is_admin === true;

  // Pair totals shown beside every pair, so the balance of each game is visible.
  useEffect(() => {
    appRatingMap().then(setRatings).catch(() => {});
  }, []);

  useEffect(() => {
    base44.entities.DrawNight.list({ sort: "-date", limit: 12 })
      .then((page) => setRecent(page.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.entities.DrawNight.filter({ date }, { sort: "-created_date", limit: 1 })
      .then((page) => {
        if (!alive) return;
        setRecord((page.items || [])[0] || null);
        setDirty(false);
        setPicked(null);
        setPickedGame(null);
        setSwapGame(1);
        setScope(0);
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
      setRecord((r) => swapInGame(r, picked, name, pickedGame.net, pickedGame.game));
    } else {
      setRecord((r) => swapPlayer(r, picked, name));
    }
    setDirty(true);
    setPicked(null);
    setPickedGame(null);
  };

  // Re-pair the night with a different reach: each group of eight on its own, or any
  // player from 16 or 24 paired with any other and every round balanced across them.
  const changeScope = async (value, force = false) => {
    if (!record || (!force && value === scope)) return;
    setScopeBusy(true);
    try {
      const next = await repairSchedule(record, value);
      setRecord((r) => ({ ...r, ...next }));
      setScope(value);
      setDirty(true);
      toast.success(
        value === 0
          ? "Re-paired: Games 1 and 3 in group, Game 2 two levels apart."
          : value === -1
          ? "Re-paired: Game 3 four levels apart to help beginners."
          : "Re-paired within each group."
      );
    } catch {
      toast.error("Couldn't re-pair the schedule.");
    } finally {
      setScopeBusy(false);
    }
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
      await base44.entities.DrawNight.update(record.id, { groups: record.groups, matches: record.matches });
      setDirty(false);
      toast.success("Schedule saved.");
    } catch {
      toast.error("Couldn't save the schedule.");
    } finally {
      setSaving(false);
    }
  };

  const totalPlayers = (record?.groups || []).reduce((n, g) => n + (g.players || []).length, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20">
      <style>{PRINT_CSS}</style>
      <div className="max-w-6xl mx-auto space-y-4">
        <PageBanner className="h-14 mb-2" />

        <div className="flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Schedule</h1>
              <p className="text-xs text-slate-400">Groups, courts and pairings for the night</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              Generate the draw on the Availability page and save it — it appears here straight away.
            </p>
            <Link to="/availability" className="inline-block text-xs font-bold text-yellow-400 hover:underline">
              Go to Availability
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400">
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
              <ScheduleAdminControls
                scope={scope}
                busy={scopeBusy}
                onScope={changeScope}
                onRepair={() => changeScope(scope, true)}
                swapMode={swapMode}
                onSwapMode={changeSwapMode}
              />
            )}
            {isAdmin && swapMode === "game" && (
              <GameSwapSelector game={swapGame} onChange={changeSwapGame} />
            )}

            <div className="print-plain space-y-4">
              <NightGroupsTable
                groups={record.groups || []}
                picked={picked}
                onPick={isAdmin ? pick : null}
              />
              <div className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <NetScheduleTable
                    matches={record.matches || []}
                    picked={picked}
                    pickedGame={pickedGame}
                    onPick={isAdmin ? pick : null}
                    ratings={ratings}
                  />
                </div>
                <div className="hidden lg:block w-36 shrink-0 rounded-xl border border-slate-700 bg-slate-800 p-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Players</p>
                  <div className="max-h-[520px] overflow-y-auto">
                    {[...new Set((record.groups || []).flatMap((g) => g.players || []))]
                      .sort((a, b) => String(a).localeCompare(String(b)))
                      .map((n) => (
                        <p key={n} className="text-[11px] leading-snug text-slate-200">{n}</p>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
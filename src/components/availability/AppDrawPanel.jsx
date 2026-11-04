import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Swords, Save, ClipboardList } from "lucide-react";
import AppDrawView from "./AppDrawView";
import { buildNightDraw, toRecord, todayIso } from "@/lib/nightDraw";
import { memberGenders } from "@/lib/memberGenders";
import { lookupName } from "@/lib/nameMatch";
import { toast } from "sonner";

// App-only scheduling: players come from today's bookings in the app, ratings
// from the app's own results, and the whole night — groups, courts and pairings —
// is generated and saved here. The spreadsheet option is left exactly as it is.
export default function AppDrawPanel({ players, onLoadPlayers, loading }) {
  const [showDraw, setShowDraw] = useState(false);

  const [appRatings, setAppRatings] = useState(null);
  const [baseGroups, setBaseGroups] = useState({});
  const [genders, setGenders] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.functions
      .invoke("getAppRatings", {})
      .then((res) => {
        setAppRatings(res.data?.players || []);
        setBaseGroups(res.data?.baseGroups || {});
      })
      .catch(() => setAppRatings([]));
    memberGenders()
      .then(setGenders)
      .catch(() => setGenders({}));
  }, []);

  const merged = useMemo(() => {
    const ratings = {};
    for (const p of appRatings || []) ratings[String(p.player).trim().toLowerCase()] = p.rating;
    return (players || []).map((p) => {
      const key = String(p.name).trim().toLowerCase();
      const rated = lookupName(ratings, p.name);
      const base = lookupName(baseGroups, p.name);
      return {
        ...p,
        rating: rated ?? base ?? p.rating ?? null,
        gender: lookupName(genders, p.name) || null,
        fromApp: rated !== undefined,
      };
    });
  }, [players, appRatings, baseGroups, genders]);

  const draw = useMemo(() => (showDraw && appRatings !== null ? buildNightDraw(merged) : null), [showDraw, merged, appRatings]);

  const missing = merged.filter((p) => p.rating === null).length;
  const shortGroups = draw ? draw.groups.filter((g) => !g.complete).length : 0;

  const saveNight = async () => {
    if (!draw) return;
    setSaving(true);
    try {
      const payload = toRecord(draw, todayIso());
      const page = await base44.entities.DrawNight.filter({ date: payload.date }, { limit: 1 });
      const existing = (page.items || [])[0];
      if (existing) await base44.entities.DrawNight.update(existing.id, payload);
      else await base44.entities.DrawNight.create(payload);
      setSaved(true);
      toast.success("Tonight's draw saved to the Schedule.");
    } catch {
      toast.error("Couldn't save tonight's draw.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={onLoadPlayers}
        disabled={loading}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {loading ? "Loading today's bookings…" : "Load today's app bookings"}
      </Button>

      <div className="space-y-1">
        <p className="text-[10px] text-slate-500">
          Unique games is the default: fresh partners and opponents, balanced by rating, with the
          smallest group range found. Use "Pair across" on the Schedule for the other methods.
        </p>
      </div>

      <Button
        onClick={() => setShowDraw((s) => !s)}
        className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold"
      >
        <Swords className="w-4 h-4 mr-2" />
        {showDraw ? "Hide app draw" : "Generate app draw"}
      </Button>

      {showDraw && (
        <>
          {appRatings === null ? (
            <p className="text-[11px] text-slate-400 text-center">Loading app ratings…</p>
          ) : (
            <>
              {missing > 0 && (
                <p className="text-[11px] text-amber-200 bg-amber-900/30 border border-amber-600/40 rounded-lg px-2 py-1.5">
                  {missing} player{missing === 1 ? " has" : "s have"} no app rating yet and are placed at the end.
                </p>
              )}
              {shortGroups > 0 && (
                <p className="text-[11px] text-sky-200 bg-sky-900/30 border border-sky-600/40 rounded-lg px-2 py-1.5">
                  {shortGroups} group{shortGroups === 1 ? " is" : "s are"} short of eight — filled with singles and
                  one-against-two games.
                </p>
              )}
              <AppDrawView draw={draw} />

              <Button
                onClick={saveNight}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saved ? "Update saved draw" : "Save tonight's draw"}
              </Button>
              {saved && (
                <Link
                  to="/schedule"
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-yellow-400 hover:underline"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Open tonight's Schedule
                </Link>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
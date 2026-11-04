import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Save, Swords } from "lucide-react";
import PageBanner from "@/components/PageBanner";
import NightGroupsTable from "@/components/schedule/NightGroupsTable";
import NightMatchesTable from "@/components/schedule/NightMatchesTable";
import { swapPlayer, todayIso } from "@/lib/nightDraw";
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
  const isAdmin = getCurrentMember()?.is_admin === true;

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
      })
      .catch(() => alive && setRecord(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  // Tap one player, then another in the same group: they trade places everywhere,
  // so every match stays a valid line-up and each player keeps their three games.
  const pick = (group, name) => {
    if (!record || !isAdmin) return;
    if (!picked || picked.group !== group) {
      setPicked({ group, name });
      return;
    }
    if (picked.name === name) {
      setPicked(null);
      return;
    }
    setRecord((r) => swapPlayer(r, group, picked.name, name));
    setDirty(true);
    setPicked(null);
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
              {record.groups?.length || 0} groups ·{" "}
              {(record.groups || []).reduce((n, g) => n + (g.players || []).length, 0)} players ·{" "}
              {record.matches?.length || 0} matches
              {isAdmin && (
                <span className="text-slate-500">
                  {" "}· tap two players in the same group to swap them
                </span>
              )}
            </p>

            <div className="print-plain space-y-4">
              <NightGroupsTable groups={record.groups || []} picked={picked} onPick={isAdmin ? pick : null} />
              <NightMatchesTable
                groups={record.groups || []}
                matches={record.matches || []}
                picked={picked}
                onPick={isAdmin ? pick : null}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "../components/AdminPinGate";
import PageBanner from "../components/PageBanner";
import PenaltyCard from "../components/admin/PenaltyCard";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { getCurrentMember } from "../lib/currentMember";

const FILTERS = [
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
  { key: "waived", label: "Waived" },
  { key: "suspended", label: "Suspended" },
  { key: "all", label: "All" },
];

export default function AdminLateCancellations() {
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("unpaid");
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.LateCancellation.list("-created_date", 200);
      setRecords(Array.isArray(all) ? all : all?.items || []);
    } catch {
      toast.error("Couldn't load the late cancellation records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (pinUnlocked) loadData(); }, [pinUnlocked]);

  const adminName = () => getCurrentMember()?.display_name || getCurrentMember()?.full_name || "Admin";

  const applyUpdate = async (record, data, message) => {
    setBusyId(record.id);
    try {
      const updated = await base44.entities.LateCancellation.update(record.id, data);
      setRecords(prev => prev.map(r => (r.id === record.id ? { ...r, ...updated } : r)));
      toast.success(message);
    } catch {
      toast.error("Couldn't save that change.");
    } finally {
      setBusyId(null);
    }
  };

  const stamp = () => ({ handled_by: adminName(), handled_at: new Date().toISOString() });

  const markPaid = (r) => applyUpdate(r, { fee_status: "paid", ...stamp() }, `${r.player_name} marked as paid.`);

  const waive = (r) => applyUpdate(r, { fee_status: "waived", ...stamp() }, `Fee waived for ${r.player_name}.`);

  const clearSuspension = (r) =>
    applyUpdate(r, { suspended: false, suspension_note: "", ...stamp() }, `Suspension cleared for ${r.player_name}.`);

  const suspend = (r) => {
    const note = window.prompt(
      `Note for suspending ${r.player_name} (they cannot book until you clear it):`,
      r.suspension_note || ""
    );
    if (note === null) return;
    applyUpdate(r, { suspended: true, suspension_note: note, ...stamp() }, `${r.player_name} suspended from booking.`);
  };

  const visible = records.filter(r => {
    if (filter === "all") return true;
    if (filter === "suspended") return r.suspended === true;
    return r.fee_status === filter;
  });

  const unpaid = records.filter(r => r.fee_status === "unpaid");
  const unpaidTotal = unpaid.reduce((sum, r) => sum + Number(r.fee_amount || 0), 0);

  if (!pinUnlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <AdminPinGate onSuccess={() => setPinUnlocked(true)} onCancel={() => window.history.back()} />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-5 pt-2">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Late Cancellations</h1>
          <p className="text-slate-400 text-sm mt-1">Fees owed and booking suspensions</p>
        </div>

        <Card className="mb-4 bg-slate-800 border-slate-700 text-white">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {unpaid.length} unpaid late cancellation{unpaid.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-slate-400">
                ${unpaidTotal.toFixed(2)} outstanding · {records.filter(r => r.suspended).length} suspended from booking
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.key
                  ? "bg-white text-slate-900 border-white"
                  : "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visible.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">Nothing here.</CardContent></Card>
          )}
          {visible.map(record => (
            <PenaltyCard
              key={record.id}
              record={record}
              busy={busyId === record.id}
              onMarkPaid={markPaid}
              onWaive={waive}
              onSuspend={suspend}
              onClearSuspension={clearSuspension}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
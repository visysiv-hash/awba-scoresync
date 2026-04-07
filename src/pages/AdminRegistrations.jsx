import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Loader2, CheckCircle, XCircle, DollarSign } from "lucide-react";

const statusColor = { pending: "bg-yellow-100 text-yellow-800", approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800" };
const paymentColor = { unpaid: "bg-slate-100 text-slate-600", paid: "bg-emerald-100 text-emerald-700" };

export default function AdminRegistrations() {
  const [seasons, setSeasons] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedReg, setExpandedReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "", start_date: "", end_date: "", fee: "",
    bank_name: "", bsb: "", account_number: "", account_name: "",
    payment_reference_instructions: "", notes: "", registration_open: true
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Season.list("-created_date"),
      base44.entities.Registration.list("-created_date")
    ]).then(([s, r]) => {
      setSeasons(s);
      setRegistrations(r);
      if (s.length > 0) setSelectedSeason(s[0]);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreateSeason = async () => {
    if (!form.name) { toast.error("Season name is required."); return; }
    const season = await base44.entities.Season.create({ ...form, fee: form.fee ? Number(form.fee) : undefined });
    setSeasons(s => [season, ...s]);
    setSelectedSeason(season);
    setShowForm(false);
    toast.success("Season created!");
  };

  const toggleSeasonOpen = async (season) => {
    const updated = await base44.entities.Season.update(season.id, { registration_open: !season.registration_open });
    setSeasons(s => s.map(x => x.id === season.id ? updated : x));
    if (selectedSeason?.id === season.id) setSelectedSeason(updated);
  };

  const updateReg = async (id, data) => {
    const updated = await base44.entities.Registration.update(id, data);
    setRegistrations(r => r.map(x => x.id === id ? updated : x));
  };

  const seasonRegs = registrations.filter(r => r.season_id === selectedSeason?.id);
  const pending = seasonRegs.filter(r => r.status === "pending");
  const approved = seasonRegs.filter(r => r.status === "approved");
  const rejected = seasonRegs.filter(r => r.status === "rejected");

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Registrations</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> New Season
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Season</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "name", label: "Season Name", placeholder: "e.g. Winter 2026" },
              { key: "start_date", label: "Start Date", placeholder: "e.g. 2026-04-01" },
              { key: "end_date", label: "End Date", placeholder: "e.g. 2026-09-30" },
              { key: "fee", label: "Fee (AUD)", placeholder: "e.g. 80" },
              { key: "bank_name", label: "Bank Name", placeholder: "e.g. Commonwealth Bank" },
              { key: "bsb", label: "BSB", placeholder: "e.g. 062-000" },
              { key: "account_number", label: "Account Number", placeholder: "e.g. 12345678" },
              { key: "account_name", label: "Account Name", placeholder: "e.g. AW Badminton Club" },
              { key: "payment_reference_instructions", label: "Payment Reference", placeholder: "e.g. Your full name" },
              { key: "notes", label: "Notes", placeholder: "Any additional info" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <Button className="w-full" onClick={handleCreateSeason}>Create Season</Button>
          </CardContent>
        </Card>
      )}

      {/* Season selector */}
      {seasons.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {seasons.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSeason(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedSeason?.id === s.id ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-300"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {selectedSeason && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{selectedSeason.name}</p>
                {selectedSeason.fee && <p className="text-sm text-slate-500">Fee: ${selectedSeason.fee} AUD</p>}
              </div>
              <Button size="sm" variant={selectedSeason.registration_open ? "destructive" : "default"} onClick={() => toggleSeasonOpen(selectedSeason)}>
                {selectedSeason.registration_open ? "Close Registration" : "Open Registration"}
              </Button>
            </div>
            <div className="text-xs text-slate-500 grid grid-cols-3 gap-2 pt-1">
              <span className="bg-yellow-50 text-yellow-700 rounded px-2 py-1 text-center">{pending.length} Pending</span>
              <span className="bg-green-50 text-green-700 rounded px-2 py-1 text-center">{approved.length} Approved</span>
              <span className="bg-red-50 text-red-700 rounded px-2 py-1 text-center">{rejected.length} Rejected</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration list */}
      {seasonRegs.length === 0 && selectedSeason && (
        <p className="text-center text-slate-400 text-sm pt-4">No registrations yet for this season.</p>
      )}

      {seasonRegs.map(reg => {
        const expanded = expandedReg === reg.id;
        return (
          <Card key={reg.id} className="overflow-hidden">
            <button className="w-full text-left p-4" onClick={() => setExpandedReg(expanded ? null : reg.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{reg.full_name}</p>
                  <p className="text-xs text-slate-500">{reg.email} · {reg.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[reg.status]}`}>{reg.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentColor[reg.payment_status]}`}>{reg.payment_status}</span>
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </button>

            {expanded && (
              <div className="px-4 pb-4 space-y-3 border-t pt-3">
                <div className="text-sm text-slate-600 space-y-1">
                  <p>Player type: <span className="font-medium capitalize">{reg.player_type}</span></p>
                  <p>Group preference: <span className="font-medium">{reg.skill_group === "unsure" ? "Not sure" : `Group ${reg.skill_group}`}</span></p>
                  <p>Submitted: <span className="font-medium">{new Date(reg.created_date).toLocaleDateString("en-AU")}</span></p>
                </div>

                {/* Status actions */}
                {reg.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => updateReg(reg.id, { status: "approved" })}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateReg(reg.id, { status: "rejected" })}>
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {reg.status !== "pending" && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => updateReg(reg.id, { status: "pending" })}>
                    Reset to Pending
                  </Button>
                )}

                {/* Payment toggle */}
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-full ${reg.payment_status === "paid" ? "border-green-300 text-green-700" : "border-slate-300"}`}
                  onClick={() => updateReg(reg.id, { payment_status: reg.payment_status === "paid" ? "unpaid" : "paid" })}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  {reg.payment_status === "paid" ? "Mark as Unpaid" : "Mark as Paid"}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
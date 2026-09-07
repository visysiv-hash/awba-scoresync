import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "../components/AdminPinGate";
import PageBanner from "../components/PageBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, RefreshCw, Pencil } from "lucide-react";
import { addWeeks } from "date-fns";
import { getCurrentMember } from "../lib/currentMember";
import { formatAusDate } from "../lib/dateFormat";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const emptyForm = () => ({
  title: "", date: "", start_time: "", end_time: "",
  location: "", max_spots: 10, max_waitlist: "", payment_notes: [],
  bank_details: null,
  // recurring
  recurring: false, recur_weeks: 4,
});

const DEFAULT_BANK_KEY = "awba_default_bank";
const loadDefaultBank = () => {
  try { return JSON.parse(localStorage.getItem(DEFAULT_BANK_KEY) || "null"); } catch { return null; }
};

export default function AdminSessions() {
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("adminPinUnlocked") === "true");
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [filterTitle, setFilterTitle] = useState("");
  const [defaultBank, setDefaultBank] = useState(loadDefaultBank);
  const [bankDraft, setBankDraft] = useState(() => {
    const d = loadDefaultBank();
    return { account_name: d?.account_name || "", bsb: d?.bsb || "", account_number: d?.account_number || "" };
  });
  const [editingBank, setEditingBank] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

  const loadData = async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      base44.entities.Session.list("date", 200),
      base44.entities.Booking.list("-created_date", 1000),
    ]);
    setSessions(s);
    setBookings(b);
    setLoading(false);
  };

  // Always load default bank details from the Google Sheet "Bank Account Details" tab
  const loadBankFromSheet = async () => {
    try {
      const res = await base44.functions.invoke("getBankDetails", {});
      const bd = res.data?.bank_details;
      if (bd && (bd.account_name || bd.bsb || bd.account_number)) {
        const cleaned = {
          account_name: bd.account_name || "",
          bsb: bd.bsb || "",
          account_number: bd.account_number || "",
        };
        localStorage.setItem(DEFAULT_BANK_KEY, JSON.stringify(cleaned));
        setDefaultBank(cleaned);
        setBankDraft(cleaned);
      }
    } catch {}
  };

  useEffect(() => { if (pinUnlocked) { loadData(); loadBankFromSheet(); } }, [pinUnlocked]);

  const sessionBookings = (sessionId) => bookings.filter(b => b.session_id === sessionId && b.status !== "cancelled");

  // Unique session titles act as "main headings" (e.g. Tuesday Games, Thursday Games)
  const uniqueTitles = Array.from(new Set(sessions.map(s => s.title)));
  const filteredSessions = filterTitle ? sessions.filter(s => s.title === filterTitle) : [];

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.start_time || !form.max_spots) {
      toast.error("Please fill in Title, Date, Start Time and Max Spots.");
      return;
    }
    if (form.date < todayStr()) {
      toast.error("Session date cannot be in the past.");
      return;
    }
    const validPaymentNotes = (form.payment_notes || []).filter(p => p.type);
    if (validPaymentNotes.length === 0) {
      toast.error("At least one payment note is required.");
      return;
    }
    setSaving(true);

    const baseData = {
      title: form.title,
      start_time: form.start_time,
      end_time: form.end_time || undefined,
      location: form.location || undefined,
      max_spots: Number(form.max_spots),
      max_waitlist: form.max_waitlist !== "" ? Number(form.max_waitlist) : undefined,
      payment_notes: form.payment_notes && form.payment_notes.length > 0
        ? form.payment_notes
            .map(p => ({
              type: p.type,
              amount: p.amount !== "" && p.amount != null ? Number(p.amount) : null,
              ...(p.type === "Other" && p.label ? { label: p.label } : {}),
            }))
            .filter(p => p.type)
        : undefined,
      bank_details: form.payment_notes.some(p => p.type === "Pay before arrival") && form.bank_details &&
        (form.bank_details.account_name || form.bank_details.bsb || form.bank_details.account_number)
        ? {
            account_name: form.bank_details.account_name || undefined,
            bsb: form.bank_details.bsb || undefined,
            account_number: form.bank_details.account_number || undefined,
          }
        : undefined,
    };

    if (editingId) {
      try {
        const updated = await base44.entities.Session.update(editingId, { ...baseData, date: form.date });
        setSessions(prev => prev.map(s => s.id === editingId ? { ...s, ...updated } : s));
        setForm(emptyForm());
        setEditingId(null);
        setShowForm(false);
        toast.success("Session updated!");
      } catch (e) {
        toast.error("Failed to update session.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const weeks = form.recurring ? Number(form.recur_weeks) : 1;
    const created = [];
    const member = getCurrentMember();
    const creatorName = member ? (member.display_name || member.full_name || "") : "";

    for (let i = 0; i < weeks; i++) {
      const [y, m, d] = form.date.split("-").map(Number);
      const dateObj = addWeeks(new Date(y, m - 1, d), i);
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      const session = await base44.entities.Session.create({ ...baseData, date: dateStr, created_by_name: creatorName || undefined });
      created.push(session);
    }

    setSessions(prev => [...created.reverse(), ...prev]);
    setForm(emptyForm());
    setShowForm(false);
    setSaving(false);
    toast.success(weeks > 1 ? `${weeks} sessions created!` : "Session created!");
  };

  const handleEdit = (session) => {
    setEditingId(session.id);
    setForm({
      title: session.title || "",
      date: session.date || "",
      start_time: session.start_time || "",
      end_time: session.end_time || "",
      location: session.location || "",
      max_spots: session.max_spots ?? 10,
      max_waitlist: session.max_waitlist ?? "",
      payment_notes: (session.payment_notes && session.payment_notes.length > 0)
        ? session.payment_notes.map(p => ({ type: p.type, amount: p.amount ?? "", label: p.label || "" }))
        : [],
      bank_details: session.bank_details || null,
      recurring: false, recur_weeks: 4,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this session? All bookings will remain but session will be removed.")) return;
    await base44.entities.Session.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success("Session deleted.");
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await base44.entities.Session.deleteMany({});
      setSessions([]);
      toast.success("All sessions deleted.");
    } catch (e) {
      toast.error("Failed to delete all sessions.");
    } finally {
      setDeletingAll(false);
    }
  };

  if (!pinUnlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <AdminPinGate
        onSuccess={() => { setPinUnlocked(true); loadData(); }}
        onCancel={() => window.history.back()}
      />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6 pt-2">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Manage Sessions</h1>
        </div>

        <div className="flex gap-2 mb-4">
          <Button className="flex-1" onClick={() => {
            if (showForm) { setForm(emptyForm()); setEditingId(null); setShowForm(false); }
            else setShowForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> {showForm ? "Cancel" : "Create New Session"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={sessions.length === 0 || deletingAll}>
                {deletingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {sessions.length} session{sessions.length === 1 ? "" : "s"}. Existing bookings will remain but will no longer be linked to a session. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Default bank details — reused for every "Pay before arrival" session */}
        <Card className="mb-4 shadow-md">
          <CardContent className="pt-3 pb-3">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setEditingBank(v => !v)}
            >
              <span className="text-sm font-semibold flex items-center gap-1.5">
                🏦 Default Bank Details
                {defaultBank && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Saved</Badge>}
              </span>
              {editingBank ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {!editingBank && defaultBank && (
              <p className="text-xs text-muted-foreground mt-1">
                {defaultBank.account_name || "—"} · BSB {defaultBank.bsb || "—"} · {defaultBank.account_number || "—"}
              </p>
            )}
            {editingBank && (
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Account Name</Label>
                  <Input value={bankDraft.account_name} onChange={e => setBankDraft(d => ({ ...d, account_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">BSB</Label>
                    <Input value={bankDraft.bsb} onChange={e => setBankDraft(d => ({ ...d, bsb: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account Number</Label>
                    <Input value={bankDraft.account_number} onChange={e => setBankDraft(d => ({ ...d, account_number: e.target.value }))} />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const cleaned = {
                      account_name: bankDraft.account_name.trim(),
                      bsb: bankDraft.bsb.trim(),
                      account_number: bankDraft.account_number.trim(),
                    };
                    if (!cleaned.account_name && !cleaned.bsb && !cleaned.account_number) {
                      localStorage.removeItem(DEFAULT_BANK_KEY);
                      setDefaultBank(null);
                    } else {
                      localStorage.setItem(DEFAULT_BANK_KEY, JSON.stringify(cleaned));
                      setDefaultBank(cleaned);
                    }
                    setEditingBank(false);
                    toast.success("Default bank details saved.");
                  }}
                >
                  Save as default
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <Card className="mb-4 shadow-lg">
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Tuesday League Night" />
                </div>
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input type="date" min={todayStr()} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Max Spots *</Label>
                  <Input type="number" value={form.max_spots} onChange={e => setForm(p => ({ ...p, max_spots: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Start Time *</Label>
                  <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>End Time</Label>
                  <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Max Waitlist Spots <span className="text-muted-foreground font-normal text-xs">(leave blank for unlimited)</span></Label>
                  <Input type="number" value={form.max_waitlist} onChange={e => setForm(p => ({ ...p, max_waitlist: e.target.value }))} placeholder="e.g. 5" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Albury Stadium" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Payment Notes</Label>
                  {form.payment_notes.map((pn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={pn.type}
                        onChange={e => {
                          const newType = e.target.value;
                          setForm(p => {
                            let bank = p.bank_details;
                            if (newType === "Pay before arrival" && !bank) {
                              const d = defaultBank;
                              bank = (d && (d.account_name || d.bsb || d.account_number))
                                ? { ...d }
                                : { account_name: "", bsb: "", account_number: "" };
                            }
                            return {
                              ...p,
                              bank_details: bank,
                              payment_notes: p.payment_notes.map((x, i) => i === idx ? { ...x, type: newType } : x),
                            };
                          });
                        }}
                      >
                        <option value="">Select…</option>
                        <option value="Pay on arrival">Pay on arrival</option>
                        <option value="Pay before arrival">Pay before arrival</option>
                        <option value="No payment required">No payment required</option>
                        <option value="Other">Other…</option>
                      </select>
                      {pn.type === "Other" && (
                        <Input
                          className="flex-1"
                          placeholder="Custom note"
                          value={pn.label || ""}
                          onChange={e => setForm(p => ({
                            ...p,
                            payment_notes: p.payment_notes.map((x, i) => i === idx ? { ...x, label: e.target.value } : x),
                          }))}
                        />
                      )}
                      {pn.type !== "No payment required" && pn.type !== "" && (
                        <Input
                          type="number"
                          className="w-24"
                          placeholder="$AUD"
                          value={pn.amount ?? ""}
                          onChange={e => setForm(p => ({
                            ...p,
                            payment_notes: p.payment_notes.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x),
                          }))}
                        />
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-red-500 shrink-0"
                        onClick={() => setForm(p => ({ ...p, payment_notes: p.payment_notes.filter((_, i) => i !== idx) }))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setForm(p => ({ ...p, payment_notes: [...p.payment_notes, { type: "", amount: "", label: "" }] }))}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add payment note
                  </Button>

                  {form.payment_notes.some(p => p.type === "Pay before arrival") && (
                    <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-800">🏦 Bank details for "Pay before arrival"</p>
                      {(() => {
                        const bd = form.bank_details || { account_name: "", bsb: "", account_number: "" };
                        const set = (k, v) => setForm(p => ({ ...p, bank_details: { ...bd, [k]: v } }));
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs">Account Name</Label>
                              <Input value={bd.account_name || ""} onChange={e => set("account_name", e.target.value)} placeholder="e.g. Albury Wodonga Badminton Assoc" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">BSB</Label>
                              <Input value={bd.bsb || ""} onChange={e => set("bsb", e.target.value)} placeholder="e.g. 063000" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Account Number</Label>
                              <Input value={bd.account_number || ""} onChange={e => set("account_number", e.target.value)} placeholder="e.g. 12345678" />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Recurring option */}
                {!editingId && (
                <div className="col-span-2 border-t pt-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))} />
                    <Label htmlFor="recurring" className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Recurring (weekly)
                    </Label>
                  </div>
                  {form.recurring && (
                    <div className="flex items-center gap-2 pl-6">
                      <Label className="shrink-0 text-sm">Repeat for</Label>
                      <Input
                        type="number"
                        min={2}
                        max={52}
                        className="w-20"
                        value={form.recur_weeks}
                        onChange={e => setForm(p => ({ ...p, recur_weeks: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">weeks</span>
                    </div>
                  )}
                </div>
                )}
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId ? "Update Session" : (form.recurring ? `Create ${form.recur_weeks} Sessions` : "Save Session")}
              </Button>
              {editingId && (
                <Button variant="outline" className="w-full" onClick={handleCancelEdit}>
                  Cancel Edit
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {sessions.length > 0 && (
          <div className="mb-3">
            <label className="text-xs text-slate-300 mb-1.5 block font-medium">Select a session</label>
            <select
              value={filterTitle}
              onChange={e => setFilterTitle(e.target.value)}
              className="w-full h-11 rounded-lg border border-white/20 bg-white/10 text-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="" disabled className="text-slate-500">Choose a session…</option>
              {uniqueTitles.map(title => (
                <option key={title} value={title} className="text-slate-800">{title}</option>
              ))}
            </select>
          </div>
        )}

        {sessions.length > 0 && !filterTitle && (
          <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">Select a session above to manage sessions.</CardContent></Card>
        )}

        <div className="space-y-3">
          {filteredSessions.length === 0 && filterTitle && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">No sessions for "{filterTitle}".</CardContent></Card>
          )}
          {filteredSessions.map(session => {
            const bks = sessionBookings(session.id);
            const confirmed = bks.filter(b => b.status === "confirmed");
            const waitlisted = bks.filter(b => b.status === "waitlisted");
            const isExpanded = expandedSession === session.id;

            return (
              <Card key={session.id} className="shadow-md">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{session.title}</p>
                      <p className="text-xs text-muted-foreground">{formatAusDate(session.date)} · {session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{confirmed.length}/{session.max_spots} confirmed</Badge>
                        {session.max_waitlist != null && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                            {waitlisted.length}/{session.max_waitlist} waitlist
                          </Badge>
                        )}
                        {session.max_waitlist == null && waitlisted.length > 0 && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">{waitlisted.length} waitlisted</Badge>
                        )}
                        {session.payment_notes && session.payment_notes.length > 0
                          ? session.payment_notes.map((pn, i) => (
                              <Badge key={i} variant="outline" className={`text-xs ${pn.type === "No payment required" ? "text-green-600 border-green-300" : "text-amber-600 border-amber-300"}`}>
                                {pn.type === "Other" ? (pn.label || "Other") : pn.type}{pn.amount ? ` $${pn.amount}` : ""}
                              </Badge>
                            ))
                          : session.payment_required && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">💳 ${session.price}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedSession(isExpanded ? null : session.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={() => handleEdit(session)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(session.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      {bks.length === 0 && <p className="text-xs text-muted-foreground">No bookings yet.</p>}
                      {confirmed.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1">✅ Confirmed ({confirmed.length})</p>
                          {confirmed.map((b, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 pl-2">
                              <p className="text-xs text-slate-700">{i + 1}. {b.user_name} <span className="text-slate-400">({b.user_email})</span></p>
                              <button
                                onClick={async () => {
                                  try {
                                    const updated = await base44.entities.Booking.update(b.id, { paid: !b.paid });
                                    setBookings(prev => prev.map(x => x.id === b.id ? { ...x, paid: updated.paid } : x));
                                    toast.success(updated.paid ? `${b.user_name} marked as paid` : `${b.user_name} marked unpaid`);
                                  } catch (e) { toast.error("Failed to update payment status."); }
                                }}
                                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                                  b.paid
                                    ? "bg-green-100 text-green-700 border-green-300"
                                    : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {b.paid ? "✓ Paid" : "Mark paid"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {waitlisted.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-orange-600 mb-1">⏳ Waitlist ({waitlisted.length})</p>
                          {waitlisted.map((b, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 pl-2">
                              <p className="text-xs text-slate-700">{i + 1}. {b.user_name} <span className="text-slate-400">({b.user_email})</span></p>
                              <button
                                onClick={async () => {
                                  try {
                                    const updated = await base44.entities.Booking.update(b.id, { paid: !b.paid });
                                    setBookings(prev => prev.map(x => x.id === b.id ? { ...x, paid: updated.paid } : x));
                                    toast.success(updated.paid ? `${b.user_name} marked as paid` : `${b.user_name} marked unpaid`);
                                  } catch (e) { toast.error("Failed to update payment status."); }
                                }}
                                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                                  b.paid
                                    ? "bg-green-100 text-green-700 border-green-300"
                                    : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                {b.paid ? "✓ Paid" : "Mark paid"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
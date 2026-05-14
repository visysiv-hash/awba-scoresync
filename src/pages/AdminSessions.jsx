import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "../components/AdminPinGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, RefreshCw } from "lucide-react";
import { addWeeks } from "date-fns";

const emptyForm = () => ({
  title: "", date: "", start_time: "", end_time: "",
  location: "", max_spots: 10, max_waitlist: "", payment_required: false, price: "", notes: "",
  // recurring
  recurring: false, recur_weeks: 4,
});

export default function AdminSessions() {
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      base44.entities.Session.list("-date", 200),
      base44.entities.Booking.list("-created_date", 1000),
    ]);
    setSessions(s);
    setBookings(b);
    setLoading(false);
  };

  const sessionBookings = (sessionId) => bookings.filter(b => b.session_id === sessionId && b.status !== "cancelled");

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.start_time || !form.max_spots) {
      toast.error("Please fill in Title, Date, Start Time and Max Spots.");
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
      payment_required: form.payment_required,
      price: form.price ? Number(form.price) : undefined,
      notes: form.notes || undefined,
    };

    const weeks = form.recurring ? Number(form.recur_weeks) : 1;
    const created = [];

    for (let i = 0; i < weeks; i++) {
      const dateObj = addWeeks(new Date(form.date + "T00:00:00"), i);
      const dateStr = dateObj.toISOString().split("T")[0];
      const session = await base44.entities.Session.create({ ...baseData, date: dateStr });
      created.push(session);
    }

    setSessions(prev => [...created.reverse(), ...prev]);
    setForm(emptyForm());
    setShowForm(false);
    setSaving(false);
    toast.success(weeks > 1 ? `${weeks} sessions created!` : "Session created!");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this session? All bookings will remain but session will be removed.")) return;
    await base44.entities.Session.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success("Session deleted.");
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
          <h1 className="text-2xl font-bold text-white">Manage Sessions</h1>
        </div>

        <Button className="w-full mb-4" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" /> {showForm ? "Cancel" : "Create New Session"}
        </Button>

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
                  <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
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
                <div className="col-span-2 space-y-1">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="payment_required" checked={form.payment_required} onChange={e => setForm(p => ({ ...p, payment_required: e.target.checked }))} />
                  <Label htmlFor="payment_required">Payment Required</Label>
                  {form.payment_required && (
                    <Input type="number" className="w-24 ml-auto" placeholder="$AUD" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                  )}
                </div>

                {/* Recurring option */}
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
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {form.recurring ? `Create ${form.recur_weeks} Sessions` : "Save Session"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {sessions.map(session => {
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
                      <p className="text-xs text-muted-foreground">{session.date} · {session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</p>
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
                        {session.payment_required && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">💳 ${session.price}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpandedSession(isExpanded ? null : session.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                            <p key={i} className="text-xs text-slate-700 pl-2">{i + 1}. {b.user_name} <span className="text-slate-400">({b.user_email})</span></p>
                          ))}
                        </div>
                      )}
                      {waitlisted.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-orange-600 mb-1">⏳ Waitlist ({waitlisted.length})</p>
                          {waitlisted.map((b, i) => (
                            <p key={i} className="text-xs text-slate-700 pl-2">{i + 1}. {b.user_name} <span className="text-slate-400">({b.user_email})</span></p>
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
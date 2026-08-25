import { useState } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "@/components/AdminPinGate";
import PageBanner from "@/components/PageBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";

const emptyForm = () => ({
  display_name: "",
  email: "",
  phone: "",
  full_name: "",
  dob: "",
  gender: "",
  bv_member: "",
});

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

/**
 * Sanitize an Australian mobile on the client for live preview + validation.
 * Returns { mobile, phone } or null when invalid.
 */
function sanitizeMobile(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[\s()\-\+]/g, "");
  if (s.startsWith("61")) s = s.slice(2);
  s = s.replace(/^0+/, "");
  if (!/^4\d{8}$/.test(s)) return null;
  return { mobile: s, phone: "0" + s };
}

export default function AdminAddMember() {
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("adminPinUnlocked") === "true");
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const phonePreview = form.phone ? sanitizeMobile(form.phone) : null;
  const phoneTouched = form.phone.length > 0;

  const canSubmit =
    form.display_name.trim() &&
    form.email.trim() &&
    form.full_name.trim() &&
    form.bv_member.trim() &&
    phonePreview;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please fill all required fields with a valid Australian mobile.");
      return;
    }
    setSaving(true);
    setLastAdded(null);
    try {
      const res = await base44.functions.invoke("addMember", { ...form, dob: form.dob });
      if (res.data?.success) {
        toast.success("Member added successfully.");
        setLastAdded(res.data.member);
        setForm(emptyForm());
      } else {
        toast.error(res.data?.error || "Failed to add member.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to add member.");
    } finally {
      setSaving(false);
    }
  };

  if (!pinUnlocked) {
    return (
      <>
        <div className="max-w-md mx-auto p-4 pt-6">
          <PageBanner className="h-14 mb-4" />
          <h1 className="text-xl font-bold text-center mb-2">Add New Member</h1>
          <p className="text-sm text-muted-foreground text-center">Admin access required.</p>
        </div>
        <AdminPinGate onSuccess={() => setPinUnlocked(true)} onCancel={() => window.history.back()} />
      </>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 pt-6 pb-24">
      <PageBanner className="h-14 mb-4" />
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5" />
        <h1 className="text-xl font-bold">Add New Member</h1>
      </div>

      {lastAdded && (
        <Card className="mb-4 border-green-300 bg-green-50">
          <CardContent className="pt-4 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-green-800">Member added to the sheet</p>
              <p className="text-green-700">
                {lastAdded.display_name} · {lastAdded.email}
              </p>
              <p className="text-green-700">
                Mobile (Col G): <span className="font-mono">{lastAdded.mobile}</span> · Phone (Col C): <span className="font-mono">{lastAdded.phone}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Display name <span className="text-red-500">*</span></Label>
              <Input value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="e.g. Syed" />
            </div>

            <div className="space-y-1">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="e.g. abdullah.syed02@gmail.com" />
            </div>

            <div className="space-y-1">
              <Label>Phone number (Australian mobile) <span className="text-red-500">*</span></Label>
              <Input
                inputMode="tel"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                placeholder="e.g. 0413203595 or +61413203595"
              />
              {phoneTouched && !phonePreview && (
                <p className="text-xs text-red-500">Enter a valid Australian mobile (starts with 04, 9 digits after the 0).</p>
              )}
              {phonePreview && (
                <p className="text-xs text-green-600">
                  Saved as — Mobile (Col G): <span className="font-mono">{phonePreview.mobile}</span> · Phone (Col C): <span className="font-mono">{phonePreview.phone}</span>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Full name <span className="text-red-500">*</span></Label>
              <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="e.g. Abdullah, Syed" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date of birth</Label>
                <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Gender</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.gender}
                  onChange={e => set("gender", e.target.value)}
                >
                  <option value="">Select…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>BV Member ID <span className="text-red-500">*</span></Label>
              <Input value={form.bv_member} onChange={e => set("bv_member", e.target.value)} placeholder="e.g. 53528" />
            </div>

            <Button type="submit" className="w-full" disabled={saving || !canSubmit}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add member
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
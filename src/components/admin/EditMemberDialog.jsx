import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const FIELDS = ["display_name", "full_name", "email", "phone", "dob", "gender", "bv_member", "active"];

export default function EditMemberDialog({ member, open, onOpenChange, onSaved, onDeleted }) {
  const [form, setForm] = useState(() => {
    const base = {};
    for (const f of FIELDS) base[f] = member?.[f] ?? "";
    base.active = member?.active !== false;
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("updateMember", { member_id: member.id, ...form });
      onSaved({ ...member, ...form, ...(res.data?.member || {}) });
      toast.success(`${form.display_name} updated.`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Couldn't save this member.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke("deleteMember", { member_id: member.id });
      onDeleted?.(member);
      toast.success(`${member.display_name} deleted.`);
      setConfirming(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Couldn't delete this member.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Display name</Label>
            <Input value={form.display_name} onChange={e => set("display_name", e.target.value)} />
          </div>
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Phone number (Australian mobile)</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. 0413203595" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date of birth</Label>
              <Input value={form.dob} onChange={e => set("dob", e.target.value)} placeholder="dd/mm/yyyy" />
            </div>
            <div>
              <Label>Gender</Label>
              <select
                value={form.gender}
                onChange={e => set("gender", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select…</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>BV Member ID</Label>
            <Input value={form.bv_member} onChange={e => set("bv_member", e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={form.active} onCheckedChange={v => set("active", v)} />
            <span className="text-sm">Active member</span>
          </div>
        </div>

        <DialogFooter className="mt-4 sm:justify-between">
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirming(true)} disabled={saving}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save changes
            </Button>
          </div>
        </DialogFooter>

        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {member.display_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes them from the member list permanently. Past results and bookings are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Keep member</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); remove(); }}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
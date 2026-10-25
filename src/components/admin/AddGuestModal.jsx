import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatAusDate } from "@/lib/dateFormat";
import { toast } from "sonner";

export default function AddGuestModal({ session, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const clean = name.trim();
    if (!clean) {
      toast.error("Please enter the guest's name.");
      return;
    }
    setSaving(true);
    try {
      await onAdd(clean);
      onClose();
    } catch (e) {
      // The caller has already told the admin what went wrong.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add guest player</DialogTitle>
          <DialogDescription>
            {session.title} · {formatAusDate(session.date)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="guest-name">Guest name</Label>
          <Input
            id="guest-name"
            value={name}
            placeholder="Full name"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          <p className="text-xs text-muted-foreground">
            No member record, email or date of birth needed. The guest goes straight onto this session and no email is sent.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
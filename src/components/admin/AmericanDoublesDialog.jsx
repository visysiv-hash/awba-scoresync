import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";

// Lets the admin nominate the players who are happy to play American doubles (one
// player against two) and singles. Those formats only appear when a group is short of
// eight, and when a list is saved the draw fills them with these players only.
export default function AmericanDoublesDialog({ session, players, onClose, onSaved }) {
  const [picked, setPicked] = useState(() => session.american_doubles || []);
  const [saving, setSaving] = useState(false);

  const has = (name) => picked.some((n) => n.toLowerCase() === name.toLowerCase());
  const toggle = (name) =>
    setPicked((list) => (has(name) ? list.filter((n) => n.toLowerCase() !== name.toLowerCase()) : [...list, name]));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Session.update(session.id, { american_doubles: picked });
      onSaved(picked);
      toast.success(
        picked.length
          ? `Only ${picked.length} nominated player${picked.length === 1 ? "" : "s"} will play singles and one-against-two games.`
          : "Nomination cleared — every player can play those games again."
      );
      onClose();
    } catch (e) {
      toast.error("Couldn't save the nomination.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Happy to play American doubles</DialogTitle>
          <DialogDescription>
            When the player count leaves a group short of eight, singles and one-against-two games fill the gap so
            nobody sits out. Tick who is happy to play those games — the draw will use only them for those games, and
            still keep every game balanced.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setPicked([...players])}>
            Select all
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPicked([])} disabled={!picked.length}>
            Clear
          </Button>
          <span className="ml-auto text-xs font-semibold text-slate-600">{picked.length} nominated</span>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
          {players.length === 0 && <p className="p-3 text-xs text-muted-foreground">No players booked yet.</p>}
          {players.map((name) => (
            <label key={name} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={has(name)} onChange={() => toggle(name)} />
              <UserRound className="w-3.5 h-3.5 text-slate-400" />
              <span className={has(name) ? "font-semibold text-slate-800" : "text-slate-600"}>{name}</span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save nomination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
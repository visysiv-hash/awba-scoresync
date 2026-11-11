import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BASE_GROUPS, saveBaseGroup } from "@/lib/baseGroups";
import { toast } from "sonner";

// Admin-only: set the group a player's rating starts from, and take the group their
// results point at in one press.
export default function BaseGroupEditor({ player, baseGroup, placed, to, onSaved }) {
  const [saving, setSaving] = useState(false);
  const fixed = baseGroup != null;
  const suggest = to != null && to !== placed;

  const save = async (value) => {
    setSaving(true);
    try {
      await saveBaseGroup(player, value);
      toast.success(value ? `${player} starts from Group ${value}.` : `${player} uses their first group.`);
      await onSaved();
    } catch {
      toast.error("Couldn't save that base group.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-700">Base group</p>
          <p className="text-[10px] text-slate-500 truncate">
            {fixed ? `Rating starts from Group ${baseGroup}` : "Auto — starts from their first group played"}
          </p>
        </div>
        {saving ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" />
        ) : (
          <Select value={fixed ? String(baseGroup) : "auto"} onValueChange={(v) => save(v === "auto" ? null : v)}>
            <SelectTrigger className="h-8 w-24 text-xs" aria-label={`Base group for ${player}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              {BASE_GROUPS.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  Group {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {suggest && (
        <button
          type="button"
          onClick={() => save(to)}
          disabled={saving}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          <ArrowRight className="w-3.5 h-3.5" /> Start from Group {to} — where their results point
        </button>
      )}
    </div>
  );
}
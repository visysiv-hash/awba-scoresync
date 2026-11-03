import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminPinGate from "../AdminPinGate";
import { ChevronDown, ChevronUp, Loader2, Settings2 } from "lucide-react";

const GROUPS = [1, 2, 3, 4, 5, 6];

// Base group = the group a player's rating starts from. Stored in the app so a
// wrong starting group can be corrected with no spreadsheet involved.
export default function BaseGroupEditor({ players, baseGroups, onSaved }) {
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(null);

  const save = async (player, value) => {
    setSaving(player);
    const key = `base_group:${player.trim().toLowerCase()}`;
    const found = await base44.entities.AppSetting.filter({ key }, { limit: 1 });
    const existing = (found.items || [])[0];
    if (!value) {
      if (existing) await base44.entities.AppSetting.delete(existing.id);
    } else if (existing) {
      await base44.entities.AppSetting.update(existing.id, { value: String(value) });
    } else {
      await base44.entities.AppSetting.create({ key, value: String(value) });
    }
    setSaving(null);
    onSaved?.();
  };

  if (!unlocked) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-[11px] text-slate-300"
        >
          <Settings2 className="w-3.5 h-3.5" /> Adjust base groups (admin)
        </button>
        {open && (
          <AdminPinGate
            onSuccess={() => { setUnlocked(true); setOpen(false); }}
            onCancel={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  const list = (players || [])
    .filter((p) => p.player.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.player.localeCompare(b.player));

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-200"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5 text-yellow-400" /> Base groups
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[10px] text-slate-400 leading-snug">
            Auto uses the group they were first placed in. Pick a number to fix where their rating starts.
          </p>
          <input
            className="w-full h-8 rounded-md bg-slate-900 border border-slate-700 px-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
            placeholder="Find a player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/60">
            {list.map((p) => {
              const overridden = baseGroups?.[p.player.trim().toLowerCase()] != null;
              return (
                <div key={p.player} className="flex items-center gap-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 truncate">{p.player}</p>
                    <p className="text-[10px] text-slate-500">
                      Rating {p.rating} · Group {p.currentGroup}
                      {overridden && <span className="text-amber-400"> · base fixed</span>}
                    </p>
                  </div>
                  {saving === p.player ? (
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  ) : (
                    <Select
                      value={overridden ? String(baseGroups[p.player.trim().toLowerCase()]) : "auto"}
                      onValueChange={(v) => save(p.player, v === "auto" ? null : v)}
                    >
                      <SelectTrigger className="w-24 h-8 bg-slate-900 border-slate-700 text-white text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        {GROUPS.map((g) => (
                          <SelectItem key={g} value={String(g)}>Group {g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
            {list.length === 0 && <p className="text-[11px] text-slate-500 py-2">No player matches that name.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
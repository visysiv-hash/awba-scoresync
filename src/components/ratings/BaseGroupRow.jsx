import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BASE_GROUPS } from "@/lib/baseGroups";

export default function BaseGroupRow({ player, rating, currentGroup, baseGroup, saving, onSave }) {
  const fixed = baseGroup != null;
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-200 truncate">{player}</p>
        <p className="text-[10px] text-slate-500">
          Rating {rating ?? "—"} · Now in Group {currentGroup ?? "—"}
          {fixed && <span className="text-amber-400"> · base fixed</span>}
        </p>
      </div>
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
      ) : (
        <Select value={fixed ? String(baseGroup) : "auto"} onValueChange={(v) => onSave(v === "auto" ? null : v)}>
          <SelectTrigger className="w-24 h-8 bg-slate-900 border-slate-700 text-white text-xs" aria-label={`Base group for ${player}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            {BASE_GROUPS.map((g) => (
              <SelectItem key={g} value={String(g)}>Group {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
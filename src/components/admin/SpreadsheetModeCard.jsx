// Admin switch for the spreadsheet connection. Turning it off makes every screen
// work from the app's own records, so the app can be checked without Google Sheets.
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Loader2, Table2 } from "lucide-react";
import { toast } from "sonner";

const KEY = "spreadsheet_enabled";

export default function SpreadsheetModeCard() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AppSetting.filter({ key: KEY }, { limit: 1 })
      .then((page) => {
        const row = (page.items || [])[0];
        setEnabled(row ? String(row.value) !== "false" : true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (next) => {
    setSaving(true);
    try {
      const page = await base44.entities.AppSetting.filter({ key: KEY }, { limit: 1 });
      const row = (page.items || [])[0];
      if (row) await base44.entities.AppSetting.update(row.id, { value: String(next) });
      else await base44.entities.AppSetting.create({ key: KEY, value: String(next) });
      setEnabled(next);
      toast.success(
        next
          ? "Spreadsheet on — the app's data is also copied to the sheet."
          : "Spreadsheet off — the app is running on its own data only."
      );
    } catch {
      toast.error("Couldn't change the spreadsheet setting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 flex items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-2">
        <Table2 className="w-4 h-4 text-yellow-400 shrink-0" />
        <div>
          <p className="text-xs font-bold text-white">Spreadsheet connection</p>
          <p className="text-[11px] text-slate-400">
            {loading
              ? "Checking…"
              : enabled
              ? "On — bookings, scores and availability are also written to the sheet."
              : "Off — everything is read from and saved to the app only."}
          </p>
        </div>
      </div>
      {loading || saving ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <Switch checked={enabled} onCheckedChange={toggle} />
      )}
    </div>
  );
}
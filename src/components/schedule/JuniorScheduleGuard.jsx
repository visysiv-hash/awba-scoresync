import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { repairSchedule } from "@/lib/repairSchedule";
import { toast } from "sonner";

export default function JuniorScheduleGuard({ record, safety, onRepaired }) {
  const [busy, setBusy] = useState(false);
  const fix = async () => {
    setBusy(true);
    try {
      const next = await repairSchedule(record, record.pairing_scope ?? (record.variant === "unique" ? -2 : 1));
      safety.assertSafe({ ...record, ...next });
      await base44.entities.DrawNight.update(record.id, next);
      onRepaired(next);
      toast.success("Draw saved with safe junior matchups; mixed matches are allowed.");
    } catch (error) {
      toast.error(error.message || "Couldn't correct the junior matchups.");
    } finally {
      setBusy(false);
    }
  };
  if (safety.loading) return <p className="text-xs text-muted-foreground no-print">Checking junior matchups…</p>;
  if (safety.error) return <p role="alert" className="text-xs text-destructive no-print">{safety.error.message}</p>;
  if (!safety.invalid.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-border bg-secondary text-secondary-foreground p-3 space-y-2 no-print">
      <p className="text-xs">A junior is playing alone against a pair containing adults. Re-pairing will correct this while allowing mixed matches and preferring fresh junior matchups.</p>
      <Button size="sm" onClick={fix} disabled={busy}>{busy ? "Correcting draw…" : "Re-pair and save"}</Button>
    </div>
  );
}
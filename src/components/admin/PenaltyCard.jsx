import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Ban, CheckCircle2, ShieldOff } from "lucide-react";
import { formatAusDateWithDay } from "@/lib/dateFormat";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const cancelledLabel = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const feeLabel = (record) =>
  Number(record.fee_amount || 0) > 0
    ? `${money(record.fee_amount)} · ${record.fee_status}`
    : "No fee · first warning";

const statusClass = (status) => {
  if (status === "paid") return "bg-green-100 text-green-700 border-green-300";
  if (status === "waived") return "bg-slate-100 text-slate-600 border-slate-300";
  return "bg-red-100 text-red-700 border-red-300";
};

export default function PenaltyCard({ record, busy, onMarkPaid, onWaive, onSuspend, onClearSuspension }) {
  return (
    <Card className={`shadow-md ${record.suspended ? "border-l-4 border-l-red-500" : ""}`}>
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{record.player_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {record.session_title || "Session"} · {formatAusDateWithDay(record.session_date)}
            </p>
            <p className="text-xs text-muted-foreground">Cancelled {cancelledLabel(record.cancelled_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className={statusClass(record.fee_status)}>
              {feeLabel(record)}
            </Badge>
            {record.suspended && <Badge className="bg-red-600 text-white border-red-600">Suspended</Badge>}
          </div>
        </div>

        {record.suspended && record.suspension_note && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
            {record.suspension_note}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {record.fee_status !== "paid" && Number(record.fee_amount || 0) > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onMarkPaid(record)}>
              {busy ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
              Mark paid
            </Button>
          )}
          {record.fee_status !== "waived" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onWaive(record)}>
              Waive
            </Button>
          )}
          {record.suspended ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700 border-green-300"
              disabled={busy}
              onClick={() => onClearSuspension(record)}
            >
              <ShieldOff className="w-3 h-3 mr-1" />
              Clear suspension
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 border-red-300"
              disabled={busy}
              onClick={() => onSuspend(record)}
            >
              <Ban className="w-3 h-3 mr-1" />
              Suspend bookings
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, X, CalendarDays, Clock, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

export default function MultiBookingModal({ sessions, user, onBooked, onClose }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = not yet submitted

  const handleConfirm = async () => {
    setLoading(true);
    const newBookings = [];
    const resultList = [];

    for (const session of sessions) {
      const res = await base44.functions.invoke("bookSession", { sessionId: session.id });
      if (res.data?.success) {
        newBookings.push(res.data.booking);
        resultList.push({ session, status: res.data.status, error: null });
      } else {
        resultList.push({ session, status: null, error: res.data?.error || "Failed" });
      }
    }

    setLoading(false);
    setResults(resultList);

    if (newBookings.length > 0) {
      onBooked(newBookings);
    }

    const succeeded = resultList.filter(r => !r.error).length;
    const failed = resultList.filter(r => r.error).length;

    if (failed === 0) {
      toast.success(`${succeeded} session${succeeded > 1 ? "s" : ""} booked!`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded} booked, ${failed} failed.`);
    } else {
      toast.error("All bookings failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={!loading ? onClose : undefined}>
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Confirm {sessions.length} Booking{sessions.length > 1 ? "s" : ""}</h2>
          {!loading && <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>}
        </div>

        <div className="space-y-2">
          {sessions.map((session, i) => {
            const result = results?.[i];
            return (
              <div key={session.id} className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{session.title}</p>
                  {result && (
                    result.error
                      ? <span className="flex items-center gap-1 text-xs text-red-500 shrink-0"><AlertCircle className="w-3.5 h-3.5" />{result.error}</span>
                      : <span className="flex items-center gap-1 text-xs text-green-600 shrink-0 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {result.status === "confirmed" ? "Confirmed" : "Waitlisted"}
                        </span>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1 text-xs"><CalendarDays className="w-3 h-3" />{session.date}</p>
                <p className="text-muted-foreground flex items-center gap-1 text-xs"><Clock className="w-3 h-3" />{session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</p>
                {session.location && <p className="text-muted-foreground flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" />{session.location}</p>}
              </div>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">Booking as: <span className="font-semibold text-slate-800">{user?.full_name} ({user?.email})</span></p>

        {!results ? (
          <Button className="w-full" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {loading ? "Booking..." : `Confirm ${sessions.length} Session${sessions.length > 1 ? "s" : ""}`}
          </Button>
        ) : (
          <Button className="w-full" variant="outline" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
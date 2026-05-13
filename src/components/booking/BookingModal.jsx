import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

export default function BookingModal({ session, user, onBooked, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("bookSession", { sessionId: session.id });
    setLoading(false);
    if (res.data?.success) {
      const status = res.data.status;
      toast.success(status === "confirmed" ? "✅ Booking confirmed! Check your email." : "⏳ Added to waitlist. We'll email you if a spot opens.");
      onBooked(res.data.booking);
    } else {
      toast.error(res.data?.error || "Booking failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Confirm Booking</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 space-y-1 text-sm">
          <p className="font-semibold text-base">{session.title}</p>
          <p className="text-muted-foreground">📅 {session.date}</p>
          <p className="text-muted-foreground">🕐 {session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</p>
          {session.location && <p className="text-muted-foreground">📍 {session.location}</p>}
          {session.payment_required
            ? <p className="text-orange-600 font-semibold mt-2">💳 Payment of ${session.price || "?"} required — pay at venue.</p>
            : <p className="text-green-600 font-semibold mt-2">✅ No payment required.</p>
          }
          {session.notes && <p className="text-slate-500 text-xs mt-1">{session.notes}</p>}
        </div>

        <p className="text-sm text-muted-foreground">Booking as: <span className="font-semibold text-slate-800">{user?.full_name} ({user?.email})</span></p>

        <Button className="w-full" onClick={handleConfirm} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {loading ? "Booking..." : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
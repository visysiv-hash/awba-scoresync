import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { getCurrentMember } from "@/lib/currentMember";

// Tonight's date in Melbourne time, matching how sessions are stored.
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
// The 4th game only runs on the scheduled Tuesday nights, so it is offered on a Tuesday.
const isTuesday = () =>
  new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "long" }) === "Tuesday";
const low = (value) => String(value || "").trim().toLowerCase();

// Players booked in for tonight can put their hand up for one more game after the
// three scheduled games. Nothing here is scored: the admin draws it at the end of the
// night and it is gone the next day.
export default function FourthGameOptIn() {
  const email = low(getCurrentMember()?.email);
  const [booking, setBooking] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!email || !isTuesday()) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const sessions = await base44.entities.Session.filter({ date: today() });
        const ids = (sessions || []).map((s) => s.id);
        if (!ids.length) return;
        const page = await base44.entities.Booking.filter(
          { session_id: { $in: ids }, status: "confirmed" },
          { limit: 300 }
        );
        const rows = page.items || [];
        if (!alive) return;
        setBooking(rows.find((b) => low(b.user_email) === email) || null);
        setCount(rows.filter((b) => b.fourth_game).length);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [email]);

  const toggle = async () => {
    if (!booking || saving) return;
    const next = !booking.fourth_game;
    setSaving(true);
    try {
      await base44.entities.Booking.update(booking.id, { fourth_game: next });
      setBooking((b) => ({ ...b, fourth_game: next }));
      setCount((c) => Math.max(0, c + (next ? 1 : -1)));
      toast.success(next ? "You're in for the 4th game." : "Taken off the 4th game list.");
    } catch {
      toast.error("Couldn't save your choice.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !booking) return null;

  const inGame = booking.fourth_game === true;

  return (
    <div className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-white flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4 text-yellow-400" /> Optional 4th game tonight
        </p>
        <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
          One more game after the three scheduled games, mixing the grades. Just for fun — never scored, never counted.
        </p>
        {count > 0 && <p className="text-[11px] text-teal-300 mt-1">{count} in so far</p>}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-60 ${
          inGame ? "bg-green-500 text-white" : "bg-white/15 text-white hover:bg-white/25"
        }`}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : inGame ? "I'm in ✓" : "I'm in"}
      </button>
    </div>
  );
}
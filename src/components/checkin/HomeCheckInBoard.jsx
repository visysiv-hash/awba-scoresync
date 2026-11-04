import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import CheckInRow from "@/components/checkin/CheckInRow";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const localIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const CHECKIN_WINDOW_MIN = 10;

// The night's arrival board, shown straight on the home page for admins.
export default function HomeCheckInBoard() {
  const [session, setSession] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const page = await base44.entities.Session.filter({ date: localIso() }, { sort: "start_time", limit: 10 });
      const next = (page.items || [])[0] || null;
      setSession(next);
      if (!next) {
        setBookings([]);
        return;
      }
      const books = await base44.entities.Booking.filter({ session_id: next.id }, { limit: 300 });
      setBookings((books.items || []).filter((b) => b.status !== "cancelled" && b.status !== "waitlisted"));
    } catch {
      toast.error("Couldn't load tonight's check-ins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const confirmed = useMemo(
    () => [...bookings].sort((a, b) => String(a.user_name || "").localeCompare(String(b.user_name || ""))),
    [bookings]
  );
  const checkedIn = confirmed.filter((b) => b.checked_in).length;
  const startAt = session?.start_time ? new Date(`${session.date}T${session.start_time}:00`) : null;
  const late = startAt ? now >= startAt.getTime() - CHECKIN_WINDOW_MIN * 60 * 1000 : false;

  const toggle = async (booking) => {
    const next = booking.checked_in !== true;
    setBookings((list) => list.map((b) => (b.id === booking.id ? { ...b, checked_in: next } : b)));
    try {
      await base44.entities.Booking.update(booking.id, {
        checked_in: next,
        checked_in_at: next ? new Date().toISOString() : "",
      });
    } catch {
      setBookings((list) => list.map((b) => (b.id === booking.id ? { ...b, checked_in: !next } : b)));
      toast.error("Couldn't save that check-in.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/10 p-4 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-2xl bg-white/10 p-3 text-center text-xs text-slate-300">
        No session today, so no check-in board.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Check in</p>
          <p className="text-sm font-bold text-white truncate">{session.title}</p>
        </div>
        <p className="text-lg font-black text-white">
          {checkedIn}
          <span className="text-xs font-semibold text-slate-400"> / {confirmed.length}</span>
        </p>
        <button
          onClick={load}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:bg-white/20"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${confirmed.length ? (checkedIn / confirmed.length) * 100 : 0}%` }}
        />
      </div>

      <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
        {confirmed.map((b) => (
          <CheckInRow key={b.id} booking={b} late={late} onToggle={toggle} />
        ))}
        {!confirmed.length && (
          <p className="py-3 text-center text-xs text-slate-400">Nobody is booked in for this session.</p>
        )}
      </div>

      <Link
        to="/admin/check-in"
        className="mt-2 block text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
      >
        Open full board
      </Link>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "@/components/AdminPinGate";
import { isAdminUnlocked } from "@/lib/adminUnlock";
import PageBanner from "@/components/PageBanner";
import CheckInRow from "@/components/checkin/CheckInRow";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCheck, Loader2, RefreshCw, UserX } from "lucide-react";
import { toast } from "sonner";

const localIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const CHECKIN_WINDOW_MIN = 10;

export default function AdminCheckIn() {
  const navigate = useNavigate();
  const [pinUnlocked, setPinUnlocked] = useState(isAdminUnlocked);
  const [date, setDate] = useState(localIso);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // The "not checked in" state only matters as the night approaches, so the clock ticks.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pinUnlocked) return;
    let alive = true;
    setLoading(true);
    base44.entities.Session.filter({ date }, { sort: "start_time", limit: 20 })
      .then((page) => {
        if (!alive) return;
        const list = page.items || [];
        setSessions(list);
        setSessionId((current) => (list.some((s) => s.id === current) ? current : list[0]?.id || null));
      })
      .catch(() => alive && setSessions([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date, pinUnlocked]);

  const loadBookings = async (id) => {
    if (!id) {
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const page = await base44.entities.Booking.filter({ session_id: id }, { limit: 300 });
      setBookings((page.items || []).filter((b) => b.status !== "cancelled"));
    } catch {
      toast.error("Couldn't load the night's bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pinUnlocked) loadBookings(sessionId);
  }, [sessionId, pinUnlocked]);

  const session = sessions.find((s) => s.id === sessionId) || null;

  const confirmed = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "confirmed")
        .sort((a, b) => String(a.user_name || "").localeCompare(String(b.user_name || ""))),
    [bookings]
  );
  const waitlisted = useMemo(
    () => bookings.filter((b) => b.status === "waitlisted").sort((a, b) => String(a.user_name || "").localeCompare(String(b.user_name || ""))),
    [bookings]
  );

  const checkedIn = confirmed.filter((b) => b.checked_in).length;
  const startAt = session?.start_time ? new Date(`${session.date}T${session.start_time}:00`) : null;
  const late = startAt ? now >= startAt.getTime() - CHECKIN_WINDOW_MIN * 60 * 1000 : false;
  const missing = confirmed.length - checkedIn;
  const minutesToStart = startAt ? Math.round((startAt.getTime() - now) / 60000) : null;

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

  const checkInAll = async () => {
    const pending = confirmed.filter((b) => !b.checked_in);
    if (!pending.length) return;
    const stamp = new Date().toISOString();
    setBookings((list) => list.map((b) => (b.checked_in ? b : { ...b, checked_in: true })));
    try {
      await base44.entities.Booking.bulkUpdate(
        pending.map((b) => ({ id: b.id, checked_in: true, checked_in_at: stamp }))
      );
      toast.success(`${pending.length} checked in.`);
    } catch {
      toast.error("Couldn't check everyone in.");
      loadBookings(sessionId);
    }
  };

  if (!pinUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
        <AdminPinGate
          onSuccess={() => setPinUnlocked(true)}
          onCancel={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-24">
      <div className="mx-auto max-w-lg">
        <PageBanner className="h-14 mb-3" />

        <div className="mb-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Check In</h1>
            <p className="text-[11px] text-slate-400">Tap a player as they arrive</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              loadBookings(sessionId);
              setNow(Date.now());
            }}
            className="text-slate-300 hover:bg-white/10"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
          />
          {sessions.length > 1 && (
            <select
              value={sessionId || ""}
              onChange={(e) => setSessionId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} {s.start_time ? `· ${s.start_time}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && !session ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
          </div>
        ) : !session ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
            <p className="text-sm text-slate-300">No session on {date.split("-").reverse().join("/")}.</p>
            <p className="mt-1 text-xs text-slate-500">Pick another date, or create the session in Sessions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm font-bold text-white">{session.title}</p>
              <p className="text-[11px] text-slate-400">
                {session.date.split("-").reverse().join("/")}
                {session.start_time ? ` · ${session.start_time}${session.end_time ? ` – ${session.end_time}` : ""}` : ""}
              </p>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black leading-none text-white">
                    {checkedIn}
                    <span className="text-base font-semibold text-slate-400"> / {confirmed.length}</span>
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">checked in</p>
                </div>
                {minutesToStart != null && (
                  <p className="text-[11px] text-slate-400">
                    {minutesToStart > 0 ? `${minutesToStart} min to first game` : "First game started"}
                  </p>
                )}
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${confirmed.length ? (checkedIn / confirmed.length) * 100 : 0}%` }}
                />
              </div>

              {missing > 0 && (
                <Button
                  size="sm"
                  onClick={checkInAll}
                  className="mt-3 w-full bg-yellow-500 font-bold text-slate-900 hover:bg-yellow-400"
                >
                  <CheckCheck className="mr-1 h-4 w-4" /> Check in everyone ({missing})
                </Button>
              )}
            </div>

            {late && missing > 0 && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-500/60 bg-rose-500/15 p-3">
                <UserX className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <p className="text-xs text-rose-100">
                  <span className="font-bold">{missing} not checked in.</span> Slot a spare in before the draw is built.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {confirmed.map((b) => (
                <CheckInRow key={b.id} booking={b} late={late} onToggle={toggle} />
              ))}
              {!confirmed.length && (
                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center text-xs text-slate-400">
                  Nobody is booked in for this session.
                </p>
              )}
            </div>

            {waitlisted.length > 0 && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Waitlist · {waitlisted.length}
                </p>
                <p className="mt-1 text-xs text-slate-300">{waitlisted.map((b) => b.user_name).join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
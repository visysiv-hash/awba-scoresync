import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, MapPin, Clock, Loader2, CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { getCurrentMember } from "@/lib/currentMember";
import { formatAusDateWithDay } from "@/lib/dateFormat";

// Today's date in Melbourne time as YYYY-MM-DD (lexicographically comparable)
function todayMelbourne() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
}

export default function MyBookingsCard() {
  const [player, setPlayer] = useState(() => {
    const member = getCurrentMember();
    if (member) return { name: member.display_name || member.full_name, email: member.email };
    try { return JSON.parse(localStorage.getItem("awba_player") || "null"); } catch { return null; }
  });
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [allSessions, allBookings] = await Promise.all([
          base44.entities.Session.list("date", 200),
          base44.entities.Booking.list("-created_date", 500),
        ]);
        const today = todayMelbourne();
        setSessions(allSessions.filter(s => s.date >= today));
        setBookings(allBookings);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const myUpcoming = bookings
    .filter(b => b.status !== "cancelled" && (b.user_email === player?.email || b.booked_by_email === player?.email))
    .map(b => ({ booking: b, session: sessions.find(s => s.id === b.session_id) }))
    .filter(x => x.session)
    .sort((a, b) => a.session.date.localeCompare(b.session.date));

  const handleCancel = async (booking) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      const res = await base44.functions.invoke("cancelBooking", { bookingId: booking.id, playerEmail: player?.email });
      if (res.data?.success) {
        setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "cancelled" } : b));
        toast.success("Booking cancelled.");
      } else {
        toast.error("Failed to cancel.");
      }
    } catch (e) {
      toast.error("Failed to cancel.");
    }
  };

  if (!player) {
    return (
      <div className="bg-white/10 rounded-xl px-3 py-3 border border-white/15">
        <div className="flex items-center gap-2 mb-1">
          <CheckSquare className="w-4 h-4 text-green-400" />
          <p className="font-semibold text-sm text-white">My Booked Sessions</p>
        </div>
        <p className="text-xs text-slate-300">
          Select your name on the <Link to="/bookings" className="text-teal-300 font-semibold">Bookings</Link> page to see your sessions here.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white/10 rounded-xl px-3 py-3 border border-white/15 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
        <p className="text-xs text-slate-300">Loading your bookings…</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center justify-between gap-2 bg-green-900/40 border border-green-500/40 rounded-lg px-3 py-2.5 hover:bg-green-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-bold text-white text-left">My Booked Sessions ({myUpcoming.length})</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/bookings" onClick={e => e.stopPropagation()} className="text-xs text-teal-300 font-semibold hover:underline">View all</Link>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-green-300 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-green-300 shrink-0" />}
        </div>
      </button>
      {expanded && (
        <div className="space-y-2 mt-2">
          {myUpcoming.length === 0 ? (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg px-3 py-2 text-xs text-slate-300">
              You have no upcoming bookings. <Link to="/bookings" className="text-teal-300 font-semibold">Book a session →</Link>
            </div>
          ) : (
            myUpcoming.map(({ booking: b, session: sess }) => (
              <div key={b.id} className="bg-green-900/30 border border-green-500/40 rounded-lg px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{b.session_title || sess?.title}</p>
                    <p className="text-xs text-slate-300 flex items-center gap-1 flex-wrap mt-0.5">
                      <CalendarDays className="w-3 h-3" />{formatAusDateWithDay(sess.date)}
                      {sess?.start_time && <><Clock className="w-3 h-3 ml-1" />{sess.start_time}{sess.end_time ? `–${sess.end_time}` : ""}</>}
                      {sess?.location && <><MapPin className="w-3 h-3 ml-1" />{sess.location}</>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={b.status === "confirmed" ? "bg-green-500 text-white border-green-500 text-xs" : "bg-amber-500 text-white border-amber-500 text-xs"}>
                      {b.status === "confirmed" ? "Confirmed" : "Waitlist"}
                    </Badge>
                    <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200 hover:bg-white/10 h-6 text-xs px-2" onClick={() => handleCancel(b)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
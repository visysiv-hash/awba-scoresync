import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin, Loader2, CalendarCheck } from "lucide-react";

function getWeekRange() {
  const now = new Date();
  // Week Monday-Sunday based on local date
  const day = now.getDay(); // 0 = Sun
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + offsetToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function fmt(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export default function MyBookingsThisWeek() {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem("awba_player") || "null"); } catch { return null; }
  });
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sessions, bookings] = await Promise.all([
          base44.entities.Session.list("date", 200),
          base44.entities.Booking.list("-created_date", 500),
        ]);
        const { start, end } = getWeekRange();
        const inWeek = sessions.filter(s => {
          const d = new Date(s.date + "T00:00:00");
          return d >= start && d <= end;
        });
        const sessionMap = new Map(inWeek.map(s => [s.id, s]));
        const my = bookings
          .filter(b => b.status !== "cancelled" && sessionMap.has(b.session_id))
          .filter(b => player ? (b.user_email === player.email || b.booked_by_email === player.email) : false)
          .map(b => ({ ...b, session: sessionMap.get(b.session_id) }))
          .sort((a, b) => a.session.date.localeCompare(b.session.date));
        setMine(my);
      } catch (e) {
        // ignore - just don't show
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (!player) {
    return (
      <Card className="shadow-md">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck className="w-4 h-4 text-teal-500" />
            <p className="font-semibold text-sm">My Bookings This Week</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Select your name on the <Link to="/bookings" className="text-teal-600 font-semibold">Bookings</Link> page to see your upcoming sessions here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardContent className="pt-4 pb-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading your bookings…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-teal-500" />
            <p className="font-semibold text-sm">My Bookings This Week</p>
          </div>
          <Link to="/bookings" className="text-xs text-teal-600 font-semibold hover:underline">View all</Link>
        </div>

        {mine.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            You have no bookings this week. <Link to="/bookings" className="text-teal-600 font-semibold">Book a session →</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map(b => (
              <div key={b.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{b.session.title}</p>
                  <p className="text-xs text-slate-500 truncate">For: {b.user_name}{b.user_name === player?.name ? " (you)" : ""}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{fmt(b.session.date)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.session.start_time}</span>
                    {b.session.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.session.location}</span>}
                  </div>
                </div>
                <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full ${
                  b.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {b.status === "confirmed" ? "✅ Confirmed" : "⏳ Waitlist"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, MapPin, Users, Clock, Loader2 } from "lucide-react";
import BookingModal from "../components/booking/BookingModal";

export default function BookingSessions() {
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [u, allSessions, allBookings] = await Promise.all([
        base44.auth.me(),
        base44.entities.Session.list("date", 100),
        base44.entities.Booking.list("-created_date", 500),
      ]);
      setUser(u);
      // Only show upcoming sessions
      const today = new Date().toISOString().split("T")[0];
      setSessions(allSessions.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date)));
      setBookings(allBookings);
      setLoading(false);
    };
    load();
  }, []);

  const getSessionBookings = (sessionId) => bookings.filter(b => b.session_id === sessionId);
  const confirmedCount = (sessionId) => getSessionBookings(sessionId).filter(b => b.status === "confirmed").length;
  const myBooking = (sessionId) => bookings.find(b => b.session_id === sessionId && b.user_email === user?.email && b.status !== "cancelled");

  const handleBooked = (booking) => {
    setBookings(prev => [...prev, booking]);
    setSelectedSession(null);
  };

  const handleCancel = async (booking) => {
    if (!window.confirm("Cancel your booking?")) return;
    const res = await base44.functions.invoke("cancelBooking", { bookingId: booking.id });
    if (res.data?.success) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "cancelled" } : b));
      toast.success("Booking cancelled.");
    } else {
      toast.error("Failed to cancel.");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6 pt-2">
          <h1 className="text-2xl font-bold text-white">Book a Session</h1>
          <p className="text-slate-400 text-sm mt-1">Upcoming sessions available to book</p>
        </div>

        {sessions.length === 0 && (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No upcoming sessions available.</CardContent></Card>
        )}

        <div className="space-y-4">
          {sessions.map(session => {
            const confirmed = confirmedCount(session.id);
            const spotsLeft = session.max_spots - confirmed;
            const full = spotsLeft <= 0;
            const myBk = myBooking(session.id);

            return (
              <Card key={session.id} className="shadow-lg">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-base">{session.title}</h2>
                      {session.notes && <p className="text-xs text-muted-foreground mt-0.5">{session.notes}</p>}
                    </div>
                    {session.payment_required
                      ? <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">💳 ${session.price || "?"}</Badge>
                      : <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">Free</Badge>
                    }
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{session.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</span>
                    {session.location && <span className="flex items-center gap-1 col-span-2"><MapPin className="w-3 h-3" />{session.location}</span>}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {full ? <span className="text-red-500 font-semibold">Full ({confirmed}/{session.max_spots})</span> : <span>{confirmed}/{session.max_spots} booked · <span className="text-green-600 font-semibold">{spotsLeft} left</span></span>}
                    </span>
                  </div>

                  {myBk ? (
                    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-semibold">
                        {myBk.status === "confirmed" ? "✅ You're booked!" : "⏳ On waitlist"}
                      </span>
                      <Button size="sm" variant="outline" className="text-red-500 border-red-200 h-7 text-xs" onClick={() => handleCancel(myBk)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      variant={full ? "outline" : "default"}
                      onClick={() => setSelectedSession(session)}
                    >
                      {full ? "Join Waitlist" : "Book Now"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedSession && (
        <BookingModal
          session={selectedSession}
          user={user}
          onBooked={handleBooked}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
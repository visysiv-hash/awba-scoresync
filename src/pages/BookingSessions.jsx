import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, MapPin, Users, Clock, Loader2, CheckSquare, Square } from "lucide-react";
import MultiBookingModal from "../components/booking/MultiBookingModal";
import PlayerSelector from "../components/booking/PlayerSelector";
import PageBanner from "../components/PageBanner";

export default function BookingSessions() {
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem("awba_player") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [allSessions, allBookings] = await Promise.all([
        base44.entities.Session.list("date", 100),
        base44.entities.Booking.list("-created_date", 500),
      ]);
      const today = new Date().toISOString().split("T")[0];
      setSessions(allSessions.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date)));
      setBookings(allBookings);
      setLoading(false);
    };
    load();
  }, []);

  const rememberPlayer = (p) => {
    setPlayer(p);
    localStorage.setItem("awba_player", JSON.stringify(p));
    setShowPlayerPicker(false);
  };

  const confirmedCount = (sessionId) => bookings.filter(b => b.session_id === sessionId && b.status === "confirmed").length;
  const myBooking = (sessionId) => bookings.find(b => b.session_id === sessionId && b.user_email === player?.email && b.status !== "cancelled");
  const myBookingsForSession = (sessionId) => bookings.filter(b =>
    b.session_id === sessionId &&
    b.status !== "cancelled" &&
    (b.booked_by_email === player?.email || b.user_email === player?.email)
  );

  const toggleSelect = (session) => {
    // Can't select if already booked
    if (myBooking(session.id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(session.id) ? next.delete(session.id) : next.add(session.id);
      return next;
    });
  };

  const handleBooked = (newBookings) => {
    setBookings(prev => [...prev, ...newBookings]);
    setSelectedIds(new Set());
  };

  const handleCancel = async (booking) => {
    if (!window.confirm("Cancel your booking?")) return;
    const res = await base44.functions.invoke("cancelBooking", { bookingId: booking.id, playerEmail: player?.email });
    if (res.data?.success) {
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "cancelled" } : b));
      toast.success("Booking cancelled.");
    } else {
      toast.error("Failed to cancel.");
    }
  };

  const selectedSessions = sessions.filter(s => selectedIds.has(s.id));
  const selectableCount = sessions.filter(s => !myBooking(s.id)).length;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4 pb-32">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-4 pt-2">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Book a Session</h1>
          <p className="text-slate-400 text-sm mt-1">Tap sessions to select, then book all at once</p>
        </div>

        <div className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 mb-3">
          {player ? (
            <span className="text-sm text-white">Booking as: <span className="font-semibold text-teal-300">{player.name}</span></span>
          ) : (
            <span className="text-sm text-slate-300">Select your name to book</span>
          )}
          <Button size="sm" variant="ghost" className="text-teal-300 hover:text-teal-200 hover:bg-white/10 h-7 text-xs" onClick={() => setShowPlayerPicker(true)}>
            {player ? "Change" : "Select name"}
          </Button>
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
            const isSelected = selectedIds.has(session.id);

            return (
              <Card
                key={session.id}
                className={`shadow-lg transition-all cursor-pointer border-2 ${
                  isSelected ? "border-teal-500 ring-2 ring-teal-400/40" :
                  myBk ? "border-border opacity-80" : "border-transparent"
                }`}
                onClick={() => !myBk && toggleSelect(session)}
              >
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {!myBk && (
                        <div className="mt-0.5 shrink-0 text-teal-500">
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </div>
                      )}
                      <div>
                        <h2 className="font-bold text-base">{session.title}</h2>
                        {session.notes && <p className="text-xs text-muted-foreground mt-0.5">{session.notes}</p>}
                      </div>
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
                      {full
                        ? <span className="text-red-500 font-semibold">Full ({confirmed}/{session.max_spots})</span>
                        : <span>{confirmed}/{session.max_spots} booked · <span className="text-green-600 font-semibold">{spotsLeft} left</span></span>
                      }
                    </span>
                  </div>

                  {(() => {
                    const mine = myBookingsForSession(session.id);
                    if (mine.length === 0) return null;
                    return (
                      <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-1" onClick={e => e.stopPropagation()}>
                        {mine.map(b => (
                          <div key={b.id} className="flex items-center justify-between text-sm">
                            {b.user_email === player?.email ? (
                              <>
                                <span className="font-semibold">
                                  {b.status === "confirmed" ? "✅ You're booked!" : "⏳ On waitlist"}
                                </span>
                                <Button size="sm" variant="outline" className="text-red-500 border-red-200 h-7 text-xs" onClick={() => handleCancel(b)}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-slate-600">Booked for: <span className="font-semibold text-slate-800">{b.user_name}</span></span>
                                <div className="flex items-center gap-2">
                                  <span className={b.status === "confirmed" ? "text-green-600 text-xs font-semibold" : "text-amber-600 text-xs font-semibold"}>
                                    {b.status === "confirmed" ? "✅ Confirmed" : "⏳ Waitlist"}
                                  </span>
                                  <Button size="sm" variant="outline" className="text-red-500 border-red-200 h-7 text-xs" onClick={() => handleCancel(b)}>
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sticky bottom bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex justify-center px-4">
          <div className="bg-teal-600 text-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 max-w-lg w-full">
            <span className="text-sm font-semibold flex-1">{selectedIds.size} session{selectedIds.size > 1 ? "s" : ""} selected</span>
            <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button size="sm" className="bg-white text-teal-700 hover:bg-white/90 font-bold h-8" onClick={() => player ? setShowModal(true) : setShowPlayerPicker(true)}>
              {selectedIds.size === selectableCount ? "Book All" : `Book ${selectedIds.size}`}
            </Button>
          </div>
        </div>
      )}

      {showModal && (
        <MultiBookingModal
          sessions={selectedSessions}
          player={player}
          onBooked={handleBooked}
          onClose={() => setShowModal(false)}
        />
      )}

      {showPlayerPicker && (
        <PlayerSelector onSelect={rememberPlayer} onClose={() => setShowPlayerPicker(false)} />
      )}
    </div>
  );
}
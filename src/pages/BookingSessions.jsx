import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarDays, MapPin, Users, Clock, Loader2, CheckSquare, Square, LayoutList, Zap } from "lucide-react";
import MultiBookingModal from "../components/booking/MultiBookingModal";
import PlayerSelector from "../components/booking/PlayerSelector";
import SessionCalendar from "../components/booking/SessionCalendar";
import PageBanner from "../components/PageBanner";
import { getCurrentMember } from "../lib/currentMember";

export default function BookingSessions() {
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [player, setPlayer] = useState(() => {
    const member = getCurrentMember();
    if (member) return { name: member.display_name || member.full_name, email: member.email };
    try { return JSON.parse(localStorage.getItem("awba_player") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showModal, setShowModal] = useState(false);
  const [addMoreMode, setAddMoreMode] = useState(false);
  const [excludeNames, setExcludeNames] = useState([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [filterTitle, setFilterTitle] = useState("All");
  const [viewMode, setViewMode] = useState("list"); // "list" | "calendar"

  const selectNextN = (n) => {
    const available = visibleSessions.filter(s => !myBooking(s.id) && confirmedCount(s.id) < s.max_spots);
    const next = new Set(selectedIds);
    available.slice(0, n).forEach(s => next.add(s.id));
    setSelectedIds(next);
    if (available.length === 0) toast.info("No available sessions to select.");
    else toast.success(`Selected ${Math.min(n, available.length)} session${Math.min(n, available.length) > 1 ? "s" : ""}.`);
  };

  const toggleDay = (daySessions) => {
    const selectable = daySessions.filter(s => !myBooking(s.id));
    if (selectable.length === 0) return;
    const allSelected = selectable.every(s => selectedIds.has(s.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) selectable.forEach(s => next.delete(s.id));
      else selectable.forEach(s => next.add(s.id));
      return next;
    });
  };

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
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedIds(new Set());
    setAddMoreMode(false);
    setExcludeNames([]);
  };

  const handleAddMore = (session) => {
    if (!player) { setShowPlayerPicker(true); return; }
    const already = bookings.filter(b => b.session_id === session.id && b.status !== "cancelled").map(b => b.user_name);
    setExcludeNames(already);
    setSelectedIds(new Set([session.id]));
    setAddMoreMode(true);
    setShowModal(true);
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

  const uniqueTitles = ["All", ...Array.from(new Set(sessions.map(s => s.title)))];
  const visibleSessions = filterTitle === "All" ? sessions : sessions.filter(s => s.title === filterTitle);

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

        {sessions.length > 0 && (
          <>
            {/* View toggle */}
            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="w-4 h-4 mr-1.5" /> List
              </Button>
              <Button
                size="sm"
                variant={viewMode === "calendar" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays className="w-4 h-4 mr-1.5" /> Calendar
              </Button>
            </div>

            {/* Quick select */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className="text-xs text-slate-300 self-center flex items-center gap-1"><Zap className="w-3 h-3" /> Quick select:</span>
              {[5, 10, 20].map(n => (
                <button
                  key={n}
                  onClick={() => selectNextN(n)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-teal-300 border border-white/20 hover:bg-white/20 transition-colors"
                >
                  Next {n}
                </button>
              ))}
              <button
                onClick={() => selectNextN(visibleSessions.length)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-teal-300 border border-white/20 hover:bg-white/20 transition-colors"
              >
                All
              </button>
            </div>
          </>
        )}

        {viewMode === "calendar" && sessions.length > 0 && (
          <div className="mb-4">
            <SessionCalendar
              sessions={visibleSessions}
              selectedIds={selectedIds}
              toggleDay={toggleDay}
              myBooking={myBooking}
              confirmedCount={confirmedCount}
            />
            {(() => {
              const selectedOnCalendar = visibleSessions.filter(s => selectedIds.has(s.id));
              if (selectedOnCalendar.length === 0) return null;
              return (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-300">Selected ({selectedOnCalendar.length}):</p>
                  {selectedOnCalendar.map(s => (
                    <div key={s.id} className="bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{s.title}</p>
                        <p className="text-xs text-slate-300">{s.date} · {s.start_time}{s.location ? ` · ${s.location}` : ""}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200 h-7 text-xs" onClick={() => toggleSelect(s)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {sessions.length > 0 && uniqueTitles.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1">
            {uniqueTitles.map(title => (
              <button
                key={title}
                onClick={() => setFilterTitle(title)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  filterTitle === title
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20"
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        )}

        <div className={`space-y-4 ${viewMode !== "list" ? "hidden" : ""}`}>
          {visibleSessions.map(session => {
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
                      <div className="flex-1">
                        <h2 className="font-bold text-base">{session.title}</h2>
                        {session.payment_notes && session.payment_notes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {session.payment_notes.map((pn, i) => {
                              const isNoPayment = pn.type === "No payment required";
                              const label = pn.type === "Other" ? (pn.label || "Other") : pn.type;
                              const text = pn.amount ? `${label} $${pn.amount}` : label;
                              return (
                                <span key={i} className={`text-xs rounded-md px-2 py-0.5 border leading-tight ${
                                  isNoPayment ? "text-green-700 border-green-300 bg-green-50" : "text-amber-700 border-amber-300 bg-amber-50"
                                }`}>{text}</span>
                              );
                            })}
                          </div>
                        )}
                        {session.payment_notes?.some(pn => pn.type === "Pay before arrival") && (() => {
                          const bd = session.bank_details || (() => {
                            try { return JSON.parse(localStorage.getItem("awba_default_bank") || "null"); } catch { return null; }
                          })();
                          if (!bd || !(bd.account_name || bd.bsb || bd.account_number)) return null;
                          return (
                            <div className="mt-1 text-[11px] text-slate-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 leading-tight">
                              <span className="font-semibold">Bank:</span> {bd.account_name || "—"}
                              {bd.bsb && ` · BSB ${bd.bsb}`}
                              {bd.account_number && ` · Acct ${bd.account_number}`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {(!session.payment_notes || session.payment_notes.length === 0) && (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {session.payment_required
                          ? <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">💳 ${session.price || "?"}</Badge>
                          : session.notes
                            ? <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 shrink-0 max-w-[180px] leading-tight whitespace-normal text-left">{session.notes}</Badge>
                            : <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">Free</Badge>
                        }
                        {session.payment_required && session.notes && (
                          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-2 py-0.5 max-w-[180px] text-right leading-tight">{session.notes}</span>
                        )}
                      </div>
                    )}
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
                            <span className="font-semibold">
                              {b.status === "confirmed" ? "✅" : "⏳"} {b.user_name}{b.user_email === player?.email ? " (you)" : ""}
                            </span>
                            <Button size="sm" variant="outline" className="text-red-500 border-red-200 h-7 text-xs" onClick={() => handleCancel(b)}>
                              Cancel
                            </Button>
                          </div>
                        ))}
                        <button
                          onClick={() => handleAddMore(session)}
                          className="text-xs text-teal-600 font-semibold hover:text-teal-700 pt-1"
                        >
                          + Add people
                        </button>
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
          onClose={handleCloseModal}
          preselectSelf={!addMoreMode}
          addMode={addMoreMode}
          excludeNames={excludeNames}
        />
      )}

      {showPlayerPicker && (
        <PlayerSelector onSelect={rememberPlayer} onClose={() => setShowPlayerPicker(false)} />
      )}
    </div>
  );
}
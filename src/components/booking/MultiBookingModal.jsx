import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, X, CalendarDays, Clock, MapPin, CheckCircle2, AlertCircle, Search } from "lucide-react";

export default function MultiBookingModal({ sessions, player, onBooked, onClose, preselectSelf = true, addMode = false, excludeEmails = [] }) {
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState(() => {
    const set = new Set();
    if (preselectSelf && player?.email) set.add(player.email);
    return set;
  });
  const [booking, setBooking] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("awba_roster") || "null");
      if (cached && cached.length) {
        setRoster(cached);
        setLoadingRoster(false);
      }
    } catch {}
    const load = async () => {
      try {
        const res = await base44.functions.invoke("getMemberRoster", {});
        const r = res.data?.roster || [];
        setRoster(r);
        localStorage.setItem("awba_roster", JSON.stringify(r));
      } catch {}
      setLoadingRoster(false);
    };
    load();
  }, []);

  // Ensure the remembered player is pre-selected (resolves email from roster if missing)
  useEffect(() => {
    if (!roster.length || !player || !preselectSelf) return;
    const me = roster.find(m => m.email === player.email || m.display_name === player.name);
    if (me && !selectedPeople.has(me.email)) {
      setSelectedPeople(prev => new Set(prev).add(me.email));
    }
  }, [roster]);

  const togglePerson = (email) => {
    setSelectedPeople(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const people = roster.filter((m, i, arr) => selectedPeople.has(m.email) && arr.findIndex(x => x.email === m.email) === i);
  const q = query.toLowerCase();
  const excl = excludeEmails || [];
  const filtered = roster
    .filter(m => !excl.includes(m.email))
    .filter(m => m.display_name.toLowerCase().includes(q) || m.full_name.toLowerCase().includes(q))
    .slice(0, 50);

  const handleConfirm = async () => {
    if (selectedPeople.size === 0) {
      toast.error("Select at least one person.");
      return;
    }
    setBooking(true);
    const pairs = sessions.flatMap(session => people.map(person => ({ session, person })));
    const responses = await Promise.all(pairs.map(pair =>
      base44.functions.invoke("bookSession", {
        sessionId: pair.session.id,
        playerName: pair.person.display_name,
        playerEmail: pair.person.email,
        bookedByEmail: player?.email,
      }).then(res => ({ pair, data: res.data })).catch(() => ({ pair, data: null }))
    ));

    const newBookings = [];
    const resultList = sessions.map(session => ({
      session,
      people: responses
        .filter(r => r.pair.session.id === session.id)
        .map(r => {
          const person = r.pair.person;
          if (r.data?.success) {
            newBookings.push(r.data.booking);
            return { name: person.display_name, status: r.data.status, error: null };
          }
          return { name: person.display_name, status: null, error: r.data?.error || "Failed" };
        }),
    }));

    setBooking(false);
    setResults(resultList);
    if (newBookings.length > 0) onBooked(newBookings);

    const total = pairs.length;
    const succeeded = resultList.flatMap(r => r.people).filter(p => !p.error).length;
    const failed = total - succeeded;
    if (failed === 0) toast.success(`${succeeded} booking${succeeded > 1 ? "s" : ""} confirmed!`);
    else if (succeeded > 0) toast.warning(`${succeeded} booked, ${failed} failed.`);
    else toast.error("All bookings failed.");
  };

  const totalBookings = sessions.length * selectedPeople.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={!booking ? onClose : undefined}>
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">
            {results
              ? (addMode ? "People Added" : (totalBookings > 1 ? "Bookings Confirmed" : "Booking Confirmed"))
              : (addMode ? "Add people" : `Confirm ${totalBookings} Booking${totalBookings !== 1 ? "s" : ""}`)}
          </h2>
          {!booking && <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>}
        </div>

        <div className="space-y-2">
          {sessions.map((session, i) => {
            const result = results?.[i];
            return (
              <div key={session.id} className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                <p className="font-semibold">{session.title}</p>
                <p className="text-muted-foreground flex items-center gap-1 text-xs"><CalendarDays className="w-3 h-3" />{session.date}</p>
                <p className="text-muted-foreground flex items-center gap-1 text-xs"><Clock className="w-3 h-3" />{session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</p>
                {session.location && <p className="text-muted-foreground flex items-center gap-1 text-xs"><MapPin className="w-3 h-3" />{session.location}</p>}
                {result && (
                  <div className="mt-1 space-y-0.5 border-t pt-1">
                    {result.people.map((p, j) => (
                      <div key={j} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{p.name}</span>
                        {p.error
                          ? <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" />{p.error}</span>
                          : <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-3 h-3" />{p.status === "confirmed" ? "Confirmed" : "Waitlisted"}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!results && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{addMode ? "Add people to this session" : "Who are you booking for?"}</p>
            {loadingRoster ? (
              <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9" placeholder="Add a name (kid, family...)..." value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-1">
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {excl.length > 0 ? "Everyone is already booked." : "No members found."}
                    </p>
                  )}
                  {filtered.map(m => (
                    <button
                      key={m.email}
                      onClick={() => togglePerson(m.email)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${selectedPeople.has(m.email) ? "bg-teal-50 text-teal-800" : "hover:bg-slate-100"}`}
                    >
                      <span className="font-semibold">{m.display_name}</span>
                      {selectedPeople.has(m.email) && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{selectedPeople.size} selected</p>
              </>
            )}
          </div>
        )}

        {!results ? (
          <Button className="w-full" onClick={handleConfirm} disabled={booking || selectedPeople.size === 0 || loadingRoster}>
            {booking && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {booking
              ? (addMode ? "Adding..." : "Booking...")
              : (addMode
                  ? `Add ${totalBookings} ${totalBookings > 1 ? "people" : "person"}`
                  : `Confirm ${totalBookings} Booking${totalBookings > 1 ? "s" : ""}`)}
          </Button>
        ) : (
          <Button className="w-full" variant="outline" onClick={onClose}>Done</Button>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { getCurrentMember } from "@/lib/currentMember";
import { STADIUM, distanceMeters } from "@/lib/stadium";

const localIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Lets a member mark themselves in, but only from inside the stadium.
export default function CheckInButton() {
  const member = getCurrentMember();
  const [found, setFound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!member) {
      setLoading(false);
      return;
    }
    let alive = true;
    const email = String(member.email || "").toLowerCase();
    const name = member.display_name || member.full_name || "";
    (async () => {
      try {
        const page = await base44.entities.Session.filter({ date: localIso() }, { limit: 10 });
        for (const session of page.items || []) {
          const bookings = await base44.entities.Booking.filter({ session_id: session.id }, { limit: 300 });
          const mine = (bookings.items || []).find(
            (b) =>
              b.status !== "cancelled" &&
              ((email && String(b.user_email || "").toLowerCase() === email) || (name && b.user_name === name))
          );
          if (mine) {
            if (alive) setFound({ booking: mine, session });
            return;
          }
        }
        if (alive) setFound(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const checkIn = async () => {
    if (!navigator.geolocation) {
      toast.error("This device can't share a location, so check in with the desk.");
      return;
    }
    setWorking(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const away = distanceMeters(pos.coords.latitude, pos.coords.longitude, STADIUM.lat, STADIUM.lon);
        if (away > STADIUM.radius_m) {
          setWorking(false);
          toast.error(`Check-in only works at ${STADIUM.name}. You're about ${Math.round(away)} m away.`);
          return;
        }
        const stamp = new Date().toISOString();
        try {
          await base44.entities.Booking.update(found.booking.id, { checked_in: true, checked_in_at: stamp });
          setFound((f) => ({ ...f, booking: { ...f.booking, checked_in: true, checked_in_at: stamp } }));
          toast.success("You're checked in. See you on court!");
        } catch {
          toast.error("Couldn't save your check-in.");
        } finally {
          setWorking(false);
        }
      },
      () => {
        setWorking(false);
        toast.error("No location yet. Allow location access, then tap again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading || !member) return null;

  if (!found) {
    return (
      <div className="rounded-2xl bg-white/10 p-3 text-center">
        <p className="text-xs text-slate-300">No booking today.</p>
        <Link to="/bookings" className="text-xs font-bold text-yellow-400 hover:underline">
          Book a session to check in
        </Link>
      </div>
    );
  }

  const checked = found.booking.checked_in === true;

  return (
    <div
      className={`rounded-2xl p-3 ${checked ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-white/10"}`}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 text-center">
        {found.session.title}
      </p>
      {checked ? (
        <div className="mt-1 flex items-center justify-center gap-2 text-emerald-300">
          <Check className="w-5 h-5" />
          <span className="text-sm font-bold">You're checked in</span>
        </div>
      ) : (
        <>
          <button
            onClick={checkIn}
            disabled={working}
            className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-slate-900 active:scale-95 transition disabled:opacity-60"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {working ? "Checking location…" : "Check in"}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            Works when you're at {STADIUM.name}
          </p>
        </>
      )}
    </div>
  );
}
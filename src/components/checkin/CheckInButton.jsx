import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { getCurrentMember } from "@/lib/currentMember";
import { STADIUM, distanceMeters } from "@/lib/stadium";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const localIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// One tap for a member to say they've arrived, from inside the stadium.
export default function CheckInButton() {
  const member = getCurrentMember();
  const [found, setFound] = useState(null);
  const [waitlisted, setWaitlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirming, setConfirming] = useState(false);

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
          const mine = (bookings.items || []).filter(
            (b) =>
              b.status !== "cancelled" &&
              ((email && String(b.user_email || "").toLowerCase() === email) || (name && b.user_name === name))
          );
          const confirmed = mine.find((b) => b.status === "confirmed");
          if (confirmed) {
            if (alive) setFound({ booking: confirmed, session });
            return;
          }
          // Only a spot on the waitlist — no check-in until they're moved into the session.
          if (mine.some((b) => b.status === "waitlisted")) {
            if (alive) {
              setWaitlisted(true);
              setFound(null);
            }
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

  const tap = () => {
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
          // The player confirms payment at the desk first, so the booking is recorded
          // as paid with the check-in — reception no longer needs the slip.
          await base44.entities.Booking.update(found.booking.id, {
            checked_in: true,
            checked_in_at: stamp,
            paid: true,
          });
          setFound((f) => ({ ...f, booking: { ...f.booking, checked_in: true, checked_in_at: stamp, paid: true } }));
          toast.success("Paid and checked in. See you on court!");
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

  if (waitlisted && !found) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 opacity-70">
        <div className="w-9 h-9 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">You're on the waitlist</p>
          <p className="text-[11px] text-slate-400">Check-in opens only once you're confirmed in the session</p>
        </div>
      </div>
    );
  }

  if (!found) {
    return (
      <Link
        to="/bookings"
        className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 active:scale-95 transition"
      >
        <div className="w-9 h-9 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-slate-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Check in</p>
          <p className="text-[11px] text-slate-400">No booking today — book a session first</p>
        </div>
      </Link>
    );
  }

  const checked = found.booking.checked_in === true;

  return (
    <>
    <button
      onClick={checked ? undefined : () => setConfirming(true)}
      disabled={working || checked}
      className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition ${
        checked ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-white/10 active:scale-95"
      }`}
    >
      <div
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
          checked ? "bg-emerald-400/25" : "bg-white/15"
        }`}
      >
        {working ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
        ) : checked ? (
          <Check className="w-4 h-4 text-emerald-300" />
        ) : (
          <MapPin className="w-4 h-4 text-emerald-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Check in</p>
        <p className="text-[11px] text-slate-400 truncate">
          {checked ? found.session.title : working ? "Checking your location…" : "Tap when you arrive"}
        </p>
      </div>
      <span
        className={`text-[11px] font-black uppercase tracking-widest ${
          checked ? "text-emerald-300" : "text-slate-300"
        }`}
      >
        {checked ? "Checked in" : working ? "…" : "Tap"}
      </span>
    </button>

    {/* Nobody is checked in off the paper slip any more: the player confirms payment
        at the desk, and that confirmation is what marks the booking paid. */}
    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Have you paid at reception?</AlertDialogTitle>
          <AlertDialogDescription>
            Tonight's fee is paid at the desk before you go onto the courts. Confirming here marks
            your booking as <span className="font-semibold">paid and checked in</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => toast.error("Pay at reception — then check in here.")}>
            Not yet
          </AlertDialogCancel>
          <AlertDialogAction onClick={tap}>Yes, I've paid</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
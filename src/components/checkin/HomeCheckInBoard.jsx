import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, ChevronRight } from "lucide-react";

const localIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Admin shortcut: opens the full check-in board to handle arrivals.
export default function HomeCheckInBoard() {
  const [session, setSession] = useState(null);
  const [counts, setCounts] = useState({ checked: 0, total: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      const page = await base44.entities.Session.filter({ date: localIso() }, { sort: "start_time", limit: 1 });
      const next = (page.items || [])[0] || null;
      if (!alive) return;
      setSession(next);
      if (!next) return;
      const books = await base44.entities.Booking.filter({ session_id: next.id }, { limit: 300 });
      const booked = (books.items || []).filter((b) => b.status === "confirmed");
      if (alive) setCounts({ checked: booked.filter((b) => b.checked_in).length, total: booked.length });
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!session) return null;

  return (
    <Link
      to="/admin/check-in"
      className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 active:scale-95 transition"
    >
      <div className="w-9 h-9 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
        <ClipboardCheck className="w-4 h-4 text-emerald-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Check in board</p>
        <p className="text-sm font-bold text-white truncate">{session.title}</p>
      </div>
      <p className="text-sm font-black text-white">
        {counts.checked}
        <span className="text-xs font-semibold text-slate-400"> / {counts.total}</span>
      </p>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </Link>
  );
}
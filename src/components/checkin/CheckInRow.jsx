import { Check, Clock } from "lucide-react";

// One player on the night board: the whole row is the check-in target.
export default function CheckInRow({ booking, late, onToggle }) {
  const checked = booking.checked_in === true;

  return (
    <button
      type="button"
      onClick={() => onToggle(booking)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
        checked
          ? "border-emerald-500/50 bg-emerald-500/15"
          : late
            ? "border-rose-500/60 bg-rose-500/15"
            : "border-slate-700 bg-slate-800"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-emerald-400 text-emerald-950" : late ? "bg-rose-500 text-white" : "bg-slate-700 text-slate-400"
        }`}
      >
        {checked ? <Check className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{booking.user_name}</span>
        {booking.paid && <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Paid</span>}
      </span>
      <span
        className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${
          checked ? "text-emerald-300" : late ? "text-rose-300" : "text-slate-500"
        }`}
      >
        {checked ? "In" : late ? "Not in" : "Tap"}
      </span>
    </button>
  );
}
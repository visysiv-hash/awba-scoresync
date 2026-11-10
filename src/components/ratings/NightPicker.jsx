import { formatAusDateWithDay } from "@/lib/dateFormat";

// Pick the night whose booked players the preview should work from — blocks are
// only built from the people who actually booked, not the whole roster.
export default function NightPicker({ sessions, value, onChange }) {
  if (!sessions.length) {
    return (
      <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
        No upcoming session with open bookings.
      </p>
    );
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {sessions.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
            s.id === value
              ? "bg-yellow-500/15 border-yellow-400/50"
              : "bg-slate-800 border-slate-700 hover:bg-slate-700"
          }`}
        >
          <p className="text-[11px] font-bold whitespace-nowrap">{formatAusDateWithDay(s.date)}</p>
          <p className="text-[10px] text-slate-400 whitespace-nowrap">
            {s.title || "Session"} · {s.max_spots || 0} spots
          </p>
        </button>
      ))}
    </div>
  );
}
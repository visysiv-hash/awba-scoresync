import { useState } from "react";
import { BellRing, X } from "lucide-react";
import { isReminderDue } from "@/lib/sessionReminder";
import CalendarInviteButton from "@/components/booking/CalendarInviteButton";

export default function SessionReminderBanner({ sessions, bookings, player }) {
  const [dismissed, setDismissed] = useState([]);

  if (!player?.email) return null;

  const reminded = sessions.filter((session) => {
    if (!isReminderDue(session)) return false;
    const mine = bookings.some(
      (b) =>
        b.session_id === session.id &&
        b.status === "confirmed" &&
        (b.user_email === player.email || b.booked_by_email === player.email)
    );
    return mine && !dismissed.includes(session.id);
  });

  if (reminded.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {reminded.map((session) => (
        <div key={session.id} className="rounded-xl bg-amber-400 px-3 py-2.5 shadow-lg">
          <div className="flex items-start gap-2">
            <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-slate-900">
                You're playing today — {session.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-800">
                {session.start_time}{session.end_time ? `–${session.end_time}` : ""}
                {session.location ? ` · ${session.location}` : ""}
              </p>
            </div>
            <button
              onClick={() => setDismissed((prev) => [...prev, session.id])}
              className="text-slate-700 hover:text-slate-900"
              aria-label="Dismiss reminder"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <CalendarInviteButton
            sessions={[session]}
            label="Add to my calendar"
            className="mt-2 w-full h-8 bg-slate-900 text-xs text-white hover:bg-slate-800"
          />
        </div>
      ))}
    </div>
  );
}
import { useState } from "react";
import { BellRing, CalendarPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isReminderDue } from "@/lib/sessionReminder";
import { downloadSessionIcs } from "@/lib/sessionIcs";

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
          <Button
            size="sm"
            className="mt-2 w-full bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => downloadSessionIcs(session)}
          >
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Add to my calendar
          </Button>
        </div>
      ))}
    </div>
  );
}
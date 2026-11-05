import { useEffect, useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { prepareIcsLink } from "@/lib/sessionIcs";

/**
 * A link that adds the given sessions to the player's calendar.
 * The invite is uploaded ahead of time so the tap is a plain navigation the browser can hand
 * to the calendar app (script downloads and pop-up tabs are blocked inside the app frame).
 */
export default function CalendarInviteButton({ sessions, label = "Add to calendar", className = "" }) {
  const [link, setLink] = useState(null);
  const [failed, setFailed] = useState(false);
  const key = (sessions || []).map((s) => `${s.id}:${s.date}:${s.start_time}`).join("|");

  useEffect(() => {
    if (!key) return;
    let active = true;
    setLink(null);
    setFailed(false);
    prepareIcsLink(sessions)
      .then((result) => { if (active) setLink(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [key]);

  if (failed || !key) return null;

  const base = "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors";

  if (!link) {
    return (
      <span className={`${base} ${className} opacity-70`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing invite…
      </span>
    );
  }

  return (
    <a
      href={link.url}
      download={link.filename}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${className}`}
    >
      <CalendarPlus className="w-3.5 h-3.5" /> {label}
    </a>
  );
}
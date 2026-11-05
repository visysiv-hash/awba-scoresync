// When a booked session's reminder should show in the app:
// Tuesday sessions from 10am, every other day from an hour before the session starts.

const TZ = "Australia/Melbourne";

function localNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => (parts.find((p) => p.type === type) || {}).value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
    weekday: get("weekday"),
  };
}

export function isReminderDue(session) {
  if (!session || !session.date || !session.start_time) return false;
  const now = localNow();
  if (session.date !== now.date) return false;

  const [hours, mins] = String(session.start_time).split(":").map((n) => Number(n));
  if (Number.isNaN(hours)) return false;
  const start = hours * 60 + (Number.isNaN(mins) ? 0 : mins);
  if (now.minutes >= start) return false;

  if (now.weekday === "Tue") return now.minutes >= 10 * 60;
  return now.minutes >= start - 60;
}
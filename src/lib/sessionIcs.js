// Builds a downloadable calendar invite (.ics) for a booked session.

const TZ = "Australia/Melbourne";

function pad(n) {
  return String(n).padStart(2, "0");
}

// Converts a Melbourne wall-clock date/time into a UTC timestamp.
function melbourneToUtc(dateStr, timeStr) {
  const target = `${dateStr}T${timeStr}:00`;
  let ts = Date.parse(`${target}Z`);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  for (let i = 0; i < 2; i++) {
    const parts = fmt.formatToParts(new Date(ts));
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const wall = `${get("year")}-${get("month")}-${get("day")}T${pad(Number(get("hour")) % 24)}:${get("minute")}:${get("second")}`;
    ts -= Date.parse(`${wall}Z`) - Date.parse(`${target}Z`);
  }
  return ts;
}

function icsStamp(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildSessionIcs(session) {
  const startTime = session.start_time || "19:00";
  const endTime = session.end_time || startTime;
  const start = icsStamp(melbourneToUtc(session.date, startTime));
  const end = icsStamp(melbourneToUtc(session.date, endTime));

  const summary = (session.title || "Badminton session").replace(/[,;\\]/g, (m) => `\\${m}`);
  const location = (session.location || "Lauren Jackson Sports Centre").replace(/[,;\\]/g, (m) => `\\${m}`);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AWBA//Session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${session.id || Date.now()}@awba`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    "DESCRIPTION:Your booked AWBA session.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadSessionIcs(session) {
  if (!session) return;
  const blob = new Blob([buildSessionIcs(session)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const slug = (session.title || "session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  link.href = url;
  link.download = `awba-${slug || "session"}-${session.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
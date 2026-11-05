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

const CALENDAR_HEADER = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//AWBA//Session//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
];

function isTuesday(dateStr) {
  if (!dateStr) return false;
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" })
    .format(new Date(`${dateStr}T12:00:00Z`));
  return weekday === "Tue";
}

// Reminders match the in-app ones: Tuesday sessions at 10am, every other day an hour before.
function alarmLines(session, startMinutes) {
  const minutesBefore = isTuesday(session.date) && startMinutes > 600
    ? startMinutes - 10 * 60
    : 60;
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Badminton session reminder",
    `TRIGGER:-PT${minutesBefore}M`,
    "END:VALARM",
  ];
}

function eventLines(session) {
  const startTime = session.start_time || "19:00";
  const endTime = session.end_time || startTime;
  const start = icsStamp(melbourneToUtc(session.date, startTime));
  const end = icsStamp(melbourneToUtc(session.date, endTime));
  const [h, m] = startTime.split(":").map(Number);
  const startMinutes = (Number.isNaN(h) ? 19 : h) * 60 + (Number.isNaN(m) ? 0 : m);

  const summary = (session.title || "Badminton session").replace(/[,;\\]/g, (x) => `\\${x}`);
  const location = (session.location || "Lauren Jackson Sports Centre").replace(/[,;\\]/g, (x) => `\\${x}`);

  return [
    "BEGIN:VEVENT",
    `UID:${session.id || Date.now()}@awba`,
    `DTSTAMP:${icsStamp(Date.now())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    "DESCRIPTION:Your booked AWBA session.",
    ...alarmLines(session, startMinutes),
    "END:VEVENT",
  ];
}

export function buildSessionIcs(session) {
  return [...CALENDAR_HEADER, ...eventLines(session), "END:VCALENDAR"].join("\r\n");
}

// One invite file covering every session just booked.
export function buildBookingsIcs(sessions) {
  return [
    ...CALENDAR_HEADER,
    ...(sessions || []).flatMap(eventLines),
    "END:VCALENDAR",
  ].join("\r\n");
}

function fileNameFor(session) {
  const slug = (session.title || "session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `awba-${slug || "session"}-${session.date}.ics`;
}

// Returns "shared" | "opened" | "downloaded" | "cancelled" so the caller can tell the player what happened.
async function deliverIcs(content, filename, title) {
  // Phones: the native share sheet offers "Add to Calendar" straight away.
  const file = typeof File !== "undefined" ? new File([content], filename, { type: "text/calendar" }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (error && error.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));

  // Open in a new tab first: downloads triggered inside an embedded frame are often blocked,
  // while a real tab either shows the invite or saves it.
  const opened = window.open(url, "_blank");
  if (opened) {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "opened";
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "downloaded";
}

export async function downloadSessionIcs(session) {
  if (!session) return "cancelled";
  return deliverIcs(buildSessionIcs(session), fileNameFor(session), session.title || "Badminton session");
}

// One invite file covering every session just booked.
export async function downloadBookingsIcs(sessions) {
  const list = (sessions || []).filter(Boolean);
  if (list.length === 0) return "cancelled";
  const filename = list.length === 1 ? fileNameFor(list[0]) : `awba-sessions-${list[0].date}.ics`;
  return deliverIcs(buildBookingsIcs(list), filename, "AWBA sessions");
}
// Builds a calendar invite (.ics) for booked sessions.

import { base44 } from "@/api/base44Client";

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

// Uploads the invite and returns a real link the player taps, which opens it in their calendar app.
// A link beats a script-triggered download: downloads and pop-up tabs are blocked inside the app frame.
export async function prepareIcsLink(sessions) {
  const list = (sessions || []).filter(Boolean);
  if (list.length === 0) return null;
  const filename = list.length === 1 ? fileNameFor(list[0]) : `awba-sessions-${list[0].date}.ics`;
  const file = new File([buildBookingsIcs(list)], filename, { type: "text/calendar" });
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 });
  if (!signed_url) throw new Error("No calendar link was returned.");
  return { url: signed_url, filename };
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const TZ = "Australia/Melbourne";
const APP_URL = "https://appawba.com.au";
// Tuesday sessions are reminded at 10am; every other day about an hour before the session starts.
const TUESDAY_WINDOW = [10 * 60, 11 * 60]; // 10:00–10:59 local
const HOUR_BEFORE_WINDOW = [55, 70]; // minutes until start

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
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + minute,
    weekday: get("weekday"),
  };
}

function toMinutes(value) {
  if (!value) return null;
  const [h, m] = String(value).split(":").map((n) => Number(n));
  if (Number.isNaN(h)) return null;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function prettyDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const force = body && body.force === true;

    const now = localNow();
    const tuesdayRound = now.weekday === "Tue" && now.minutes >= TUESDAY_WINDOW[0] && now.minutes < TUESDAY_WINDOW[1];

    const { items: todaysSessions } = await base44.asServiceRole.entities.Session.filter(
      { date: now.date },
      { limit: 100 }
    );

    const dueSessions = (todaysSessions || []).filter((session) => {
      const start = toMinutes(session.start_time);
      if (start === null) return false;
      if (force) return true;
      if (tuesdayRound) return true;
      const minutesUntil = start - now.minutes;
      return minutesUntil >= HOUR_BEFORE_WINDOW[0] && minutesUntil <= HOUR_BEFORE_WINDOW[1];
    });

    if (!dueSessions.length) {
      return Response.json({ ok: true, checked: (todaysSessions || []).length, sent: 0, failed: 0, reason: "no_due_sessions" });
    }

    const sessionIds = dueSessions.map((s) => s.id);
    const { items: bookings } = await base44.asServiceRole.entities.Booking.filter(
      { session_id: { $in: sessionIds }, status: "confirmed" },
      { limit: 500 }
    );

    const pending = (bookings || []).filter((b) => b.user_email && (force || !b.reminder_sent_at));

    const bySession = new Map(dueSessions.map((s) => [s.id, s]));
    const sentIds = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i += 6) {
      const batch = pending.slice(i, i + 6);
      const results = await Promise.allSettled(
        batch.map((booking) => {
          const session = bySession.get(booking.session_id) || {};
          const firstName = String(booking.user_name || "there").trim().split(/\s+/)[0];
          return base44.asServiceRole.integrations.Core.SendEmail({
            to: booking.user_email,
            template_name: "SessionReminder",
            category: "transactional",
            variables: {
              first_name: firstName,
              session_title: session.title || booking.session_title || "Badminton session",
              session_date: prettyDate(session.date || booking.session_date),
              session_time: session.start_time
                ? `${session.start_time}${session.end_time ? " – " + session.end_time : ""}`
                : "",
              session_location: session.location || "Lauren Jackson Sports Centre",
              cta_url: `${APP_URL}/bookings`,
            },
          });
        })
      );
      results.forEach((result, index) => {
        const delivery = result.status === "fulfilled" ? result.value : null;
        if (result.status === "fulfilled" && delivery && delivery.success !== false) {
          sent += 1;
          sentIds.push(batch[index].id);
        } else {
          failed += 1;
        }
      });
    }

    if (sentIds.length) {
      const stamp = new Date().toISOString();
      await base44.asServiceRole.entities.Booking.bulkUpdate(
        sentIds.map((id) => ({ id, reminder_sent_at: stamp }))
      );
    }

    return Response.json({ ok: true, sessions: dueSessions.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { deadlinePassed, isNoResult } from "../../shared/noResult.ts";

// Applies the no-score penalty to a night whose Thursday deadline has passed:
// every scheduled game with no score stored gets a no-result entry, which the
// ratings count as a 21-point hit for both pairs. Run weekly by the
// "Close Unscored Games" workflow, and safe to run again at any time.
const PLACEHOLDERS = ["na", "n/a", "n.a.", "-", "tbc", "tba", "vacant", "blank"];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const nights: any = await base44.asServiceRole.entities.DrawNight.filter({});
    const allNights: any[] = Array.isArray(nights) ? nights : nights.items || [];

    // A specific night can be closed on request; otherwise the last night played
    // (the newest saved draw that is not still in the future).
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
    const wanted = String(body?.date || "").trim();
    const night = wanted
      ? allNights.find((n: any) => String(n.date) === wanted)
      : [...allNights]
          .filter((n: any) => String(n.date) <= today)
          .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))[0];

    if (!night?.date) {
      return Response.json({ closed: false, created: 0, message: "No saved draw to close." });
    }
    const date = String(night.date);

    if (!deadlinePassed(date)) {
      return Response.json({ date, closed: false, created: 0, message: "Scores can still be entered until 11:59pm Wednesday." });
    }

    const matches = (night.matches || []).filter((m: any) =>
      Number.isFinite(Number(m.net)) && Number.isFinite(Number(m.game))
    );

    const stored: any = await base44.asServiceRole.entities.MatchResult.filter({ date });
    const results: any[] = Array.isArray(stored) ? stored : stored.items || [];
    const bySlot = new Map<string, any>(results.map((r: any) => [`${Number(r.net)}|${Number(r.game)}`, r]));

    const pending: any[] = [];
    for (const m of matches) {
      const t1 = (m.team1 || []).map((n: string) => String(n).trim()).filter(Boolean);
      const t2 = (m.team2 || []).map((n: string) => String(n).trim()).filter(Boolean);
      if (!t1.length || !t2.length) continue;
      // A filler name means the game was not a real contest: leave it alone.
      if ([...t1, ...t2].some((n: string) => PLACEHOLDERS.includes(n.toLowerCase()))) continue;
      // Already scored, or already carrying the penalty.
      if (bySlot.has(`${Number(m.net)}|${Number(m.game)}`)) continue;

      pending.push({
        date,
        net: Number(m.net),
        game: Number(m.game),
        team1: t1.join(" & "),
        team2: t2.join(" & "),
        team1_players: t1,
        team2_players: t2,
        score1: 0,
        score2: 0,
        rounds: [],
        source: "app",
      });
    }

    if (pending.length) await base44.asServiceRole.entities.MatchResult.bulkCreate(pending);

    return Response.json({
      date,
      closed: true,
      created: pending.length,
      alreadyRecorded: results.filter((r: any) => isNoResult(r)).length,
      games: pending.map((p: any) => `${p.team1} vs ${p.team2}`),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
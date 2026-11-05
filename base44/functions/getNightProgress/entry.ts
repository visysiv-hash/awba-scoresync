import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { appNightFor } from "../../shared/appNight.ts";

const sydneyToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Who is leading the night, from the scores already entered for it.
// One point per game won, one for a draw (21-point games), with point differential
// as the tie-break so the board moves after every submitted score.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { date: wanted } = await req.json().catch(() => ({}));
    const today = sydneyToday();

    const openNight = await appNightFor(base44, wanted ? String(wanted) : undefined);
    const page = await base44.asServiceRole.entities.DrawNight.filter({}, { limit: 200 });
    const nights = (page && page.items) || [];

    let night = null;
    let live = false;
    let rows = [];

    if (wanted) {
      night = openNight || nights.find((n) => String(n.date) === String(wanted)) || null;
      live = Boolean(openNight);
      if (night) {
        const res = await base44.asServiceRole.entities.MatchResult.filter({ date: String(night.date) }, { limit: 300 });
        rows = (res && res.items) || [];
      }
    } else {
      // Tonight's draw while it is being scored, otherwise the latest night that
      // actually has results, so the board is never empty mid-week.
      const past = nights
        .filter((n) => String(n.date) <= today)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const candidates = [...(openNight ? [openNight] : []), ...past];
      for (const candidate of candidates.slice(0, 8)) {
        const res = await base44.asServiceRole.entities.MatchResult.filter({ date: String(candidate.date) }, { limit: 300 });
        const items = (res && res.items) || [];
        if (items.length) {
          night = candidate;
          rows = items;
          live = Boolean(openNight && candidate.date === openNight.date);
          break;
        }
      }
      if (!night) {
        night = openNight || past[0] || null;
        live = Boolean(openNight);
      }
    }

    if (!night) {
      return Response.json({ date: today, title: "", live: false, players: [], totalGames: 0, scoredGames: 0 });
    }

    const date = String(night.date);

    // A court slot can hold more than one saved copy: keep the newest.
    const bySlot = new Map();
    for (const r of rows) {
      const slot = `${Number(r.net)}|${Number(r.game)}`;
      const seen = bySlot.get(slot);
      const stamp = String(r.updated_date || r.created_date || "");
      if (!seen || stamp > String(seen.updated_date || seen.created_date || "")) bySlot.set(slot, r);
    }

    const stats = {};
    const forPlayer = (name) => {
      const key = String(name || "").trim();
      if (!stats[key]) stats[key] = { name: key, played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, points: 0 };
      return stats[key];
    };

    for (const r of bySlot.values()) {
      const t1 = (r.team1_players || []).map((n) => String(n || "").trim()).filter(Boolean);
      const t2 = (r.team2_players || []).map((n) => String(n || "").trim()).filter(Boolean);
      if (!t1.length || !t2.length) continue;

      const rounds = Array.isArray(r.rounds) && r.rounds.length
        ? r.rounds
        : [{ score1: r.score1, score2: r.score2 }];

      for (const rd of rounds) {
        const s1 = Number(rd.score1) || 0;
        const s2 = Number(rd.score2) || 0;
        if (!s1 && !s2) continue;

        for (const n of t1) {
          const p = forPlayer(n);
          p.played += 1;
          p.pf += s1;
          p.pa += s2;
          if (s1 > s2) { p.won += 1; p.points += 2; }
          else if (s1 === s2) { p.drawn += 1; p.points += 1; }
          else p.lost += 1;
        }
        for (const n of t2) {
          const p = forPlayer(n);
          p.played += 1;
          p.pf += s2;
          p.pa += s1;
          if (s2 > s1) { p.won += 1; p.points += 2; }
          else if (s1 === s2) { p.drawn += 1; p.points += 1; }
          else p.lost += 1;
        }
      }
    }

    const players = Object.values(stats)
      .map((p) => ({ ...p, diff: p.pf - p.pa }))
      .filter((p) => p.played > 0)
      .sort((a, b) => b.points - a.points || b.diff - a.diff || b.won - a.won || a.name.localeCompare(b.name));

    return Response.json({
      date,
      title: night.title || "",
      live,
      totalGames: (night.matches || []).length,
      scoredGames: bySlot.size,
      players,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
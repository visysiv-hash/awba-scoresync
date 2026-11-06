import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { appNightFor } from "../../shared/appNight.ts";

const sydneyToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Who is leading tonight, from the scores already entered for tonight's draw.
// One point per game won, one for a draw (21-point games), with point differential
// as the tie-break so the board moves after every submitted score.
// Only the night being played is ever returned: on any other day there is no ladder.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = sydneyToday();

    const night = await appNightFor(base44);
    if (!night || String(night.date) !== today) {
      return Response.json({ active: false, date: today, title: "", players: [], totalGames: 0, scoredGames: 0 });
    }

    const date = String(night.date);
    const res = await base44.asServiceRole.entities.MatchResult.filter({ date }, { limit: 300 });
    const rows = (res && res.items) || [];

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
      active: true,
      date,
      title: night.title || "",
      totalGames: (night.matches || []).length,
      scoredGames: bySlot.size,
      players,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
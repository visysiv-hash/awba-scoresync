// The app's own view of a night: the saved draw from the Schedule page joined with
// the results stored in the app, returned in the same shape the spreadsheet readers
// use, so score entry and the results screens work with the sheet switched off.
import { deadlinePassed } from "./noResult.ts";

const sydneyToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const dayGap = (iso: string, today: string) =>
  Math.abs(new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000;

// The exact night asked for, or the saved draw closest to today.
export async function appNightFor(base44: any, wantedDate?: string) {
  const page: any = await base44.asServiceRole.entities.DrawNight.filter({}, { limit: 200 });
  const nights: any[] = page.items || page || [];
  const wanted = String(wantedDate || "").trim();
  if (wanted) return nights.find((n: any) => String(n.date) === wanted && !n.archived) || null;
  // Results, Admin score edit and score entry only carry the night still open for
  // scoring. Once the Wednesday deadline has passed that night is history: its games
  // stay in the player search and the ladder, but leave the results board.
  const today = sydneyToday();
  // A deleted draw, or one not published yet, is never the night on show.
  const open = nights.filter(
    (n: any) => !n.archived && n.published !== false && !deadlinePassed(String(n.date))
  );
  if (!open.length) return null;
  return [...open].sort((a: any, b: any) => dayGap(a.date, today) - dayGap(b.date, today))[0] || null;
}

// Every game on the draw, with the result already stored for it when there is one.
export async function appGamesFor(base44: any, wantedDate?: string) {
  const night = await appNightFor(base44, wantedDate);
  const date = night?.date || String(wantedDate || "").trim() || sydneyToday();
  if (!night) return { date, games: [] as any[] };

  const page: any = await base44.asServiceRole.entities.MatchResult.filter({ date }, { limit: 300 });
  const stored: any[] = page.items || page || [];

  const bySlot = new Map<string, any>();
  for (const r of stored) {
    const slot = `${Number(r.net)}|${Number(r.game)}`;
    const seen = bySlot.get(slot);
    const stamp = String(r.updated_date || r.created_date || "");
    if (!seen || stamp > String(seen.updated_date || seen.created_date || "")) bySlot.set(slot, r);
  }

  const games = (night.matches || []).map((m: any) => {
    const game = {
      net: String(m.net ?? ""),
      game: String(m.game ?? ""),
      team1: (m.team1 || []).join(" & "),
      team2: (m.team2 || []).join(" & "),
    };
    const score = bySlot.get(`${Number(m.net)}|${Number(m.game)}`);
    if (!score) return { ...game, scored: false };
    const rounds = Array.isArray(score.rounds) ? score.rounds : [];
    return {
      ...game,
      scored: true,
      rounds,
      total1: score.score1 ?? rounds.reduce((t: number, r: any) => t + (Number(r.score1) || 0), 0),
      total2: score.score2 ?? rounds.reduce((t: number, r: any) => t + (Number(r.score2) || 0), 0),
      timestamp: score.updated_date || score.created_date || null,
    };
  });

  return {
    date,
    games: games.sort(
      (a: any, b: any) => Number(a.net) - Number(b.net) || Number(a.game) - Number(b.game)
    ),
  };
}
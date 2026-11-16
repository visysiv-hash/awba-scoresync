import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { deadlinePassed } from "../../shared/noResult.ts";
import { gamePlayers, mergePlayerRatings, ratingAverage } from "../../shared/gameRatings.ts";

// Players rate how a game played. Scores can be entered first — the rating stays
// open until the same 11:59pm Wednesday deadline, and each player records their
// own stars, so the game's rating is the average of everyone who answered.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { net, game, date: wantedDate, ratings } = await req.json().catch(() => ({}));

    if (!net || !game || !Array.isArray(ratings) || !ratings.length) {
      return Response.json({ error: "Pick a game and give at least one rating." }, { status: 400 });
    }

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
    const dayGap = (iso: string) =>
      Math.abs(new Date(`${iso}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000;

    let date = String(wantedDate || "").trim();
    if (!date) {
      const rows: any = await base44.asServiceRole.entities.DrawNight.filter({});
      const all: any[] = Array.isArray(rows) ? rows : rows.items || [];
      const open = all
        .filter((n: any) => !n.archived && n.published !== false && !deadlinePassed(String(n.date)))
        .sort((a: any, b: any) => dayGap(a.date) - dayGap(b.date));
      date = open[0]?.date || today;
    }

    if (deadlinePassed(date)) {
      return Response.json({
        error: `Ratings for ${date} closed at 11:59pm Wednesday. Ask the committee if you missed it.`,
      });
    }

    const found: any = await base44.asServiceRole.entities.MatchResult.filter(
      { date, net: Number(net), game: Number(game) },
      { limit: 5 }
    );
    const row = (found.items || [])[0];
    if (!row) {
      return Response.json({ error: "The scores for this game haven't been entered yet — enter them first." });
    }

    const stored = [
      ...(Array.isArray(row.team1_players) ? row.team1_players : []),
      ...(Array.isArray(row.team2_players) ? row.team2_players : []),
    ];
    const players = stored.length ? stored : gamePlayers(row.team1, row.team2);

    const merged = mergePlayerRatings(row.player_ratings, ratings, players);
    const average = ratingAverage(merged);

    await base44.asServiceRole.entities.MatchResult.update(row.id, {
      player_ratings: merged,
      ...(average ? { rating: average } : {}),
    });

    return Response.json({ success: true, date, player_ratings: merged, rating: average ?? null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
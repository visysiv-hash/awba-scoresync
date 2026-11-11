import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { loadAppMatchResults } from "../../shared/appMatchResults.ts";
import { computeAppRatings } from "../../shared/appRatings.ts";

// One player's season, summarised: totals, rating trend and badges.
const key = (v: any) => String(v || "").trim().toLowerCase();
const r2 = (v: any) => Math.round(Number(v) * 100) / 100;
const names = (v: any) => (Array.isArray(v) ? v : []).map((n: any) => String(n).trim()).filter(Boolean);
const avgOf = (list: number[]) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);
const roundOf = (a: any, b: any) => (Number(a.net) || 0) - (Number(b.net) || 0) || (Number(a.game) || 0) - (Number(b.game) || 0);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const player = String(body.player || "").trim();
    if (!player) return Response.json({ found: false });
    const me = key(player);

    const rows: any[] = await loadAppMatchResults(base44);

    // Round groups, base groups and the date each round was played.
    const roundGroups: Record<string, number> = {};
    const startGroups: Record<string, number> = {};
    const roundDates: Record<number, string> = {};
    const groupPage = await base44.asServiceRole.entities.RoundGroup.filter({}, { limit: 400 });
    for (const g of groupPage.items || []) {
      const rd = Number(g.round);
      if (g.date && rd > 0) roundDates[rd] = g.date;
      for (const e of g.entries || []) {
        if (!e?.player) continue;
        if (rd === 0) startGroups[key(e.player)] = Number(e.group);
        else roundGroups[`${key(e.player)}|${rd}`] = Number(e.group);
      }
    }
    const settingPage = await base44.asServiceRole.entities.AppSetting.filter({}, { limit: 500 });
    for (const s of settingPage.items || []) {
      const m = String(s.key || "").match(/^base_group:(.+)$/);
      const group = parseInt(s.value);
      if (m && group) startGroups[key(m[1])] = group;
    }
    for (const r of rows) {
      const rd = Number(r.round);
      if (rd > 0 && r.date && !roundDates[rd]) roundDates[rd] = r.date;
    }

    // The season runs from the current Season's start date, so a new block of
    // rounds reads as a fresh wrap rather than the whole history.
    const today = new Date().toISOString().slice(0, 10);
    let fromDate = String(body.from || "").trim() || null;
    let seasonLabel = "All time";
    if (!fromDate) {
      const seasonPage = await base44.asServiceRole.entities.Season.list({ limit: 20 });
      const active = (seasonPage.items || []).find(
        (s: any) => s.start_date && s.start_date <= today && (!s.end_date || s.end_date >= today)
      );
      if (active?.start_date) {
        fromDate = active.start_date;
        seasonLabel = active.name || "This season";
      }
    }

    const mine: any[] = [];
    for (const r of rows) {
      const t1 = names(r.team1_players);
      const t2 = names(r.team2_players);
      const in1 = t1.some((n) => key(n) === me);
      const in2 = !in1 && t2.some((n) => key(n) === me);
      if (!in1 && !in2) continue;
      const date = String(r.date || "");
      if (fromDate && date < fromDate) continue;
      const s1 = Number(r.score1) || 0;
      const s2 = Number(r.score2) || 0;
      const score = in1 ? s1 : s2;
      const oppScore = in1 ? s2 : s1;
      mine.push({
        date,
        round: Number(r.round) || 0,
        net: r.net ?? "",
        game: r.game ?? "",
        team: in1 ? t1 : t2,
        opponents: in1 ? t2 : t1,
        score,
        oppScore,
        result: score > oppScore ? "W" : score < oppScore ? "L" : "D",
      });
    }
    if (!mine.length) return Response.json({ found: false, player, seasonLabel });

    mine.sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round || roundOf(a, b));

    const rated = (computeAppRatings(rows, roundGroups, null, startGroups).players || []) as any[];
    const entry = rated.find((p) => key(p.player) === me) || null;
    const ratingOf: Record<string, number> = {};
    for (const p of rated) ratingOf[key(p.player)] = Number(p.rating);

    const roundsInSeason = mine.map((g) => g.round).filter((r) => r > 0);
    const firstRound = roundsInSeason.length ? Math.min(...roundsInSeason) : null;

    // Where the rating stood before this season's first round: that is the
    // starting point the trend line climbs from.
    let startRating = startGroups[me] ?? entry?.baseGroup ?? null;
    if (firstRound && firstRound > 1) {
      const prev = (computeAppRatings(rows, roundGroups, firstRound - 1, startGroups).players || []).find(
        (p: any) => key(p.player) === me
      );
      if (prev) startRating = Number(prev.rating);
    }
    const nowRating = entry ? Number(entry.rating) : startRating;

    const trend: any[] = [];
    if (startRating != null) trend.push({ label: "Start", date: null, rating: r2(startRating) });
    for (const d of (entry?.rounds || []) as any[]) {
      if (firstRound && d.round < firstRound) continue;
      trend.push({
        label: `R${d.round}`,
        round: d.round,
        date: roundDates[d.round] || null,
        rating: r2(d.sessionRating),
      });
    }

    const wins = mine.filter((g) => g.result === "W").length;
    const losses = mine.filter((g) => g.result === "L").length;
    const draws = mine.filter((g) => g.result === "D").length;
    const pointsFor = mine.reduce((s, g) => s + g.score, 0);
    const pointsAgainst = mine.reduce((s, g) => s + g.oppScore, 0);
    const nights = [...new Set(mine.map((g) => g.date))];

    let streak = 0;
    let bestStreak = 0;
    for (const g of mine) {
      streak = g.result === "W" ? streak + 1 : 0;
      if (streak > bestStreak) bestStreak = streak;
    }

    const partners: Record<string, any> = {};
    for (const g of mine) {
      for (const n of g.team) {
        if (!n || key(n) === me) continue;
        const p = (partners[key(n)] = partners[key(n)] || { name: n, games: 0, wins: 0 });
        p.games++;
        if (g.result === "W") p.wins++;
      }
    }
    const partnerList = Object.values(partners).sort((a: any, b: any) => b.games - a.games || b.wins - a.wins);

    const opponents = new Set<string>();
    for (const g of mine) for (const n of g.opponents) if (n) opponents.add(key(n));

    const beaten = mine.filter((g) => g.result === "W");
    const bigWin = beaten.length
      ? beaten.reduce((best, g) => (g.score - g.oppScore > best.score - best.oppScore ? g : best))
      : null;

    const byNight: Record<string, any> = {};
    for (const g of mine) {
      const n = (byNight[g.date] = byNight[g.date] || { date: g.date, games: 0, wins: 0, diff: 0, points: 0 });
      n.games++;
      n.points += g.score;
      n.diff += g.score - g.oppScore;
      if (g.result === "W") n.wins++;
    }
    const nightList = Object.values(byNight);
    const bestNight = nightList.reduce((best: any, n: any) => (!best || n.diff > best.diff ? n : best), null);
    const perfectNight = nightList.find((n: any) => n.games >= 2 && n.wins === n.games) || null;
    const centuryNight = nightList.find((n: any) => n.points >= 100) || null;

    // A win where the pair faced was rated clearly higher.
    let giant = null;
    for (const g of beaten) {
      const myAvg = avgOf(g.team.map((n: string) => ratingOf[key(n)]).filter((v: any) => v != null));
      const oppAvg = avgOf(g.opponents.map((n: string) => ratingOf[key(n)]).filter((v: any) => v != null));
      if (myAvg == null || oppAvg == null) continue;
      const gap = oppAvg - myAvg;
      if (gap >= 0.5 && (!giant || gap > giant.gap)) {
        giant = { gap: r2(gap), opponent: g.opponents.join(" & "), date: g.date, margin: g.score - g.oppScore };
      }
    }

    const topPartner = partnerList[0] || null;
    const change = startRating != null && nowRating != null ? r2(nowRating - startRating) : null;

    const badges = [
      { id: "first", label: "First Serve", description: "Played a game this season" },
      { id: "ten", label: "Regular", description: "10 games played" },
      { id: "twentyfive", label: "Season Stalwart", description: "25 games played" },
      { id: "streak", label: "Hot Streak", description: "4 wins in a row" },
      { id: "giant", label: "Giant Slayer", description: "Beat a higher-rated pair" },
      { id: "perfect", label: "Perfect Night", description: "Won every game one night" },
      { id: "century", label: "Century Night", description: "100+ points in one night" },
      { id: "pair", label: "Iron Pair", description: "5 games with one partner" },
      { id: "social", label: "Social Butterfly", description: "5 different partners" },
      { id: "climber", label: "Climber", description: "Rating up 0.5 or more" },
    ].map((b) => ({ ...b, earned: false, detail: null as any }));

    const set = (id: string, earned: boolean, detail?: any) => {
      const b = badges.find((x) => x.id === id);
      if (!b) return;
      b.earned = earned;
      if (earned && detail != null) b.detail = detail;
    };
    set("first", mine.length >= 1, `${mine.length} game${mine.length === 1 ? "" : "s"}`);
    set("ten", mine.length >= 10, `${mine.length} games`);
    set("twentyfive", mine.length >= 25, `${mine.length} games`);
    set("streak", bestStreak >= 4, `${bestStreak} in a row`);
    set("giant", !!giant, giant ? `+${giant.gap} rating gap` : null);
    set("perfect", !!perfectNight, perfectNight ? `${perfectNight.games} from ${perfectNight.games}` : null);
    set("century", !!centuryNight, centuryNight ? `${centuryNight.points} points` : null);
    set("pair", !!topPartner && topPartner.games >= 5, topPartner ? `${topPartner.games} with ${topPartner.name}` : null);
    set("social", partnerList.length >= 5, `${partnerList.length} partners`);
    set("climber", change != null && change >= 0.5, change != null ? `${change > 0 ? "+" : ""}${change}` : null);

    return Response.json({
      found: true,
      player: entry?.player || player,
      seasonLabel,
      range: { from: fromDate, to: today },
      rating: {
        now: nowRating != null ? r2(nowRating) : null,
        start: startRating != null ? r2(startRating) : null,
        change,
        group: entry?.currentGroup ?? null,
        provisional: entry?.provisional ?? false,
      },
      placement: {
        player: entry?.player || player,
        rating: nowRating,
        gp: entry?.gp ?? 0,
        baseGroup: entry?.baseGroup ?? startGroups[me] ?? null,
        currentGroup: entry?.currentGroup ?? null,
        rounds: (entry?.rounds || []).map((r) => ({ group: r.group, gp: r.gp, diff: r.diff })),
        splits: entry?.splits ?? null,
      },
      totals: {
        games: mine.length,
        wins,
        losses,
        draws,
        winRate: Math.round((wins / mine.length) * 100),
        nights: nights.length,
        pointsFor,
        pointsAgainst,
        diff: pointsFor - pointsAgainst,
        avgPoints: r2(pointsFor / mine.length),
        bestStreak,
      },
      partners: partnerList.slice(0, 6),
      partnerCount: partnerList.length,
      opponentCount: opponents.size,
      bigWin: bigWin
        ? { margin: bigWin.score - bigWin.oppScore, myTeam: bigWin.team.join(" & "), opponent: bigWin.opponents.join(" & "), score: `${bigWin.score}–${bigWin.oppScore}`, date: bigWin.date }
        : null,
      bestNight: bestNight ? { ...bestNight, diff: bestNight.diff } : null,
      trend,
      badges,
    });
  } catch (error) {
    return Response.json({ found: false, error: error.message });
  }
}
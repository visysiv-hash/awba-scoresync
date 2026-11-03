// Stored match results are the league's source of truth now: the spreadsheet is an
// import source, so player history and weekly standings read them directly instead
// of waiting for the sheet tabs to be extended to the latest week.

const gameKey = (r: any) =>
  [
    r.date || "",
    r.net ?? "",
    r.game ?? "",
    [...(Array.isArray(r.team1_players) ? r.team1_players : []), ...(Array.isArray(r.team2_players) ? r.team2_players : [])]
      .map((n: string) => String(n).trim().toLowerCase())
      .sort()
      .join("+"),
  ].join("|");

export async function loadAppMatchResults(base44: any, maxPages = 6) {
  let rows: any[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const options: any = { sort: "round", limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await base44.asServiceRole.entities.MatchResult.filter({}, options);
    rows = rows.concat(page.items || []);
    if (!page.has_more) break;
    cursor = page.next_cursor;
  }

  // The same game can be stored twice (an app submission plus the sheet import):
  // keep one copy so a week's totals are not double counted.
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of rows) {
    const key = gameKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }

  await syncSheetScores(base44, out);
  await assignRounds(base44, out);
  return out;
}

const splitNames = (s: any) =>
  String(s || "")
    .split(/\s*(?:&|\band\b|\/|,)\s*/i)
    .map((n: string) => n.trim())
    .filter(Boolean);

const isoFromStamp = (stamp: any) => {
  const m = String(stamp || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// The draw spreadsheet's Scores tab holds the night's games. A score entered there
// (or one saved before the app kept its own copy) would otherwise never reach the
// app, so any of the last ten nights' games missing here are added before reading.
async function syncSheetScores(base44: any, rows: any[]) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const raw = Deno.env.get("SPREADSHEET_ID") || "";
    const sheetId = raw.includes("/spreadsheets/d/")
      ? raw.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : raw.split("/")[0].split("?")[0];
    if (!sheetId) return;

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Scores!A:K")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const values = (await res.json()).values || [];

    const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const seen = new Set(rows.map((r) => `${r.date}|${r.net}|${r.game}`));

    // The Scores tab records one night's games, so a row typed in late (or one
    // entered without a timestamp) belongs to that same night, not to the day it
    // was typed on.
    const byDate: Record<string, number> = {};
    for (const s of values) {
      const d = isoFromStamp(s[10]);
      if (d) byDate[d] = (byDate[d] || 0) + 1;
    }
    const mostCommon = Object.entries(byDate).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const recentNight =
      mostCommon && mostCommon >= new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        ? mostCommon
        : null;

    const latest: Record<string, any> = {};
    for (const s of values) {
      const net = String(s[0] || "").trim();
      const game = String(s[1] || "").trim();
      if (!/^\d+$/.test(net) || !/^\d+$/.test(game)) continue;
      const own = isoFromStamp(s[10]);
      const date = !own ? recentNight : recentNight && own > recentNight ? recentNight : own;
      if (!date || date < cutoff) continue;
      latest[`${date}|${net}|${game}`] = s;
    }

    const missing = Object.entries(latest)
      .filter(([key]) => !seen.has(key))
      .map(([key, s]: any) => {
        // App-submitted rows hold the two rounds in E-H; manually entered ones
        // start at F and put the totals in J-K.
        const isManual = !String(s[4] || "").trim();
        const rounds = isManual
          ? [
              { score1: Number(s[5]) || 0, score2: Number(s[6]) || 0 },
              { score1: Number(s[7]) || 0, score2: Number(s[8]) || 0 },
            ]
          : [
              { score1: Number(s[4]) || 0, score2: Number(s[5]) || 0 },
              { score1: Number(s[6]) || 0, score2: Number(s[7]) || 0 },
            ];
        const [date, net, game] = key.split("|");
        return {
          date,
          net: Number(net),
          game: Number(game),
          team1: String(s[2] || "").trim(),
          team2: String(s[3] || "").trim(),
          team1_players: splitNames(s[2]),
          team2_players: splitNames(s[3]),
          score1: rounds.reduce((t, r) => t + r.score1, 0),
          score2: rounds.reduce((t, r) => t + r.score2, 0),
          rounds,
          source: "sheet",
        };
      })
      .filter((r) => r.team1_players.length > 0 && r.team2_players.length > 0);

    if (missing.length === 0) return;
    const created: any = await base44.asServiceRole.entities.MatchResult.bulkCreate(missing);
    for (const c of Array.isArray(created) ? created : []) rows.push(c);
  } catch {
    // Sheet unreachable: the app's own stored results are still used.
  }
}

// Scores submitted in the app are stored without a round number. Give them the
// round played that night (the round another result of the same date holds, else
// the next round after the latest known one) so they count in their own week.
async function assignRounds(base44: any, rows: any[]) {
  const pending = rows.filter((r) => !(Number(r.round) > 0));
  if (!pending.length) return;

  const dateToRound: Record<string, number> = {};
  for (const r of rows) {
    if (Number(r.round) > 0 && r.date) dateToRound[r.date] = Number(r.round);
  }

  const groupPage = await base44.asServiceRole.entities.RoundGroup.filter({}, { limit: 200 });
  for (const g of groupPage.items || []) {
    if (!g.date || !(Number(g.round) > 0) || dateToRound[g.date]) continue;
    dateToRound[g.date] = Number(g.round);
  }

  const maxKnown = Math.max(0, ...rows.map((r) => Number(r.round) || 0));
  const dates = [...new Set(pending.map((r) => r.date).filter(Boolean))].sort();
  const pendingRound: Record<string, number> = {};
  dates.forEach((d: any, i) => {
    pendingRound[d] = dateToRound[d] ?? maxKnown + 1 + i;
  });

  for (const r of pending) {
    r.round = (r.date && pendingRound[r.date]) || maxKnown + 1;
  }
}

// "2026-11-03" -> "03/11/2026", to match how the dates are shown elsewhere.
export function auDate(value: any) {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return String(value || "");
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}
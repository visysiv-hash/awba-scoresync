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

  await assignRounds(base44, out);
  return out;
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
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
  return out;
}

// "2026-11-03" -> "03/11/2026", to match how the dates are shown elsewhere.
export function auDate(value: any) {
  const parts = String(value || "").split("-");
  if (parts.length !== 3) return String(value || "");
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}
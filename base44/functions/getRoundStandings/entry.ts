import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { loadAppMatchResults, auDate } from "../../shared/appMatchResults.ts";

// The week list comes from the results stored in the app, so the latest week
// appears as soon as its scores are in — the spreadsheet tabs lag behind.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const rows = await loadAppMatchResults(base44);

    const dateCounts: Record<number, Record<string, number>> = {};
    for (const r of rows) {
      const round = Number(r.round);
      if (!(round > 0)) continue;
      if (r.date) {
        dateCounts[round] = dateCounts[round] || {};
        dateCounts[round][r.date] = (dateCounts[round][r.date] || 0) + 1;
      } else {
        dateCounts[round] = dateCounts[round] || {};
      }
    }

    const roundDateMap: Record<string, string> = {};
    for (const [round, dates] of Object.entries(dateCounts)) {
      const best = Object.entries(dates).sort((a, b) => b[1] - a[1])[0];
      if (best) roundDateMap[round] = auDate(best[0]);
    }

    const rounds = Object.keys(dateCounts).sort((a, b) => Number(a) - Number(b));

    return Response.json({ rounds, roundDateMap });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
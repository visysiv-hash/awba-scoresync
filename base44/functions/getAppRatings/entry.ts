import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeAppRatings } from "../../shared/appRatings.ts";

// Ratings for one night, calculated from app-stored results only.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { date } = await req.json().catch(() => ({}));

    const page = await base44.asServiceRole.entities.MatchResult.filter({}, { sort: "-date", limit: 1000 });
    const rows = page.items || [];

    if (rows.length === 0) {
      return Response.json({ date: null, dates: [], matchCount: 0, players: [] });
    }

    const dates = [...new Set(rows.map((r: any) => String(r.date || "")))].filter(Boolean).sort().reverse();
    const wanted = date && dates.includes(date) ? date : dates[0];
    const night = rows.filter((r: any) => String(r.date) === wanted);

    const { players } = computeAppRatings(night);

    return Response.json({ date: wanted, dates, matchCount: night.length, players });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
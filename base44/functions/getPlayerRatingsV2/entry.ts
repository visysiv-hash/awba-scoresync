import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { computePlayerRatings } from "../../shared/playerRatings.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");
    const opts = await req.json().catch(() => ({}));

    const [playersRes, gamesRes, rawRes, standingsRes] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Players!A:G`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Games!A:R`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Raw_Responses!A:K`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/${encodeURIComponent("Group_Round_Standings!A1:Z2000")}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    ]);

    const data = {
      playersJson: await playersRes.json(),
      gamesJson: await gamesRes.json(),
      rawJson: await rawRes.json(),
      standingsJson: await standingsRes.json(),
    };

    const result = computePlayerRatings(data, opts);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
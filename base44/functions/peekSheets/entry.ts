import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    // Fetch first 3 rows of Raw_Responses to see columns
    const [rawRes, gamesRes] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Raw_Responses!A1:Z5`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Games!A1:Z5`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    ]);

    const rawJson = await rawRes.json();
    const gamesJson = await gamesRes.json();

    return Response.json({
      rawHeaders: rawJson.values?.[0] || [],
      rawSampleRow: rawJson.values?.[1] || [],
      rawSampleRow2: rawJson.values?.[2] || [],
      gamesHeaders: gamesJson.values?.[0] || [],
      gamesSampleRow: gamesJson.values?.[1] || [],
      gamesSampleRow2: gamesJson.values?.[2] || [],
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const SHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const BOOKING_DATA_TAB = "BookingData";
const AVAILABILITY_TAB = "PlayerAvailability";
const AVAIL_START_ROW = 17;
const AVAIL_COL = "B";
const CLEAR_END_ROW = 1000;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // 1. Get the spreadsheet timezone so "today" matches the sheet's dates
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=properties.timeZone`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const meta = await metaRes.json();
    const timeZone = meta?.properties?.timeZone || "Australia/Sydney";

    // 2. Read BookingData columns A (player name) and B (booking date)
    const dataRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${BOOKING_DATA_TAB}!A:B`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const dataJson = await dataRes.json();
    const rows = dataJson.values || [];

    // 3. Today's date in yyyy-MM-dd in the spreadsheet's timezone
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const seen = new Set();
    const players: string[] = [];
    for (const row of rows) {
      const playerName = String(row[0] || "").trim();
      const bookingDate = String(row[1] || "").trim();
      if (playerName && bookingDate === today) {
        const key = playerName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          players.push(playerName);
        }
      }
    }

    // 4. Clear the existing player list from B17 downward
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchClear`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ranges: [`${AVAILABILITY_TAB}!${AVAIL_COL}${AVAIL_START_ROW}:${AVAIL_COL}${CLEAR_END_ROW}`],
        }),
      }
    );
    if (!clearRes.ok) {
      const errText = await clearRes.text();
      return Response.json({ error: `Failed to clear availability list: ${errText}` }, { status: 500 });
    }

    // 5. Write the unique player names starting at B17
    if (players.length > 0) {
      const values = players.map((name) => [name]);
      const writeRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${AVAILABILITY_TAB}!${AVAIL_COL}${AVAIL_START_ROW}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        }
      );
      if (!writeRes.ok) {
        const errText = await writeRes.text();
        return Response.json({ error: `Failed to write availability list: ${errText}` }, { status: 500 });
      }
    }

    return Response.json({
      success: true,
      today,
      players,
      count: players.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
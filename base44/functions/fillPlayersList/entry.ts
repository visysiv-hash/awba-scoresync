import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sheetsRequest } from "../../shared/sheetWrite.ts";

const SHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const AVAILABILITY_TAB = "PlayerAvailability";
const AVAIL_START_ROW = 17;
const AVAIL_COL = "B";
const CLEAR_END_ROW = 1000;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // 1. Determine "today" in the spreadsheet's timezone so it matches session dates
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=properties.timeZone`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const meta = await metaRes.json();
    const timeZone = meta?.properties?.timeZone || "Australia/Sydney";

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // 2. Read today's active bookings from the Booking entity (source of truth).
    //    This avoids drift that can happen when the BookingData sheet write fails.
    const page = await base44.asServiceRole.entities.Booking.filter(
      { session_date: today, status: { $ne: "cancelled" } },
      { limit: 500, fields: ["user_name"] }
    );

    const seen = new Set();
    const players: string[] = [];
    for (const b of (page.items || [])) {
      const playerName = String(b.user_name || "").trim();
      if (!playerName) continue;
      const key = playerName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        players.push(playerName);
      }
    }

    // 3. Clear the existing player list from B17 downward
    const clearRes = await sheetsRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchClear`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          ranges: [`${AVAILABILITY_TAB}!${AVAIL_COL}${AVAIL_START_ROW}:${AVAIL_COL}${CLEAR_END_ROW}`],
        }),
      }
    );
    if (!clearRes.ok) {
      const errText = await clearRes.text();
      return Response.json({ error: `Failed to clear availability list: ${errText}` }, { status: 500 });
    }

    // 4. Write the unique player names starting at B17
    if (players.length > 0) {
      const values = players.map((name) => [name]);
      const writeRes = await sheetsRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${AVAILABILITY_TAB}!${AVAIL_COL}${AVAIL_START_ROW}?valueInputOption=RAW`,
        accessToken,
        {
          method: "PUT",
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
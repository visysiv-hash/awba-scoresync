import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sheetsRequest } from "../../shared/sheetWrite.ts";
import { unpaidPenaltyNames } from "../../shared/penalties.ts";
import { sheetsEnabled } from "../../shared/sheetSwitch.ts";

const SHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
const AVAILABILITY_TAB = "PlayerAvailability";
const AVAIL_START_ROW = 17;
const AVAIL_COL = "B";
const CLEAR_END_ROW = 1000;

// The roster the sheet is filled from: today's bookings, less anyone who still
// owes a late-cancellation fee.
async function todayRoster(base44: any, today: string) {
  const page = await base44.asServiceRole.entities.Booking.filter(
    { session_date: today, status: { $ne: "cancelled" } },
    { limit: 500, fields: ["user_name"] }
  );
  const unpaidNames = await unpaidPenaltyNames(base44);
  const seen = new Set();
  const players: string[] = [];
  const excluded: string[] = [];
  for (const b of page.items || []) {
    const playerName = String(b.user_name || "").trim();
    if (!playerName) continue;
    const key = playerName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (unpaidNames.has(key)) {
      excluded.push(playerName);
      continue;
    }
    players.push(playerName);
  }
  return { players, excluded };
}

const sydneyToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Sheet switched off: the roster stays in the app and no sheet is written.
    if (!(await sheetsEnabled(base44))) {
      const today = sydneyToday();
      const { players, excluded } = await todayRoster(base44, today);
      return Response.json({ success: true, today, players, count: players.length, excluded });
    }

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

    // 2. Today's active bookings are the source of truth for the list.
    const { players, excluded } = await todayRoster(base44, today);

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
      excluded,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
// Every booking is mirrored into the BookingData tab (player name + session date)
// so the committee's spreadsheet always matches the app's booking list.
//
// Google occasionally answers with a transient failure (rate limit, brief 5xx),
// so an attempt is retried a couple of times before giving up.

const BOOKING_SPREADSHEET_ID = Deno.env.get("STANDINGS_SPREADSHEET_ID") ?? "";
const BOOKING_SHEET = "BookingData";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Appends a booking row [name, date].
//
// It appends straight away, without re-reading the tab first: a read of this tab
// takes Google ~40 seconds, while the append itself takes under a second. The
// app already refuses a duplicate booking for the same player and session before
// this is called, so the pre-check is not needed.
//
// Returns true on success, false if all attempts failed.
export async function appendBookingToSheet(base44: any, name: string, date: string): Promise<boolean> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

      // Append new row [name, date]
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}/values/${BOOKING_SHEET}!A:B:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
      const appendRes = await fetch(appendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [[name, date]] }),
      });
      if (!appendRes.ok) throw new Error(`append ${appendRes.status}`);
      return true;
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`appendBookingToSheet failed for "${name}" / ${date} after ${MAX_ATTEMPTS} attempts:`, e);
        return false;
      }
      await sleep(500 * attempt); // back off before retrying
    }
  }

  return false;
}
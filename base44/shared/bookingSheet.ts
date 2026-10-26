// Every booking is mirrored into the BookingData tab (player name + session date)
// so the committee's spreadsheet always matches the app's booking list.
//
// Google occasionally answers with a transient failure (rate limit, brief 5xx),
// so an attempt is retried a couple of times before giving up.

const BOOKING_SPREADSHEET_ID = Deno.env.get("STANDINGS_SPREADSHEET_ID") ?? "";
const BOOKING_SHEET = "BookingData";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Appends a booking row, skipping a name already recorded for that date.
// Returns true on success (or duplicate-skip), false if all attempts failed.
export async function appendBookingToSheet(base44: any, name: string, date: string): Promise<boolean> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

      // Read existing rows to check for duplicates (name + date)
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${BOOKING_SPREADSHEET_ID}/values/${BOOKING_SHEET}!A:B`;
      const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!readRes.ok) throw new Error(`read ${readRes.status}`);
      const readData = await readRes.json();
      const existing = (readData.values || []).slice(1); // skip header
      const isDuplicate = existing.some((r: any[]) =>
        String(r[0] || "").trim().toLowerCase() === String(name).trim().toLowerCase() &&
        String(r[1] || "").trim() === String(date).trim()
      );
      if (isDuplicate) return true; // already recorded

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
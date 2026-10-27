// Shared rules for late cancellations of Tuesday sessions.
// Cancelling a confirmed Tuesday booking after 11:00 AM Sydney time on the
// session's own date makes the player liable for that session's fee, and a
// suspension set by the committee stops them booking until it is cleared.

export const SYDNEY_TIME_ZONE = "Australia/Sydney";
const CUTOFF_HOUR = 11;

export function isTuesdaySession(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getUTCDay() === 2;
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc: Record<string, string>, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Epoch ms of the 11:00 AM Sydney cut-off on the given YYYY-MM-DD date.
export function cutoffInstant(dateStr: string): number {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, CUTOFF_HOUR, 0, 0);
  let ts = naive - tzOffsetMs(new Date(naive), SYDNEY_TIME_ZONE);
  ts = naive - tzOffsetMs(new Date(ts), SYDNEY_TIME_ZONE);
  return ts;
}

export function isLateCancellation(sessionDate: string, now: Date = new Date()): boolean {
  if (!isTuesdaySession(sessionDate)) return false;
  return now.getTime() > cutoffInstant(sessionDate);
}

// The fee owed: the session's own price, or the largest amount in its payment notes.
export function sessionFee(session: any): number {
  const price = Number(session?.price);
  if (!Number.isNaN(price) && price > 0) return price;

  const amounts = (session?.payment_notes || [])
    .map((pn: any) => Number(pn?.amount))
    .filter((n: number) => !Number.isNaN(n) && n > 0);

  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

// The first late cancellation is a warning only; from the second on the session
// fee applies and the committee decides on a suspension.
export function penaltyMessage(occurrences: number, feeAmount: number): string {
  const fee = feeAmount > 0 ? ` ($${feeAmount.toFixed(2)})` : "";

  if (occurrences > 1) {
    return `Because you have cancelled after the cut-off time more than once, you are required to pay the session fee${fee}, and any suspension will be determined by the committee.`;
  }
  return "This is your first cancellation after the cut-off time, so no fee applies this time. Please note that any further cancellations after the cut-off will attract a fine and may result in suspension from booking.";
}

export function suspensionMessage(playerName: string): string {
  return `${playerName} cannot book while suspended by the committee. Please contact the committee.`;
}

function asItems(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.items || [];
}

export async function findActiveSuspension(base44: any, playerName: string): Promise<any | null> {
  // These backend functions run on an older SDK build: pass the query only, a
  // second options argument would drop it and match nothing.
  const res = await base44.asServiceRole.entities.LateCancellation.filter({
    player_name: playerName,
    suspended: true,
  });
  const items = asItems(res);
  return items.length > 0 ? items[0] : null;
}

// Lower-cased names of players who still owe a late-cancellation fee.
export async function unpaidPenaltyNames(base44: any): Promise<Set<string>> {
  const res = await base44.asServiceRole.entities.LateCancellation.filter({ fee_status: "unpaid" });
  const names = asItems(res)
    .map((r: any) => String(r?.player_name || "").trim().toLowerCase())
    .filter(Boolean);
  return new Set(names);
}
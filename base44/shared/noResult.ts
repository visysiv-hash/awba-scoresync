// Scores are due by the end of Thursday (Sydney) after a session. A game still
// unscored after that is held as "no result": the ladder gives it no game played
// and no points either way, while the ratings still take the 21-point hit, which
// is the penalty for not submitting. Either pair could have entered the scores,
// so both pairs in that game carry it.

import { SYDNEY_TIME_ZONE, tzOffsetMs } from "./penalties.ts";

const DEADLINE_WEEKDAY = 4; // Thursday

// Epoch ms of the Thursday 11:59pm Sydney deadline that follows a session date.
export function noResultDeadline(dateStr: string): number {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return 0;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const target = Date.UTC(y, m - 1, d + ((DEADLINE_WEEKDAY - dow + 7) % 7), 23, 59, 59);
  let ts = target - tzOffsetMs(new Date(target), SYDNEY_TIME_ZONE);
  ts = target - tzOffsetMs(new Date(ts), SYDNEY_TIME_ZONE);
  return ts;
}

export function deadlinePassed(dateStr: string, now: number = Date.now()): boolean {
  const deadline = noResultDeadline(dateStr);
  return deadline > 0 && now > deadline;
}

// A game with nothing scored on either side was never entered, not played.
export function isNoResult(row: any): boolean {
  const games =
    Array.isArray(row?.rounds) && row.rounds.length
      ? row.rounds
      : [{ score1: row?.score1, score2: row?.score2 }];
  return games.every((g: any) => !(Number(g?.score1) > 0) && !(Number(g?.score2) > 0));
}
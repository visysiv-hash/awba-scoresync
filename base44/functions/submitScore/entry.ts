import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { sheetsEnabled } from "../../shared/sheetSwitch.ts";
import { deadlinePassed } from "../../shared/noResult.ts";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { netNumber, gameNumber, team1, team2, rounds, total1, total2 } = await req.json();

  // With the spreadsheet switched off the app's own copy is the only record.
  const useSheet = await sheetsEnabled(base44);
  let scoreRows: any[] = [];
  let existingRow = -1;

  if (useSheet) {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const rawId = Deno.env.get("SPREADSHEET_ID") || "";
    const spreadsheetId = rawId.includes("/spreadsheets/d/")
      ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
      : rawId.split("/")[0].split("?")[0];

    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Build row: Net, Game, Team1, Team2, R1_T1, R1_T2, R2_T1, R2_T2, Total1, Total2, Timestamp
    const r1 = rounds[0] || { score1: 0, score2: 0 };
    const r2 = rounds[1] || { score1: 0, score2: 0 };
    const values = [[
      netNumber, gameNumber, team1, team2,
      r1.score1, r1.score2,
      r2.score1, r2.score2,
      total1, total2,
      timestamp
    ]];

    // Read the Scores tab once. A net and match number can only be played once a
    // night, so if tonight already has a row for this game it is the same game
    // entered again: correct that row instead of adding a duplicate.
    const scoresRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A:K`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const scoresData = await scoresRes.json();
    scoreRows = scoresData.values || [];

    const todayStamp = timestamp.slice(0, 10);
    for (let i = 1; i < scoreRows.length; i++) {
      const row = scoreRows[i];
      if (String(row[0] || "").trim() !== String(netNumber).trim()) continue;
      if (String(row[1] || "").trim() !== String(gameNumber).trim()) continue;
      if (!String(row[10] || "").startsWith(todayStamp)) continue;
      existingRow = i + 1;
      break;
    }

    const response = existingRow > 0
      ? await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!E${existingRow}:K${existingRow}?valueInputOption=USER_ENTERED`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values: [values[0].slice(4)] }),
          }
        )
      : await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Scores!A${scoreRows.length + 1}:K${scoreRows.length + 1}?valueInputOption=USER_ENTERED`,
          {
            method: "PUT",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ values }),
          }
        );

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: err });
    }
  }

  // Also store the result in the app itself, so ratings can be calculated
  // without the spreadsheet. With the sheet off this is the only copy.
  const splitNames = (s) =>
    String(s || "")
      .split(/\s*(?:&|\band\b|\/|,)\s*/i)
      .map((n) => n.trim())
      .filter(Boolean);

  const sydneyDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // A game entered after the session (for example the next morning) still
  // belongs to that session's night: the night the Scores tab is recording.
  let scoreDate = sydneyDate;
  const nightCounts: Record<string, number> = {};
  for (const row of scoreRows) {
    const m = String(row[10] || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) continue;
    const d = `${m[3]}-${m[2]}-${m[1]}`;
    nightCounts[d] = (nightCounts[d] || 0) + 1;
  }
  const nightDate = Object.entries(nightCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (nightDate && nightDate !== sydneyDate && nightDate >= fourDaysAgo) {
    const onToday = await base44.asServiceRole.entities.MatchResult.filter(
      { date: sydneyDate },
      { limit: 1 }
    );
    if (!(onToday.items || []).length) scoreDate = nightDate;
  }

  // Scores close at 11:59pm Thursday: after that the night already carries the
  // no-submission penalty, and the committee enters any late correction instead.
  if (deadlinePassed(scoreDate)) {
    return Response.json({
      error: `Scores for ${scoreDate} closed at 11:59pm Thursday. Please ask the committee to enter them.`,
    });
  }

  const record: any = {
    date: scoreDate,
    net: Number(netNumber),
    game: Number(gameNumber),
    team1,
    team2,
    team1_players: splitNames(team1),
    team2_players: splitNames(team2),
    score1: Number(total1) || 0,
    score2: Number(total2) || 0,
    rounds,
    source: "app",
  };

  // One result per game per night: a second submission corrects the first.
  const existing = await base44.asServiceRole.entities.MatchResult.filter(
    { date: scoreDate, net: Number(netNumber), game: Number(gameNumber) },
    { limit: 5 }
  );
  const previous = (existing.items || [])[0];
  if (previous) {
    await base44.asServiceRole.entities.MatchResult.update(previous.id, record);
  } else {
    await base44.asServiceRole.entities.MatchResult.create(record);
  }

  return Response.json({ success: true, updated: existingRow > 0 });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PENALTY_POINTS = 21;

// Split a team cell like "Saideep & Ravi" or "Saideep / Ravi" into individual names
function parseTeamNames(cell) {
  if (!cell) return [];
  return String(cell).split(/[&/,]/).map(n => n.trim()).filter(Boolean);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
  const spreadsheetId = Deno.env.get("STANDINGS_SPREADSHEET_ID");
  const rawId = Deno.env.get("SPREADSHEET_ID") || "";
  const scoresSpreadsheetId = rawId.includes("/spreadsheets/d/")
    ? rawId.split("/spreadsheets/d/")[1].split("/")[0].split("?")[0]
    : rawId.split("/")[0].split("?")[0];

  // Fetch standings + raw scores in parallel
  const standingsRange = encodeURIComponent("Group_Leaderboards!A1:K1000");
  const scoresRange = encodeURIComponent("Scores!A:K");

  const [standingsRes, scoresRes] = await Promise.all([
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${standingsRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${scoresSpreadsheetId}/values/${scoresRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!standingsRes.ok) {
    const err = await standingsRes.text();
    return Response.json({ error: err });
  }

  const standingsJson = await standingsRes.json();
  const rows = standingsJson.values || [];

  // Count 0-score penalties per player from the raw Scores sheet
  // Scores: A=net, B=game, C=team1, D=team2, E=r1s1, F=r1s2, G=r2s1, H=r2s2 (app-submitted)
  //         manual rows have E blank, F=r1s1, G=r1s2, H=r2s1, I=r2s2
  const penaltyCount = {};
  if (scoresRes.ok) {
    const scoresJson = await scoresRes.json();
    const scoresRows = scoresJson.values || [];
    for (const s of scoresRows) {
      const team1Names = parseTeamNames(s[2]);
      const team2Names = parseTeamNames(s[3]);
      const isManual = !s[4]?.toString().trim();
      const rounds = isManual
        ? [
            { score1: s[5], score2: s[6] },
            { score1: s[7], score2: s[8] },
          ]
        : [
            { score1: s[4], score2: s[5] },
            { score1: s[6], score2: s[7] },
          ];

      for (const r of rounds) {
        if (Number(r.score1) === 0) {
          for (const name of team1Names) {
            const key = name.toLowerCase();
            penaltyCount[key] = (penaltyCount[key] || 0) + 1;
          }
        }
        if (Number(r.score2) === 0) {
          for (const name of team2Names) {
            const key = name.toLowerCase();
            penaltyCount[key] = (penaltyCount[key] || 0) + 1;
          }
        }
      }
    }
  }

  // Parse groups: a row with only one non-empty cell that contains "Leaderboard" is a group header
  const groups = {};
  let currentGroup = null;
  let skipNextRow = false; // skip the column headers row

  for (const row of rows) {
    const firstCell = (row[0] || "").trim();

    if (firstCell.includes("Leaderboard") && row.filter(c => c.trim()).length <= 1) {
      currentGroup = firstCell;
      groups[currentGroup] = [];
      skipNextRow = true; // next row is column headers
      continue;
    }

    if (skipNextRow) {
      skipNextRow = false;
      continue; // skip "Player, GP, Wins..." header row
    }

    if (!currentGroup || !firstCell) continue;

    // Deduplicate: skip if this player name already exists in this group (case-insensitive)
    const normalised = firstCell.trim().toLowerCase();
    const isDuplicate = groups[currentGroup].some(
      p => p.player.trim().toLowerCase() === normalised
    );
    if (isDuplicate) continue;

    const player = row[0] || "";
    const penalties = penaltyCount[player.trim().toLowerCase()] || 0;

    // Apply penalty: subtract 21 from pointsFor per 0-score round, recompute diff
    const rawPointsFor = Number(row[6] || 0);
    const pointsAgainst = Number(row[7] || 0);
    const penaltyDeduction = penalties * PENALTY_POINTS;
    const adjustedPointsFor = rawPointsFor - penaltyDeduction;
    const adjustedDiff = adjustedPointsFor - pointsAgainst;

    groups[currentGroup].push({
      player,
      gp: row[1] || "0",
      wins: row[2] || "0",
      losses: row[3] || "0",
      draws: row[4] || "0",
      ladderPts: row[5] || "0",
      pointsFor: String(adjustedPointsFor),
      pointsAgainst: row[7] || "0",
      diff: String(adjustedDiff),
      rankScore: row[9] || "0",
      rank: row[10] || "",
      penalties,
    });
  }

  return Response.json({ groups });
});
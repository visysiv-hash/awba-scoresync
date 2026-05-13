import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
  const spreadsheetId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

  const range = encodeURIComponent("Group_Leaderboards!A1:K1000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    return Response.json({ error: err });
  }

  const json = await res.json();
  const rows = json.values || [];

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

    groups[currentGroup].push({
      player: row[0] || "",
      gp: row[1] || "0",
      wins: row[2] || "0",
      losses: row[3] || "0",
      draws: row[4] || "0",
      ladderPts: row[5] || "0",
      pointsFor: row[6] || "0",
      pointsAgainst: row[7] || "0",
      diff: row[8] || "0",
      rankScore: row[9] || "0",
      rank: row[10] || "",
    });
  }

  return Response.json({ groups });
});
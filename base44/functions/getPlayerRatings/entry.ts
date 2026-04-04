import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    // Fetch Players sheet
    // Headers: Player, Active?, Notes, Starting Group, Last Completed Group, Suggested Current Group
    const playersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Players!A:F`;
    const playersRes = await fetch(playersUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const playersJson = await playersRes.json();
    const playersRows = playersJson.values || [];

    // Build player map: name -> suggestedGroup
    const playerMap = {};
    for (let i = 1; i < playersRows.length; i++) {
      const row = playersRows[i];
      const name = (row[0] || "").trim();
      const active = (row[1] || "").toLowerCase();
      if (!name || active === "no") continue;
      // Use Suggested Current Group (col 5), fallback to Last Completed (col 4), then Starting (col 3)
      const suggestedGroup = parseInt(row[5]) || parseInt(row[4]) || parseInt(row[3]) || 6;
      playerMap[name] = suggestedGroup;
    }

    // Fetch Group_Leaderboards sheet
    const range = encodeURIComponent("Group_Leaderboards!A1:K500");
    const standingsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/${range}`;
    const standingsRes = await fetch(standingsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const standingsJson = await standingsRes.json();
    const rows = standingsJson.values || [];

    // Parse leaderboard rows — track current group number
    // Structure: header row "Group X Leaderboard" appears, then col header row, then player rows
    const statsMap = {}; // player -> { gp, diff, groupIndex }
    let currentGroupIndex = 0;
    let skipNextRow = false;

    for (const row of rows) {
      const firstCell = (row[0] || "").trim();

      // Detect group header
      if (firstCell.includes("Leaderboard")) {
        const match = firstCell.match(/\d+/);
        if (match) currentGroupIndex = parseInt(match[0]);
        skipNextRow = true; // skip the column header row that follows
        continue;
      }
      if (skipNextRow) { skipNextRow = false; continue; }
      if (!firstCell) continue;

      const gp = Number(row[1] || 0);
      const diff = Number(row[8] || 0);

      // Store stats for each player per group
      if (!statsMap[firstCell]) statsMap[firstCell] = {};
      statsMap[firstCell][currentGroupIndex] = { gp, diff };
    }

    // Build rated player list
    const players = [];
    for (const [name, suggestedGroup] of Object.entries(playerMap)) {
      const groupStats = statsMap[name] || {};
      // Use stats from their suggested group
      const stats = groupStats[suggestedGroup] || null;
      const baseRate = suggestedGroup;
      let gp = 0, diff = 0;
      let hasStats = false;
      let rating = parseFloat(baseRate.toFixed(2));

      if (stats && stats.gp >= 6) {
        gp = stats.gp;
        diff = stats.diff;
        rating = parseFloat((baseRate - diff / gp / 10).toFixed(2));
        hasStats = true;
      }

      players.push({ player: name, currentGroup: suggestedGroup, gp, diff, rating, hasStats });
    }

    // Sort by rating ascending (lower = stronger)
    players.sort((a, b) => a.rating - b.rating);

    return Response.json({ players });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    const { debug } = await req.json().catch(() => ({}));

    // Fetch Players sheet just for active player list + fallback group
    // Headers: Player, Active?, Notes, Starting Group, Last Completed Group, Suggested Current Group
    const playersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Players!A:F`;
    const playersRes = await fetch(playersUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const playersJson = await playersRes.json();
    const playersRows = playersJson.values || [];

    // Build active player set + fallback group (only used if player has 0 GP in all leaderboards)
    const activePlayers = {};
    for (let i = 1; i < playersRows.length; i++) {
      const row = playersRows[i];
      const name = (row[0] || "").trim();
      const active = (row[1] || "").toLowerCase();
      if (!name || active === "no") continue;
      // fallback group: last completed (col4), else starting (col3), else 6
      const fallbackGroup = parseInt(row[4]) || parseInt(row[3]) || 6;
      activePlayers[name] = fallbackGroup;
    }

    // Fetch Group_Leaderboards sheet
    const range = encodeURIComponent("Group_Leaderboards!A1:K500");
    const standingsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/${range}`;
    const standingsRes = await fetch(standingsUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const standingsJson = await standingsRes.json();
    const rows = standingsJson.values || [];

    // Parse leaderboard rows — collect stats per player per group
    const statsMap = {}; // player -> { [groupIndex]: { gp, diff } }
    let currentGroupIndex = 0;
    let skipNextRow = false;

    for (const row of rows) {
      const firstCell = (row[0] || "").trim();
      if (firstCell.includes("Leaderboard")) {
        const match = firstCell.match(/\d+/);
        if (match) currentGroupIndex = parseInt(match[0]);
        skipNextRow = true;
        continue;
      }
      if (skipNextRow) { skipNextRow = false; continue; }
      if (!firstCell) continue;

      const gp = Number(row[1] || 0);
      const diff = Number(row[8] || 0);
      if (!statsMap[firstCell]) statsMap[firstCell] = {};
      statsMap[firstCell][currentGroupIndex] = { gp, diff };
    }

    if (debug) {
      const name = Object.keys(statsMap).find(k => k.toLowerCase().includes(debug.toLowerCase()));
      return Response.json({
        playerMapEntry: name ? { name, fallbackGroup: activePlayers[name] } : null,
        allGroupStats: name ? statsMap[name] : null,
      });
    }

    // Build rated player list
    const players = [];
    for (const [name, fallbackGroup] of Object.entries(activePlayers)) {
      const groupStats = statsMap[name] || {};

      // Aggregate total GP and diff across ALL groups
      let totalGP = 0;
      let totalDiff = 0;
      for (const gs of Object.values(groupStats)) {
        totalGP += gs.gp;
        totalDiff += gs.diff;
      }

      // Base group = weighted average of all groups played, weighted by GP
      // E.g. 10 games in Group 3 + 2 games in Group 2 → base = (3×10 + 2×2) / 12 = 2.83
      // Falls back to Players sheet "last completed group" if no leaderboard games found
      let baseGroup = fallbackGroup;
      const playedGroupEntries = Object.entries(groupStats).filter(([, gs]) => gs.gp > 0);
      if (playedGroupEntries.length > 0) {
        const weightedSum = playedGroupEntries.reduce((sum, [g, gs]) => sum + parseInt(g) * gs.gp, 0);
        const totalPlayedGP = playedGroupEntries.reduce((sum, [, gs]) => sum + gs.gp, 0);
        baseGroup = parseFloat((weightedSum / totalPlayedGP).toFixed(2));
      }

      let hasStats = false;
      let rating = parseFloat(parseFloat(baseGroup).toFixed(2));

      if (totalGP >= 6) {
        rating = parseFloat((baseGroup - totalDiff / totalGP / 10).toFixed(2));
        hasStats = true;
      }

      players.push({ player: name, currentGroup: baseGroup, gp: totalGP, diff: totalDiff, rating, hasStats });
    }

    players.sort((a, b) => a.rating - b.rating);
    return Response.json({ players });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
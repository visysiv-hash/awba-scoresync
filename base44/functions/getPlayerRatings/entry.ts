import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    const { debug } = await req.json().catch(() => ({}));

    // Fetch all 3 sheets in parallel
    const [playersRes, gamesRes, rawRes, standingsRes] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Players!A:G`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Games!A:R`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Raw_Responses!A:K`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/${encodeURIComponent("Group_Round_Standings!A1:Z2000")}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    ]);

    const playersJson = await playersRes.json();
    const gamesJson = await gamesRes.json();
    const rawJson = await rawRes.json();
    const standingsJson = await standingsRes.json();

    // --- 1. Active players list (for filtering who to show) ---
    const playersRows = playersJson.values || [];
    const activePlayers = new Set();
    for (let i = 1; i < playersRows.length; i++) {
      const row = playersRows[i];
      const name = (row[0] || "").trim();
      const active = (row[1] || "").toLowerCase();
      if (!name || active === "no") continue;
      activePlayers.add(name);
    }

    // --- 2. Build player+round → group lookup from Group_Round_Standings ---
    // Key: "PlayerName|Round" → group number
    const playerRoundGroup = {}; // "Name|Round" -> group
    const standingsRows = standingsJson.values || [];
    if (standingsRows.length > 1) {
      const sHeaders = standingsRows[0].map(h => (h || "").trim().toLowerCase());
      const iSPlayer = sHeaders.indexOf("player");
      const iSRound  = sHeaders.indexOf("round");
      const iSGroup  = sHeaders.indexOf("group");
      for (let i = 1; i < standingsRows.length; i++) {
        const row = standingsRows[i];
        const name  = (row[iSPlayer] || "").trim().toLowerCase();
        const round = (row[iSRound]  || "").trim();
        const group = parseInt(row[iSGroup]) || 0;
        if (name && round && group) {
          playerRoundGroup[`${name}|${round}`] = group;
        }
      }
    }

    // --- 3. Build Game ID → { player1, player2, player3, player4 } from Games sheet ---
    const gamesRows = gamesJson.values || [];
    const gamePlayerMap = {}; // gameId -> { round, p1, p2, p3, p4 }
    if (gamesRows.length > 1) {
      const gHeaders = gamesRows[0].map(h => (h || "").trim().toLowerCase());
      const iRound = gHeaders.indexOf("round");
      const iGameId = gHeaders.indexOf("game id");
      const iP1 = gHeaders.indexOf("player 1");
      const iP2 = gHeaders.indexOf("player 2");
      const iP3 = gHeaders.indexOf("player 3");
      const iP4 = gHeaders.indexOf("player 4");
      for (let i = 1; i < gamesRows.length; i++) {
        const row = gamesRows[i];
        const gameId = (row[iGameId] || "").trim();
        if (!gameId) continue;
        gamePlayerMap[gameId] = {
          round: (row[iRound] || "").trim(),
          p1: (row[iP1] || "").trim(),
          p2: (row[iP2] || "").trim(),
          p3: (row[iP3] || "").trim(),
          p4: (row[iP4] || "").trim(),
        };
      }
    }

    // --- 4. Process Raw_Responses: one row per scored game ---
    // For each game: look up players, look up their group for that round, calc per-player match rating
    const rawRows = rawJson.values || [];

    // playerMatches: name -> [{ round, gameId, group, diff, matchRating }]
    const playerMatches = {};

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const gameId  = (row[9]  || "").trim(); // Game ID Clean (col J, index 9)
      const round   = (row[10] || "").trim(); // Round (col K, index 10)
      const score1  = parseFloat(row[2]) || 0; // Team 1 Score
      const score2  = parseFloat(row[3]) || 0; // Team 2 Score

      if (!gameId || !round) continue;

      // Skip non-verified or amended entries — use "Original" only, or verified
      const entryType = (row[7] || "").trim(); // Entry Type
      const verified  = (row[6] || "").trim().toLowerCase(); // Verified
      // If there's an "Amended" entry, it will have a different row — we want the latest valid score
      // Simple approach: just use all verified rows; if same gameId appears twice, last one wins
      if (verified !== "yes") continue;

      const game = gamePlayerMap[gameId];
      if (!game) continue;

      // Team 1 = p1 & p2, Team 2 = p3 & p4
      const team1Players = [game.p1, game.p2].filter(Boolean);
      const team2Players = [game.p3, game.p4].filter(Boolean);
      const diff1 = score1 - score2;
      const diff2 = score2 - score1;

      // Compute team average group (for fair mixed-pairing handling)
      // Each player uses the TEAM's average group as their base, not just their own
      // Falls back to own group if partner's group is missing
      const getTeamAvgGroup = (players) => {
        const groups = players.map(n => playerRoundGroup[`${n.toLowerCase()}|${round}`]).filter(Boolean);
        if (groups.length === 0) return null;
        return groups.reduce((s, g) => s + g, 0) / groups.length;
      };

      const team1AvgGroup = getTeamAvgGroup(team1Players);
      const team2AvgGroup = getTeamAvgGroup(team2Players);

      for (const [players, diff, teamAvgBase] of [
        [team1Players, diff1, team1AvgGroup],
        [team2Players, diff2, team2AvgGroup],
      ]) {
        for (const playerName of players) {
          if (!playerName) continue;
          const ownGroup = playerRoundGroup[`${playerName.toLowerCase()}|${round}`];
          if (!ownGroup) continue; // player not in standings for this round, skip

          // Use team average as base, fall back to player's own group if team avg unavailable
          const base = teamAvgBase ?? ownGroup;
          const matchRating = base - (diff / 2 / 10);

          const playerKey = playerName.toLowerCase();
          if (!playerMatches[playerKey]) playerMatches[playerKey] = [];
          playerMatches[playerKey].push({
            round,
            gameId,
            group: ownGroup,          // player's own group (for display)
            teamAvgBase: base,        // team avg used as calculation base (or own group if fallback)
            diff,
            matchRating: parseFloat(matchRating.toFixed(3)),
          });
        }
      }
    }

    // --- 5. Aggregate per player ---
    const players = [];

    for (const name of activePlayers) {
      const matches = playerMatches[name.toLowerCase()] || [];

      if (matches.length === 0) {
        // No data — find fallback group from Group_Round_Standings (most recent round)
        const nameLower = name.toLowerCase();
        const groupEntries = Object.entries(playerRoundGroup)
          .filter(([key]) => key.startsWith(`${nameLower}|`))
          .map(([, g]) => g);
        const fallbackGroup = groupEntries.length > 0
          ? groupEntries[groupEntries.length - 1]
          : 6;

        players.push({
          player: name,
          currentGroup: fallbackGroup,
          gp: 0,
          diff: 0,
          rating: parseFloat(fallbackGroup.toFixed ? fallbackGroup.toFixed(2) : String(fallbackGroup)),
          baseRating: parseFloat(fallbackGroup.toFixed ? fallbackGroup.toFixed(2) : String(fallbackGroup)),
          diffBonus: 0,
          hasStats: false,
          rounds: [],
        });
        continue;
      }

      const totalMatches = matches.length;
      const totalDiff = matches.reduce((s, m) => s + m.diff, 0);

      // Weighted average of match ratings (each match = weight 1)
      const avgRating = matches.reduce((s, m) => s + m.matchRating, 0) / totalMatches;

      // Current group = most recent round's group
      const sortedMatches = [...matches].sort((a, b) => parseInt(a.round) - parseInt(b.round));
      const currentGroup = sortedMatches[sortedMatches.length - 1].group;

      const baseRating = parseFloat(avgRating.toFixed(2));
      const adjustedRating = baseRating;
      const diffBonus = 0;

      // Group matches by round for the breakdown UI
      const roundMap = {};
      for (const m of sortedMatches) {
        if (!roundMap[m.round]) {
          roundMap[m.round] = { round: m.round, group: m.group, matchCount: 0, totalDiff: 0, ratingSum: 0, teamAvgBaseSum: 0 };
        }
        roundMap[m.round].matchCount++;
        roundMap[m.round].totalDiff += m.diff;
        roundMap[m.round].ratingSum += m.matchRating;
        roundMap[m.round].teamAvgBaseSum += m.teamAvgBase;
      }

      const roundDetail = Object.values(roundMap).map(r => {
        const avgBase = parseFloat((r.teamAvgBaseSum / r.matchCount).toFixed(2));
        const isMixed = avgBase !== r.group;
        return {
          round: r.round,
          group: r.group,           // player's own group
          base: avgBase,            // actual base used in calculation (team avg)
          isMixed,                  // true if partner was different group
          gp: r.matchCount,
          diff: r.totalDiff,
          sessionRating: parseFloat((r.ratingSum / r.matchCount).toFixed(2)),
        };
      });

      if (debug && name.toLowerCase().includes(debug.toLowerCase())) {
        return Response.json({ playerFound: name, matches, roundDetail, baseRating, diffBonus, adjustedRating });
      }

      players.push({
        player: name,
        currentGroup,
        ratingBaseGroup: null,
        gp: totalMatches,
        diff: totalDiff,
        rating: adjustedRating,
        baseRating,
        diffBonus,
        hasStats: true,
        rounds: roundDetail,
      });
    }

    players.sort((a, b) => a.rating - b.rating);
    return Response.json({ players });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
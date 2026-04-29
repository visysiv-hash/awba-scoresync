import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    const { debug, debugRound, scanThreshold } = await req.json().catch(() => ({}));

    // Fetch all sheets in parallel
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

    // --- 1. Active players list + override group lookup ---
    const playersRows = playersJson.values || [];
    const activePlayers = new Set();
    const playerStartingGroup = {}; // name -> override starting group (col G = index 6)
    for (let i = 1; i < playersRows.length; i++) {
      const row = playersRows[i];
      const name = (row[0] || "").trim();
      const active = (row[1] || "").toLowerCase();
      const overrideGroup = parseInt(row[6]) || null; // col G, index 6
      if (!name || active === "no") continue;
      activePlayers.add(name);
      if (overrideGroup) playerStartingGroup[name.toLowerCase()] = overrideGroup;
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
    const allMatchDetails = []; // for scanThreshold mode

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

      for (const [players, diff, teamAvgBase, opponentAvgBase] of [
        [team1Players, diff1, team1AvgGroup, team2AvgGroup],
        [team2Players, diff2, team2AvgGroup, team1AvgGroup],
      ]) {
        for (const playerName of players) {
          if (!playerName) continue;
          const ownGroup = playerRoundGroup[`${playerName.toLowerCase()}|${round}`];
          if (!ownGroup) continue;

          const base = teamAvgBase ?? ownGroup;

          // Strength factor: if opponent avg group differs by more than 1.0, adjust the diff
          // Positive groupDiff = opponents are weaker (higher group number = weaker)
          // Negative groupDiff = opponents are stronger
          let adjustedDiff = diff;
          if (opponentAvgBase != null && teamAvgBase != null) {
            const groupDiff = opponentAvgBase - teamAvgBase; // positive = we're stronger, negative = they're stronger
            if (Math.abs(groupDiff) > 0.5) {
              // Scale: each group difference unit adjusts diff by 1 point per game (2 games per match)
              const strengthAdjustment = groupDiff * 2;
              adjustedDiff = diff - strengthAdjustment;
            }
          }

          const playerKey = playerName.toLowerCase();
          if (scanThreshold && round === String(scanThreshold)) {
            const groupDiff = opponentAvgBase != null && teamAvgBase != null ? opponentAvgBase - teamAvgBase : null;
            allMatchDetails.push({
              gameId,
              playerName,
              ownGroup,
              teamAvgBase: teamAvgBase ?? ownGroup,
              opponentAvgBase: opponentAvgBase ?? null,
              groupDiff: groupDiff != null ? parseFloat(groupDiff.toFixed(2)) : null,
              thresholdExceeded: groupDiff != null && Math.abs(groupDiff) > 1.0,
              rawDiff: diff,
              adjustedDiff,
            });
          }
          if (!playerMatches[playerKey]) playerMatches[playerKey] = [];
          playerMatches[playerKey].push({
            round,
            gameId,
            group: ownGroup,
            teamAvgBase: base,
            opponentAvgBase: opponentAvgBase ?? null,
            diff,
            adjustedDiff,
            matchRating: parseFloat((base - (adjustedDiff / 2 / 10)).toFixed(3)),
          });
        }
      }
    }

    // --- 5. Aggregate per player ---
    const players = [];

    for (const name of activePlayers) {
      const matches = playerMatches[name.toLowerCase()] || [];

      if (matches.length === 0) {
        // No data — use override group if set, else find fallback from Group_Round_Standings
        const nameLower = name.toLowerCase();
        let fallbackGroup = playerStartingGroup[nameLower];
        if (!fallbackGroup) {
          const groupEntries = Object.entries(playerRoundGroup)
            .filter(([key]) => key.startsWith(`${nameLower}|`))
            .map(([, g]) => g);
          fallbackGroup = groupEntries.length > 0
            ? groupEntries[groupEntries.length - 1]
            : 6;
        }

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

      // Sort matches chronologically
      const sortedMatches = [...matches].sort((a, b) => parseInt(a.round) - parseInt(b.round));
      const currentGroup = sortedMatches[sortedMatches.length - 1].group;

      // Option 4: Rolling compounding rating
      // Each round uses the previous round's rating as the base instead of the assigned group.
      // First round: use the player's assigned group as the starting base.
      // Per round: roundRating = prevRating - (roundAvgDiff / 2 / 10)
      //   where roundAvgDiff = totalDiff in that round / matchCount

      // Group matches by round first
      const roundMap = {};
      for (const m of sortedMatches) {
        if (!roundMap[m.round]) {
          roundMap[m.round] = { round: m.round, group: m.group, matchCount: 0, totalDiff: 0, totalAdjustedDiff: 0, teamAvgBaseSum: 0 };
        }
        roundMap[m.round].matchCount++;
        roundMap[m.round].totalDiff += m.diff;
        roundMap[m.round].totalAdjustedDiff += m.adjustedDiff;
        roundMap[m.round].teamAvgBaseSum += m.teamAvgBase;
      }

      const roundsSorted = Object.values(roundMap).sort((a, b) => parseInt(a.round) - parseInt(b.round));

      // Use override starting group if set, otherwise use first round's registered group
      const startingGroup = playerStartingGroup[name.toLowerCase()] || roundsSorted[0].group;
      let rollingRating = startingGroup;
      const roundDetail = [];

      // Divisor based on group floor of rolling base rating (discrete, cleaner)
      const ratingDivisor = (base) => {
        const groupFloor = Math.floor(base) || 1;
        const map = { 1: 40, 2: 35, 3: 30, 4: 25, 5: 20 };
        return map[groupFloor] ?? 15; // 6+ → 15
      };

      for (const r of roundsSorted) {
        const avgBase = parseFloat((r.teamAvgBaseSum / r.matchCount).toFixed(2));
        const isMixed = avgBase !== r.group;
        // Use adjustedDiff (strength-factor applied) for rating calculation
        const avgAdjustedDiffPerGame = r.totalAdjustedDiff / (r.matchCount * 2);
        const divisor = ratingDivisor(rollingRating); // use current rolling base, not assigned group
        const roundRating = parseFloat((rollingRating - avgAdjustedDiffPerGame / divisor).toFixed(3));
        roundDetail.push({
          round: r.round,
          group: r.group,
          base: parseFloat(rollingRating.toFixed(2)),
          isMixed,
          gp: r.matchCount,
          diff: r.totalDiff,
          adjustedDiff: r.totalAdjustedDiff,
          divisor,
          sessionRating: parseFloat(roundRating.toFixed(2)),
        });
        rollingRating = roundRating;
      }

      const finalRating = parseFloat(rollingRating.toFixed(2));
      const diffBonus = 0;

      if (debug && name.toLowerCase().includes(debug.toLowerCase())) {
        const matchDetail = sortedMatches
          .filter(m => !debugRound || m.round === String(debugRound))
          .map(m => {
            const game = gamePlayerMap[m.gameId];
            const groupDiff = m.opponentAvgBase != null ? m.opponentAvgBase - m.teamAvgBase : null;
            const adjustmentApplied = groupDiff != null && Math.abs(groupDiff) > 1.0;
            return {
              gameId: m.gameId,
              round: m.round,
              players: game ? [game.p1, game.p2, game.p3, game.p4] : [],
              ownGroup: m.group,
              teamAvgBase: m.teamAvgBase,
              opponentAvgBase: m.opponentAvgBase,
              groupDiff: groupDiff != null ? parseFloat(groupDiff.toFixed(2)) : null,
              thresholdExceeded: adjustmentApplied,
              rawDiff: m.diff,
              adjustedDiff: m.adjustedDiff,
              strengthAdjustment: adjustmentApplied ? parseFloat((groupDiff * 2).toFixed(2)) : 0,
            };
          });
        return Response.json({ playerFound: name, roundDetail, matchDetail, finalRating, currentGroup });
      }

      players.push({
        player: name,
        currentGroup,
        ratingBaseGroup: null,
        gp: totalMatches,
        diff: totalDiff,
        rating: finalRating,
        baseRating: finalRating, // same as rating in option 4
        diffBonus,
        hasStats: true,
        rounds: roundDetail,
      });
    }

    if (scanThreshold) {
      const exceeded = allMatchDetails.filter(m => m.thresholdExceeded);
      return Response.json({ round: scanThreshold, totalMatches: allMatchDetails.length, thresholdExceeded: exceeded, allMatches: allMatchDetails });
    }

    players.sort((a, b) => a.rating - b.rating);
    return Response.json({ players });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
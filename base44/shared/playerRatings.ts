// Shared rating-computation logic for getPlayerRatings and getPlayerRatingsV2.
// Both entry.ts files fetch sheets data and pass the parsed JSON here.

export interface SheetData {
  playersJson: any;
  gamesJson: any;
  rawJson: any;
  standingsJson: any;
}

export interface Options {
  debug?: string;
  debugRound?: string | number;
  scanThreshold?: string | number;
}

const PENALTY = 21;

export function computePlayerRatings(data: SheetData, opts: Options = {}) {
  const { debug, debugRound, scanThreshold } = opts;

  const playersRows = data.playersJson.values || [];
  const activePlayers = new Set<string>();
  const playerStartingGroup: Record<string, number> = {};
  for (let i = 1; i < playersRows.length; i++) {
    const row = playersRows[i];
    const name = (row[0] || "").trim();
    const active = (row[1] || "").toLowerCase();
    const overrideGroup = parseInt(row[6]) || null;
    if (!name || active === "no") continue;
    activePlayers.add(name);
    if (overrideGroup) playerStartingGroup[name.toLowerCase()] = overrideGroup;
  }

  const playerRoundGroup: Record<string, number> = {};
  const standingsRows = data.standingsJson.values || [];
  if (standingsRows.length > 1) {
    const sHeaders = standingsRows[0].map((h: string) => (h || "").trim().toLowerCase());
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

  const gamesRows = data.gamesJson.values || [];
  const gamePlayerMap: Record<string, any> = {};
  if (gamesRows.length > 1) {
    const gHeaders = gamesRows[0].map((h: string) => (h || "").trim().toLowerCase());
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

  const rawRows = data.rawJson.values || [];
  const playerMatches: Record<string, any[]> = {};
  const allMatchDetails: any[] = [];

  const getTeamAvgGroup = (players: string[], round: string) => {
    const groups = players.map(n => playerRoundGroup[`${n.toLowerCase()}|${round}`]).filter(Boolean);
    if (groups.length === 0) return null;
    return groups.reduce((s, g) => s + g, 0) / groups.length;
  };

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const gameId  = (row[9]  || "").trim();
    const round   = (row[10] || "").trim();
    const score1  = parseFloat(row[2]) || 0;
    const score2  = parseFloat(row[3]) || 0;

    if (!gameId || !round) continue;

    const verified  = (row[6] || "").trim().toLowerCase();
    if (verified !== "yes") continue;

    const game = gamePlayerMap[gameId];
    if (!game) continue;

    const team1Players = [game.p1, game.p2].filter(Boolean);
    const team2Players = [game.p3, game.p4].filter(Boolean);

    // Apply 21-point penalty whenever a side scores 0 (covers 0-21, 21-0, and 0-0)
    const t1Zero = Number(score1) === 0;
    const t2Zero = Number(score2) === 0;
    const diff1 = score1 - score2 - (t1Zero ? PENALTY : 0);
    const diff2 = score2 - score1 - (t2Zero ? PENALTY : 0);

    const team1AvgGroup = getTeamAvgGroup(team1Players, round);
    const team2AvgGroup = getTeamAvgGroup(team2Players, round);

    for (const [players, diff, teamAvgBase, opponentAvgBase] of [
      [team1Players, diff1, team1AvgGroup, team2AvgGroup],
      [team2Players, diff2, team2AvgGroup, team1AvgGroup],
    ]) {
      for (const playerName of players) {
        if (!playerName) continue;
        let ownGroup = playerRoundGroup[`${playerName.toLowerCase()}|${round}`];
        if (!ownGroup) {
          const allGamePlayers = [game.p1, game.p2, game.p3, game.p4].filter((n: string) => n && n !== playerName);
          const knownGroups = allGamePlayers
            .map((n: string) => playerRoundGroup[`${n.toLowerCase()}|${round}`])
            .filter(Boolean);
          ownGroup = knownGroups.length > 0
            ? Math.round(knownGroups.reduce((s, g) => s + g, 0) / knownGroups.length)
            : null;
        }
        if (!ownGroup) continue;

        const base = teamAvgBase ?? ownGroup;

        let adjustedDiff = diff;
        if (opponentAvgBase != null && teamAvgBase != null) {
          const groupDiff = opponentAvgBase - teamAvgBase;
          if (Math.abs(groupDiff) > 0.5) {
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

  const canonicalNames: Record<string, string> = {};
  for (const n of activePlayers) canonicalNames[n.toLowerCase()] = n;

  if (standingsRows.length > 1) {
    const iSPlayer = standingsRows[0].map((h: string) => (h || "").trim().toLowerCase()).indexOf("player");
    for (let i = 1; i < standingsRows.length; i++) {
      const n = iSPlayer >= 0 ? (standingsRows[i][iSPlayer] || "").trim() : "";
      if (n && !canonicalNames[n.toLowerCase()]) canonicalNames[n.toLowerCase()] = n;
    }
  }

  if (gamesRows.length > 1) {
    const gHeaders = gamesRows[0].map((h: string) => (h || "").trim().toLowerCase());
    const pCols = ["player 1","player 2","player 3","player 4"].map(h => gHeaders.indexOf(h));
    for (let i = 1; i < gamesRows.length; i++) {
      for (const col of pCols) {
        if (col < 0) continue;
        const n = (gamesRows[i][col] || "").trim();
        if (n && !canonicalNames[n.toLowerCase()]) canonicalNames[n.toLowerCase()] = n;
      }
    }
  }

  const finalPlayers = new Set<string>([...activePlayers]);
  for (const key of Object.keys(playerRoundGroup)) {
    const nameLower = key.split("|")[0];
    const canonical = canonicalNames[nameLower] || nameLower;
    finalPlayers.add(canonical);
  }
  for (const nameLower of Object.keys(playerMatches)) {
    const canonical = canonicalNames[nameLower] || nameLower;
    finalPlayers.add(canonical);
  }

  const ratingDivisor = (base: number) => {
    const groupNearest = Math.round(base) || 1;
    const map: Record<number, number> = { 1: 40, 2: 35, 3: 30, 4: 25, 5: 20 };
    return map[groupNearest] ?? 15;
  };

  const players: any[] = [];

  for (const name of finalPlayers) {
    const matches = playerMatches[name.toLowerCase()] || [];

    if (matches.length === 0) {
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

    const sortedMatches = [...matches].sort((a, b) => parseInt(a.round) - parseInt(b.round));
    const currentGroup = sortedMatches[sortedMatches.length - 1].group;

    const roundMap: Record<string, any> = {};
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

    const startingGroup = playerStartingGroup[name.toLowerCase()] || roundsSorted[0].group;
    let rollingRating = startingGroup;
    const roundDetail: any[] = [];

    for (const r of roundsSorted) {
      const avgBase = parseFloat((r.teamAvgBaseSum / r.matchCount).toFixed(2));
      const isMixed = avgBase !== r.group;
      const avgAdjustedDiffPerGame = r.totalAdjustedDiff / (r.matchCount * 2);
      const divisor = ratingDivisor(rollingRating);
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
        .filter((m: any) => !debugRound || m.round === String(debugRound))
        .map((m: any) => {
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
      return { playerFound: name, roundDetail, matchDetail, finalRating, currentGroup };
    }

    players.push({
      player: name,
      currentGroup,
      ratingBaseGroup: null,
      gp: totalMatches,
      diff: totalDiff,
      rating: finalRating,
      baseRating: finalRating,
      diffBonus,
      hasStats: true,
      rounds: roundDetail,
    });
  }

  if (scanThreshold) {
    const exceeded = allMatchDetails.filter(m => m.thresholdExceeded);
    return { round: scanThreshold, totalMatches: allMatchDetails.length, thresholdExceeded: exceeded, allMatches: allMatchDetails };
  }

  players.sort((a, b) => a.rating - b.rating);
  return { players };
}
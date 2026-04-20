import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const standingsId = Deno.env.get("STANDINGS_SPREADSHEET_ID");

    const { debug } = await req.json().catch(() => ({}));

    // --- 1. Fetch active players + fallback group from Players sheet ---
    // Column G (index 6) = "Rating Base Group" override. If set, use it as the fixed base for ALL rounds.
    // If empty, fall back to weighted average of groups played (original behaviour).
    const playersUrl = `https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/Players!A:G`;
    const playersRes = await fetch(playersUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const playersJson = await playersRes.json();
    const playersRows = playersJson.values || [];

    const activePlayers = {}; // name -> { fallbackGroup, ratingBaseGroup }
    for (let i = 1; i < playersRows.length; i++) {
      const row = playersRows[i];
      const name = (row[0] || "").trim();
      const active = (row[1] || "").toLowerCase();
      if (!name || active === "no") continue;
      const fallbackGroup = parseInt(row[5]) || parseInt(row[4]) || parseInt(row[3]) || 6;
      const ratingBaseGroup = parseInt(row[6]) || null; // column G override
      activePlayers[name] = { fallbackGroup, ratingBaseGroup };
    }

    // --- 2. Fetch Group_Round_Standings — one row per player per round ---
    // Columns: player, round, group, gp, wins, losses, draws, ladder pts, points for, points against, diff, ...
    const roundRange = encodeURIComponent("Group_Round_Standings!A1:Z2000");
    const roundRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${standingsId}/values/${roundRange}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const roundJson = await roundRes.json();
    const allRows = roundJson.values || [];

    if (allRows.length < 2) {
      return Response.json({ players: [] });
    }

    const headers = allRows[0].map(h => (h || "").trim().toLowerCase());
    const iPlayer = headers.indexOf("player");
    const iRound  = headers.indexOf("round");
    const iGroup  = headers.indexOf("group");
    const iGP     = headers.indexOf("gp");
    const iDiff   = headers.indexOf("diff");

    // Build per-player list of round entries: [{ round, group, gp, diff }]
    // Veterans method: each round = one "tournament"
    const playerRounds = {}; // name -> [{ round, group, gp, diff }]

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      const name = (row[iPlayer] || "").trim();
      if (!name) continue;

      const round = (row[iRound] || "").trim();
      const group = parseInt(row[iGroup]) || 0;
      const gp    = parseInt(row[iGP])    || 0;
      const diff  = parseFloat(row[iDiff]) || 0;

      if (!round || !group || gp === 0) continue;

      if (!playerRounds[name]) playerRounds[name] = [];
      playerRounds[name].push({ round, group, gp, diff });
    }

    if (debug) {
      const name = Object.keys(playerRounds).find(k => k.toLowerCase().includes(debug.toLowerCase()));
      return Response.json({
        playerFound: name || null,
        rounds: name ? playerRounds[name] : null,
        playerData: name ? activePlayers[name] : null,
      });
    }

    // --- 3. Calculate Veterans-style rating per player ---
    // For each round (tournament):
    //   roundRating = base − (diff / gp / 10)
    //
    // base per round:
    //   - If column G (ratingBaseGroup) is set → use that fixed value for ALL rounds (override mode)
    //   - Otherwise → use the actual group played that round (original behaviour)
    //
    // Final rating = weighted average of all roundRatings, weighted by gp

    const players = [];

    for (const [name, { fallbackGroup, ratingBaseGroup }] of Object.entries(activePlayers)) {
      const rounds = playerRounds[name] || [];

      const totalGP   = rounds.reduce((s, r) => s + r.gp, 0);
      const totalDiff = rounds.reduce((s, r) => s + r.diff, 0);

      // currentGroup shown in UI:
      // If override set → use it. Otherwise weighted avg of groups played (or fallback).
      let baseGroup;
      if (ratingBaseGroup) {
        baseGroup = ratingBaseGroup;
      } else if (rounds.length > 0) {
        const weightedSum = rounds.reduce((s, r) => s + r.group * r.gp, 0);
        baseGroup = parseFloat((weightedSum / totalGP).toFixed(2));
      } else {
        baseGroup = fallbackGroup;
      }

      let rating   = parseFloat(baseGroup.toFixed ? baseGroup.toFixed(2) : String(baseGroup));
      let hasStats = false;

      if (rounds.length > 0) {
        let weightedRatingSum = 0;
        let totalWeight = 0;

        for (const r of rounds) {
          // Use override base if set, otherwise use the group played that round
          const base = ratingBaseGroup || r.group;
          const roundRating = base - (r.diff / r.gp / 10);
          weightedRatingSum += roundRating * r.gp;
          totalWeight += r.gp;
        }

        rating   = parseFloat((weightedRatingSum / totalWeight).toFixed(2));
        hasStats = true;
      }

      // Build per-round detail for the breakdown table
      const roundDetail = rounds.map(r => {
        const base = ratingBaseGroup || r.group;
        return {
          round: r.round,
          group: r.group,         // actual group played (shown in table)
          base,                   // base used for calculation (may differ if override set)
          gp: r.gp,
          diff: r.diff,
          sessionRating: parseFloat((base - (r.diff / r.gp / 10)).toFixed(2)),
        };
      });

      players.push({ player: name, currentGroup: baseGroup, ratingBaseGroup: ratingBaseGroup || null, gp: totalGP, diff: totalDiff, rating, hasStats, rounds: roundDetail });
    }

    players.sort((a, b) => a.rating - b.rating);
    return Response.json({ players });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
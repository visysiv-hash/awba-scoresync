import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const sid = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";
    const range = encodeURIComponent("Raw_Responses!A2:K2000");

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const rows = data.values || [];

    // Parse all games
    const games = [];
    for (const row of rows) {
      const gameChoice = (row[1] || "").trim();
      const parts = gameChoice.split("|");
      const teamsStr = (parts[1]?.trim() || gameChoice);
      const players = teamsStr.split("&").map(p => p.trim()).filter(Boolean);
      if (players.length < 4) continue;

      const score1 = Number(row[2] || 0);
      const score2 = Number(row[3] || 0);
      const team1Won = score1 === 42;
      const team2Won = score2 === 42;

      // team1 = players[0], players[1]; team2 = players[2], players[3]
      games.push({
        team1: [players[0], players[1]],
        team2: [players[2], players[3]],
        team1Won,
        team2Won,
        score1,
        score2,
      });
    }

    // Calculate raw stats per player
    const stats = {}; // player -> { wins, losses, draws, gp }
    const ensurePlayer = (name) => {
      if (!stats[name]) stats[name] = { wins: 0, losses: 0, draws: 0, gp: 0 };
    };

    for (const g of games) {
      for (const p of [...g.team1, ...g.team2]) ensurePlayer(p);
      const team1Result = g.team1Won ? 'W' : g.team2Won ? 'L' : 'D';
      const team2Result = g.team2Won ? 'W' : g.team1Won ? 'L' : 'D';
      for (const p of g.team1) {
        stats[p].gp++;
        if (team1Result === 'W') stats[p].wins++;
        else if (team1Result === 'L') stats[p].losses++;
        else stats[p].draws++;
      }
      for (const p of g.team2) {
        stats[p].gp++;
        if (team2Result === 'W') stats[p].wins++;
        else if (team2Result === 'L') stats[p].losses++;
        else stats[p].draws++;
      }
    }

    // Raw win rate per player
    const rawWR = {};
    for (const [name, s] of Object.entries(stats)) {
      rawWR[name] = s.gp > 0 ? s.wins / s.gp : 0;
    }

    // League average win rate
    const allWRs = Object.values(rawWR);
    const leagueAvgWR = allWRs.length > 0 ? allWRs.reduce((a, b) => a + b, 0) / allWRs.length : 0.5;

    // For each player, collect their partner's raw WR for each game played
    const partnerWRSums = {}; // player -> [partnerWR, ...]
    for (const [name] of Object.entries(stats)) partnerWRSums[name] = [];

    for (const g of games) {
      // team1[0] partner is team1[1] and vice versa
      const addPartner = (player, partner) => {
        if (partnerWRSums[player] && rawWR[partner] !== undefined) {
          partnerWRSums[player].push(rawWR[partner]);
        }
      };
      addPartner(g.team1[0], g.team1[1]);
      addPartner(g.team1[1], g.team1[0]);
      addPartner(g.team2[0], g.team2[1]);
      addPartner(g.team2[1], g.team2[0]);
    }

    // Count games won/lost per player: each match = 2 games
    // A match with score 42 vs X means winner got 2 games (opponent 0)
    // Any other split (non-42) means it went to 2nd game: winner got 1, loser got 1
    const gamesWon = {};
    for (const [name] of Object.entries(stats)) gamesWon[name] = { won: 0, lost: 0 };

    for (const g of games) {
      const score1 = Number(g.score1);
      const score2 = Number(g.score2);
      
      let team1GamesWon, team2GamesWon;
      if (score1 === 42) {
        // Team 1 won both games (2-0)
        team1GamesWon = 2;
        team2GamesWon = 0;
      } else if (score2 === 42) {
        // Team 2 won both games (0-2)
        team1GamesWon = 0;
        team2GamesWon = 2;
      } else {
        // Split (not 42-anything) — each team won 1 game (1-1)
        team1GamesWon = 1;
        team2GamesWon = 1;
      }
      
      for (const p of g.team1) if (gamesWon[p]) {
        gamesWon[p].won += team1GamesWon;
        gamesWon[p].lost += (2 - team1GamesWon);
      }
      for (const p of g.team2) if (gamesWon[p]) {
        gamesWon[p].won += team2GamesWon;
        gamesWon[p].lost += (2 - team2GamesWon);
      }
    }

    // Adjusted win rate: penalise if avg partner was strong, reward if weak
    // adjustedWR = rawWR - (avgPartnerWR - leagueAvgWR) * 0.5
    const adjusted = {};
    for (const [name, s] of Object.entries(stats)) {
      const rwr = rawWR[name];
      const partnerWRs = partnerWRSums[name];
      const avgPartnerWR = partnerWRs.length > 0
        ? partnerWRs.reduce((a, b) => a + b, 0) / partnerWRs.length
        : leagueAvgWR;
      const adj = rwr - (avgPartnerWR - leagueAvgWR) * 0.5;
      const gw = gamesWon[name];
      const totalGames = gw.won + gw.lost;
      adjusted[name] = {
        player: name,
        gp: s.gp,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        gamesWon: gw.won,
        gamesLost: gw.lost,
        gameWinPct: totalGames > 0 ? Math.round((gw.won / totalGames) * 100) : 0,
        rawWR: Math.round(rwr * 100),
        avgPartnerWR: Math.round(avgPartnerWR * 100),
        leagueAvgWR: Math.round(leagueAvgWR * 100),
        adjustedWR: Math.round(Math.max(0, Math.min(100, adj * 100))),
        partnerBonus: Math.round((leagueAvgWR - avgPartnerWR) * 50), // positive if partners were weak
      };
    }

    return Response.json({ adjusted, leagueAvgWR: Math.round(leagueAvgWR * 100) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
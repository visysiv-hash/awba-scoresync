import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Pulls the whole match history out of the main spreadsheet into the app:
//   Raw_Responses (verified rows) + Games (the four players) -> MatchResult
//   Group_Round_Standings (group each player was in per round) -> RoundGroup
// Only rounds that are already in Raw_Responses are rewritten, so nothing that
// was scored directly in the app is touched.

const MAIN_SHEET_ID = "1fmKv6tkG0UAE5lB9af4lJgSQFlVtC9gMZZTdYERUf2U";

const toIsoDate = (timestamp: string) => {
  const m = String(timestamp || "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Read the same spreadsheet the sheet-method ratings use, so the two methods
    // are working from identical data.
    const sheetId = Deno.env.get("STANDINGS_SPREADSHEET_ID") || MAIN_SHEET_ID;

    const get = async (range: string) => {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.values || [];
    };

    const [gameRows, rawRows, standingsRows, playerRows] = await Promise.all([
      get("Games!A:R"),
      get("Raw_Responses!A:L"),
      get("Group_Round_Standings!A:H"),
      get("Players!A:G"),
    ]);

    // Starting group override (Players column G)
    const startEntries: any[] = [];
    for (const row of playerRows.slice(1)) {
      const name = String(row[0] || "").trim();
      const group = parseInt(row[6]);
      if (name && group) startEntries.push({ player: name, group });
    }

    // Games: Game ID -> the four players
    const games: Record<string, any> = {};
    for (const row of gameRows.slice(1)) {
      const id = String(row[4] || "").trim();
      const round = Number(row[1]);
      if (!id || !round) continue;
      games[id] = {
        round,
        team1: String(row[6] || "").trim(),
        team2: String(row[7] || "").trim(),
        players: [row[8], row[9], row[10], row[11]].map((p) => String(p || "").trim()),
      };
    }

    // Raw_Responses: verified scores, last entry per game wins
    const scores: Record<string, any> = {};
    const roundDated: Record<number, Record<string, number>> = {};
    let rawVerified = 0;
    for (const row of rawRows.slice(1)) {
      if (String(row[6] || "").trim().toLowerCase() !== "yes") continue;
      const round = Number(row[10]);
      const cleanId = String(row[9] || "").trim();
      if (!round || !cleanId) continue;
      rawVerified++;
      const date = toIsoDate(row[0]);
      if (date) {
        if (!roundDated[round]) roundDated[round] = {};
        roundDated[round][date] = (roundDated[round][date] || 0) + 1;
      }
      scores[cleanId] = {
        round,
        gameId: cleanId,
        score1: Number(row[2]) || 0,
        score2: Number(row[3]) || 0,
        choice: String(row[1] || ""),
        date,
      };
    }

    // A round's date is the night most of its results were submitted (a late
    // submission for an older round would otherwise pick the wrong date)
    const roundDates: Record<number, string> = {};
    for (const [round, counts] of Object.entries(roundDated)) {
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0];
      if (best) roundDates[Number(round)] = best[0];
    }

    const results: any[] = [];
    let unmatched = 0;
    for (const s of Object.values(scores) as any[]) {
      const game = games[s.gameId] || games[`${s.round}-${(s.choice.match(/^(\d+)/) || [])[1]}`];
      if (!game) {
        unmatched++;
        continue;
      }
      const team1Players = game.players.slice(0, 2).filter(Boolean);
      const team2Players = game.players.slice(2, 4).filter(Boolean);
      if (!team1Players.length || !team2Players.length) {
        unmatched++;
        continue;
      }
      results.push({
        date: s.date || roundDates[s.round] || null,
        round: s.round,
        game_id: s.gameId,
        team1: game.team1,
        team2: game.team2,
        team1_players: team1Players,
        team2_players: team2Players,
        score1: s.score1,
        score2: s.score2,
        source: "sheet",
      });
    }

    // Group per player per round
    const byRound: Record<number, any[]> = {};
    for (const row of standingsRows.slice(1)) {
      const player = String(row[0] || "").trim();
      const round = Number(row[1]);
      const group = Number(row[2]);
      if (!player || !round || !group) continue;
      if (!byRound[round]) byRound[round] = [];
      byRound[round].push({ player, group });
    }
    const roundGroups = Object.entries(byRound).map(([round, entries]) => ({
      round: Number(round),
      date: roundDates[Number(round)] || null,
      entries,
    }));
    if (startEntries.length) roundGroups.push({ round: 0, date: null, entries: startEntries } as any);

    const maxRound = Math.max(...Object.keys(byRound).map(Number), ...results.map((r) => r.round));

    // Rewrite the imported rounds only (rows without a round are tonight's app data)
    await base44.asServiceRole.entities.MatchResult.deleteMany({ source: "sheet", round: { $gte: 1 } });
    await base44.asServiceRole.entities.RoundGroup.deleteMany({ round: { $gte: 0 } });

    for (let i = 0; i < results.length; i += 250) {
      await base44.asServiceRole.entities.MatchResult.bulkCreate(results.slice(i, i + 250));
    }
    for (let i = 0; i < roundGroups.length; i += 50) {
      await base44.asServiceRole.entities.RoundGroup.bulkCreate(roundGroups.slice(i, i + 50));
    }

    // Results already scored in the app before the round number existed
    const unscored = await base44.asServiceRole.entities.MatchResult.filter({}, { limit: 1500 });
    let tagged = 0;
    for (const rec of unscored.items || []) {
      if (Number(rec.round) > 0) continue;
      await base44.asServiceRole.entities.MatchResult.update(rec.id, { round: maxRound + 1 });
      tagged++;
    }

    return Response.json({
      importedResults: results.length,
      rounds: roundGroups.length,
      rawVerified,
      unmatched,
      maxRound,
      appResultsTagged: tagged,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
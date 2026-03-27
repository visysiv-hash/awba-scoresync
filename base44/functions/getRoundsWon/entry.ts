import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const spreadsheetId = Deno.env.get("SPREADSHEET_ID").replace(/^.*\/d\//, "").replace(/\/.*$/, "");
    const range = "Scores!A2:K";
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await resp.json();
    const rows = data.values || [];

    // Tokenise player names from a team string (handles "A & B", "A / B", "A, B")
    const tokenise = (str) => str.split(/[&/,]/).map(s => s.trim()).filter(Boolean);

    // Map: playerName -> { roundsWon, roundsPlayed }
    const stats = {};

    const add = (name, won) => {
      if (!name) return;
      const key = name.toLowerCase();
      if (!stats[key]) stats[key] = { player: name, roundsWon: 0, roundsPlayed: 0 };
      stats[key].roundsPlayed += 1;
      if (won) stats[key].roundsWon += 1;
    };

    for (const row of rows) {
      // Columns: [timestamp, net, game, team1, team2, r1s1, r1s2, r2s1, r2s2, total1, total2]
      const [, , , team1, team2, r1s1, r1s2, r2s1, r2s2] = row;
      if (!team1 || !team2) continue;

      const t1players = tokenise(team1);
      const t2players = tokenise(team2);

      // Round 1
      const r1 = { s1: Number(r1s1) || 0, s2: Number(r1s2) || 0 };
      if (r1.s1 > 0 || r1.s2 > 0) {
        const t1WonR1 = r1.s1 > r1.s2;
        t1players.forEach(p => add(p, t1WonR1));
        t2players.forEach(p => add(p, !t1WonR1));
      }

      // Round 2
      const r2 = { s1: Number(r2s1) || 0, s2: Number(r2s2) || 0 };
      if (r2.s1 > 0 || r2.s2 > 0) {
        const t1WonR2 = r2.s1 > r2.s2;
        t1players.forEach(p => add(p, t1WonR2));
        t2players.forEach(p => add(p, !t1WonR2));
      }
    }

    return Response.json({ stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
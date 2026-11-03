import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { loadAppMatchResults } from "../../shared/appMatchResults.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { player, opponent } = await req.json().catch(() => ({}));

    const rows = await loadAppMatchResults(base44);
    const playerLower = (player || "").trim().toLowerCase();

    const playerGames: any[] = [];
    for (const r of rows) {
      const team1 = (Array.isArray(r.team1_players) ? r.team1_players : []).map((n: string) => String(n).trim());
      const team2 = (Array.isArray(r.team2_players) ? r.team2_players : []).map((n: string) => String(n).trim());
      const inTeam1 = team1.some((n: string) => n.toLowerCase() === playerLower);
      const inTeam2 = team2.some((n: string) => n.toLowerCase() === playerLower);
      if (!inTeam1 && !inTeam2) continue;

      const team1Score = Number(r.score1) || 0;
      const team2Score = Number(r.score2) || 0;
      const myScore = inTeam1 ? team1Score : team2Score;
      const oppScore = inTeam1 ? team2Score : team1Score;
      const myTeam = (inTeam1 ? team1 : team2).join(" & ");
      const oppTeam = (inTeam1 ? team2 : team1).join(" & ");
      const result = myScore > oppScore ? "W" : myScore < oppScore ? "L" : "D";

      playerGames.push({
        net: r.net == null ? "" : String(r.net),
        myTeam,
        opponent: oppTeam,
        myScore,
        oppScore,
        result,
        round: r.round == null ? "" : String(r.round),
        timestamp: r.date ? `${r.date}T00:00:00` : "",
      });
    }

    playerGames.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let h2h = null;
    if (opponent) {
      const h2hGames = playerGames.filter((g) => g.opponent.toLowerCase().includes(String(opponent).toLowerCase()));
      const wins = h2hGames.filter((g) => g.result === "W").length;
      const losses = h2hGames.filter((g) => g.result === "L").length;
      const draws = h2hGames.filter((g) => g.result === "D").length;
      h2h = { games: h2hGames, wins, losses, draws, total: h2hGames.length };
    }

    return Response.json({ games: playerGames, h2h });
  } catch (error) {
    // Keep the response shape stable — callers read `games` directly.
    return Response.json({ games: [], h2h: null, error: error.message });
  }
}
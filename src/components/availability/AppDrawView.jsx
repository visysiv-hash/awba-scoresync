import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UniqueGamesStatus from "@/components/schedule/UniqueGamesStatus";

const teamName = (team) => team.map((p) => p.name).join(" & ");
const teamRating = (team) => {
  const rated = team.filter((p) => p.rating !== null && p.rating !== undefined);
  if (!rated.length) return null;
  return parseFloat((rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(2));
};

function GameBlock({ game, complete }) {
  if (!game.matches.length) {
    return (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-slate-400">{game.label}</p>
        <p className="text-[11px] text-slate-500 italic">
          {complete ? "Needs the group next to it to be full." : "No match scheduled."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-slate-400">{game.label}</p>
      {game.matches.map((m, i) => {
        const a = teamRating(m.teamA);
        const b = teamRating(m.teamB);
        const gap = a !== null && b !== null ? Math.abs(a - b) : null;
        return (
          <div key={i} className="rounded-lg bg-slate-700/50 px-2 py-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-1 text-white">
              <span className="truncate">{teamName(m.teamA)}</span>
              <span className="text-slate-400 shrink-0">{a ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-1 text-white">
              <span className="truncate">{teamName(m.teamB)}</span>
              <span className="text-slate-400 shrink-0">{b ?? "—"}</span>
            </div>
            {gap !== null && (
              <p className={`text-[10px] mt-0.5 ${gap <= 0.3 ? "text-green-400" : gap <= 0.6 ? "text-yellow-400" : "text-orange-400"}`}>
                gap {gap.toFixed(2)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AppDrawView({ draw }) {
  if (!draw || !draw.groups.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          {draw.totalPlayers} players · {draw.groups.length} {draw.groups.length === 1 ? "pool" : "pools"} ·
          {draw.poolGroups === -2
            ? " Unique games · automatic group range"
            : draw.poolGroups === 0
            ? " Game 2 two levels apart"
            : draw.poolGroups === -1
            ? " Game 3 four levels apart"
            : " paired within each group"}
        </p>
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer className="w-3.5 h-3.5 mr-1" /> Print
        </Button>
      </div>

      {draw.uniqueInfo && <UniqueGamesStatus info={draw.uniqueInfo} />}

      {draw.groups.map((g) => (
        <Card key={g.group} className="bg-slate-800 border-slate-700 text-white shadow">
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="font-bold text-yellow-400">{g.label || `Group ${g.groupNum}`}</span>
              <span className="text-[11px] text-slate-400">
                Court {(g.courts || []).join(" & ")} · avg{" "}
                <span className="text-white font-bold">{g.average ?? "—"}</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-3">
            <p className="text-[11px] text-slate-400">{g.players.map((p) => p.name).join(", ")}</p>
            {!g.complete && (
              <p className="text-[11px] text-amber-300">
                Short group of {g.players.length} — singles and one-against-two fill the night.
              </p>
            )}
            {g.games.map((game, i) => (
              <GameBlock key={i} game={game} complete={g.complete} />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Print layout */}
      <div className="hidden print:block text-black">
        {draw.groups.map((g) => (
          <div key={g.groupNum} className="mb-6 break-inside-avoid">
            <h2 className="text-base font-bold mb-1">
              {g.label || `Group ${g.groupNum}`} — {g.players.map((p) => p.name).join(", ")}
            </h2>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left border-b border-black/30 pb-1">Game</th>
                  <th className="text-left border-b border-black/30 pb-1">Team 1</th>
                  <th className="text-left border-b border-black/30 pb-1">Team 2</th>
                </tr>
              </thead>
              <tbody>
                {g.games.flatMap((game, gi) =>
                  game.matches.length
                    ? game.matches.map((m, mi) => (
                        <tr key={`${gi}-${mi}`}>
                          <td className="py-0.5 border-b border-black/10 whitespace-nowrap">{game.label.split(" · ")[0]}</td>
                          <td className="py-0.5 border-b border-black/10">{teamName(m.teamA)}</td>
                          <td className="py-0.5 border-b border-black/10">{teamName(m.teamB)}</td>
                        </tr>
                      ))
                    : [
                        <tr key={`${gi}-none`}>
                          <td className="py-0.5 border-b border-black/10">{game.label.split(" · ")[0]}</td>
                          <td className="py-0.5 border-b border-black/10 italic" colSpan={2}>Needs a full group of 8</td>
                        </tr>,
                      ]
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
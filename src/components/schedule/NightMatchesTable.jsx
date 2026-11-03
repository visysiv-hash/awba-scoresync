// One block per game, with a column per group — the same shape as the schedule
// sheet: each cell is a match, tagged with the court it is played on.
export default function NightMatchesTable({ groups = [], matches = [], picked, onPick }) {
  if (!groups.length) return null;

  const maxGame = Math.max(3, ...matches.map((m) => Number(m.game) || 1));
  const games = Array.from({ length: maxGame }, (_, i) => i + 1);

  const nameCell = (group, name) => {
    const active = picked && picked.group === group && picked.name === name;
    return (
      <button
        key={name}
        type="button"
        disabled={!onPick}
        onClick={() => onPick?.(group, name)}
        className={`rounded px-0.5 transition-colors ${active ? "bg-yellow-400 text-slate-900 font-bold" : "hover:bg-slate-700/60"} ${
          onPick ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {name}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {games.map((game) => {
        const hasAny = matches.some((m) => Number(m.game) === game);
        return (
          <div key={game} className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="bg-green-300 text-slate-900 font-bold px-2 py-1.5 text-left sticky left-0 z-10">
                    Game {game}
                  </th>
                  {groups.map((g) => (
                    <th key={g.group} className="bg-green-300 text-slate-900 font-bold px-2 py-1.5 text-center min-w-[150px]">
                      {g.group}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-700">
                  <td className="bg-slate-800 text-slate-400 px-2 py-1.5 sticky left-0 z-10">Names</td>
                  {groups.map((g) => {
                    const rows = matches.filter((m) => m.group === g.group && Number(m.game) === game);
                    return (
                      <td key={g.group} className="bg-slate-900/60 px-1.5 py-1.5 align-top space-y-1">
                        {rows.length === 0 && (
                          <p className="text-slate-500 italic">{hasAny ? "—" : "No match"}</p>
                        )}
                        {rows.map((m, i) => (
                          <div key={i} className="rounded bg-slate-800/70 px-1.5 py-1 leading-snug">
                            <p className="text-[10px] font-bold text-orange-300">Court {m.net ?? "—"}</p>
                            <p className="text-slate-100">
                              {(m.team1 || []).map((n) => nameCell(g.group, n))}
                              <span className="text-slate-500"> vs </span>
                              {(m.team2 || []).map((n) => nameCell(g.group, n))}
                            </p>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
// Group columns of a night's draw: the top four, the bottom four and the two
// courts the group plays on. Names are tappable so an admin can swap two players.
export default function NightGroupsTable({ groups = [], picked, onPick }) {
  if (!groups.length) return null;

  const cell = (names) => (
    <div className="space-y-0.5">
      {(names || []).length === 0 && <span className="text-slate-500 italic">—</span>}
      {(names || []).map((name) => {
        const active = picked === name;
        return (
          <button
            key={name}
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(name)}
            className={`block w-full text-left px-1 rounded transition-colors ${
              active ? "bg-yellow-400 text-slate-900 font-bold" : "text-slate-100 hover:bg-slate-700/60"
            } ${onPick ? "cursor-pointer" : "cursor-default"}`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="bg-slate-800 text-slate-400 font-semibold text-left px-2 py-1.5 sticky left-0 z-10">Rank</th>
            {groups.map((g) => (
              <th key={g.group} className="bg-purple-300 text-slate-900 font-bold px-2 py-1.5 text-center min-w-[110px]">
                {g.group}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-700">
            <td className="bg-sky-200 text-slate-900 font-bold px-2 py-1.5 sticky left-0 z-10">TOP 4</td>
            {groups.map((g) => (
              <td key={g.group} className="bg-slate-800/60 px-1 py-1.5 align-top">{cell(g.top4)}</td>
            ))}
          </tr>
          <tr className="border-t border-slate-700">
            <td className="bg-sky-200 text-slate-900 font-bold px-2 py-1.5 sticky left-0 z-10">BOTTOM 4</td>
            {groups.map((g) => (
              <td key={g.group} className="bg-slate-800/60 px-1 py-1.5 align-top">{cell(g.bottom4)}</td>
            ))}
          </tr>
          <tr className="border-t border-slate-700">
            <td className="bg-slate-700 text-slate-200 font-bold px-2 py-1.5 sticky left-0 z-10">Courts</td>
            {groups.map((g) => (
              <td key={g.group} className="bg-slate-900 px-2 py-1.5 text-center font-bold text-yellow-400">
                {(g.courts || []).join(" / ")}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
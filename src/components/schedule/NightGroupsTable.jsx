// Group columns of a night's draw: the ranked blocks of players and the courts the
// group plays on. A group of eight shows its top four and bottom four; a pool of two
// or three groups shows every player in blocks of four. Names are tappable so an
// admin can swap two players.
const blocks = (g) => {
  const players = g.players || [];
  if (players.length > 8) {
    const out = [];
    for (let i = 0; i < players.length; i += 4) {
      out.push({
        label: `${i + 1}–${Math.min(i + 4, players.length)}`,
        names: players.slice(i, i + 4),
      });
    }
    return out;
  }
  return [
    { label: "TOP 4", names: g.top4 || [] },
    { label: "BOTTOM 4", names: g.bottom4 || [] },
  ];
};

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

  const columns = groups.map((g) => ({ group: g, rows: blocks(g) }));
  const rowCount = Math.max(...columns.map((c) => c.rows.length));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="bg-slate-800 text-slate-400 font-semibold text-left px-2 py-1.5 sticky left-0 z-10">Rank</th>
            {columns.map((c) => (
              <th
                key={c.group.group}
                className="bg-purple-300 text-slate-900 font-bold px-2 py-1.5 text-center min-w-[110px]"
              >
                {c.group.label || c.group.group}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, r) => (
            <tr key={r} className="border-t border-slate-700">
              <td className="bg-sky-200 text-slate-900 font-bold px-2 py-1.5 sticky left-0 z-10 whitespace-nowrap">
                {columns.find((c) => c.rows[r])?.rows[r].label || ""}
              </td>
              {columns.map((c) => (
                <td key={c.group.group} className="bg-slate-800/60 px-1 py-1.5 align-top">
                  {cell(c.rows[r]?.names || [])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-slate-700">
            <td className="bg-slate-700 text-slate-200 font-bold px-2 py-1.5 sticky left-0 z-10">Courts</td>
            {columns.map((c) => (
              <td
                key={c.group.group}
                className="bg-slate-900 px-2 py-1.5 text-center font-bold text-yellow-400"
              >
                {(c.group.courts || []).join(" / ")}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
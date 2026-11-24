import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

const low = (value) => String(value || "").trim().toLowerCase();

// Who plays the 4th game. Everyone booked in for the night is listed, the players who
// put their hand up on the home page start ticked, and the admin can add or drop anyone
// — so the extra game can be a completely different list from the three drawn games.
export default function FourthGamePlayers({ players, opted, picked, onChange }) {
  const [query, setQuery] = useState("");
  const optedSet = useMemo(() => new Set((opted || []).map(low)), [opted]);
  const pickedSet = useMemo(() => new Set((picked || []).map(low)), [picked]);
  const shown = (players || []).filter((name) => low(name).includes(low(query)));

  const toggle = (name) => {
    const key = low(name);
    onChange(
      pickedSet.has(key)
        ? picked.filter((n) => low(n) !== key)
        : [...picked, name]
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tonight's players"
            className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 py-1.5 text-xs text-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={() => onChange([...new Set([...(picked || []), ...(players || [])])])}
          className="text-[11px] font-bold text-slate-600 hover:underline"
        >
          All
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-[11px] font-bold text-slate-600 hover:underline"
        >
          None
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
        {shown.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">No players match.</p>
        ) : (
          shown.map((name) => {
            const on = pickedSet.has(low(name));
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
              >
                <span className="text-xs font-semibold text-slate-800">
                  {name}
                  {optedSet.has(low(name)) && (
                    <span className="ml-1.5 rounded bg-teal-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-700">
                      asked for it
                    </span>
                  )}
                </span>
                <span
                  className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                    on ? "bg-slate-900 border-slate-900" : "border-slate-300"
                  }`}
                >
                  {on && <Check className="w-3 h-3 text-white" />}
                </span>
              </button>
            );
          })
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        {picked.length} selected{picked.length >= 4 ? ` · ${Math.floor(picked.length / 4)} game${Math.floor(picked.length / 4) === 1 ? "" : "s"} of four` : " · four players make a game"}
      </p>
    </div>
  );
}
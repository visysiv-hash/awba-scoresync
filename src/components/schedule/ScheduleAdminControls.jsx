import { Loader2 } from "lucide-react";
import { RANDOM_SCOPE } from "@/lib/nightDraw";

// Every way the night can be paired. Add a new one here and it appears in the
// dropdown straight away.
const SCOPES = [
  { value: -2, label: "Unique games" },
  { value: 0, label: "Crossover" },
  { value: -1, label: "Help beginners" },
  { value: 1, label: "Each group" },
  { value: RANDOM_SCOPE, label: "Random games (balanced)" },
];

const MODES = [
  { value: "night", label: "Whole night" },
  { value: "game", label: "One game" },
];

const chip = (active) =>
  `px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
    active ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
  }`;

// Admin tools for tonight's schedule: how far the pairings reach, a stand-in for a
// missing player, and whether a swap trades two players everywhere or only one game.
export default function ScheduleAdminControls({
  scope,
  busy,
  onScope,
  onRepair,
  swapMode,
  onSwapMode,
  onReplacePlayer,
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 no-print">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pair across</p>
        <select
          value={scope}
          onChange={(e) => onScope(Number(e.target.value))}
          disabled={busy}
          className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {SCOPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />}
      </div>

      <button type="button" onClick={onRepair} disabled={busy} className={chip(false)}>
        Re-pair
      </button>

      {onReplacePlayer && (
        <button type="button" onClick={onReplacePlayer} disabled={busy} className={chip(false)}>
          Player change
        </button>
      )}

      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Swap</p>
        <div className="flex gap-1.5">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSwapMode(option.value)}
              className={chip(swapMode === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
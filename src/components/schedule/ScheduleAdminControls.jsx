import { Loader2 } from "lucide-react";

const SCOPES = [
  { value: 0, label: "Crossover" },
  { value: -1, label: "Help beginners" },
  { value: 1, label: "Each group" },
];

const MODES = [
  { value: "night", label: "Whole night" },
  { value: "game", label: "One game" },
];

const chip = (active) =>
  `px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
    active ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
  }`;

// Admin tools for tonight's schedule: how far the pairings reach, and whether a swap
// trades two players everywhere or only inside one game.
export default function ScheduleAdminControls({ scope, busy, onScope, onRepair, swapMode, onSwapMode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 no-print">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pair across</p>
        <div className="flex gap-1.5">
          {SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onScope(option.value)}
              disabled={busy}
              className={chip(scope === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />}
      </div>

      <button type="button" onClick={onRepair} disabled={busy} className={chip(false)}>
        Re-pair
      </button>

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
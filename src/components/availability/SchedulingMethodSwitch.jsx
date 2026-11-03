import { FileSpreadsheet, Smartphone } from "lucide-react";

const OPTIONS = [
  {
    id: "sheet",
    label: "Google Sheet",
    hint: "Names go to the sheet and the draw is made there, exactly as now.",
    Icon: FileSpreadsheet,
  },
  {
    id: "app",
    label: "App",
    hint: "Draw is generated in the app. The sheet is left untouched.",
    Icon: Smartphone,
  },
];

export default function SchedulingMethodSwitch({ method, onChange }) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-300">Scheduling method</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ id, label, Icon }) => {
          const active = method === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                active
                  ? "bg-yellow-500 text-slate-900"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400 leading-snug">
        {OPTIONS.find((o) => o.id === method)?.hint}
      </p>
    </div>
  );
}
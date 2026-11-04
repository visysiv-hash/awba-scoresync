import { useState } from "react";
import { Shuffle } from "lucide-react";

const chip = (active) =>
  `px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
    active ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
  }`;

// Admin nets control: shuffle every group's net block for the week, or tap two
// groups to trade nets. Changes stay local until the schedule is saved.
export default function NetAssignmentRow({ groups, onShuffle, onSwap }) {
  const [picked, setPicked] = useState(null);

  const tapGroup = (index) => {
    if (picked === null) return setPicked(index);
    if (picked === index) return setPicked(null);
    onSwap(picked, index);
    setPicked(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 no-print">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nets</p>
      <button
        type="button"
        onClick={() => {
          setPicked(null);
          onShuffle();
        }}
        className={chip(false)}
      >
        <Shuffle className="inline w-3 h-3 mr-1 -mt-0.5" /> Shuffle
      </button>
      {groups.map((g, i) => (
        <button
          key={g.group ?? i}
          type="button"
          onClick={() => tapGroup(i)}
          className={chip(picked === i)}
        >
          G{g.group ?? i + 1} · {(g.courts || []).join(" & ")}
        </button>
      ))}
      {picked !== null && (
        <span className="text-xs text-yellow-400 font-semibold">
          now tap the group to trade nets with
        </span>
      )}
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { netMix, singlesGameCount } from "@/lib/singlesNets";

// Pick the nets whose players share one block: those nets play doubles wherever the
// players allow it, and singles only for the games a doubles four cannot fill.
export default function SinglesNetsDialog({ record, onSave, onClose }) {
  const groups = record?.groups || [];
  const [picked, setPicked] = useState(() => new Set((record?.singles_nets || []).map(Number)));

  const chosen = groups.filter((g) => (g.courts || []).some((net) => picked.has(Number(net))));
  const nets = [...new Set(chosen.flatMap((g) => g.courts || []).map(Number))].sort((a, b) => a - b);
  const players = chosen.reduce((sum, g) => sum + (g.players || []).length, 0);
  const mix = netMix(players, nets.length);
  const singles = singlesGameCount(players, nets.length);

  const toggle = (group) => {
    const courts = (group.courts || []).map(Number);
    const on = courts.some((net) => picked.has(net));
    const next = new Set(picked);
    for (const net of courts) {
      if (on) next.delete(net);
      else next.add(net);
    }
    setPicked(next);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Singles games</DialogTitle>
          <DialogDescription>
            Pick the nets whose players share a block. Every round those nets play doubles wherever
            there are enough players, and only the games they cannot fill are played as singles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nets</p>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((group) => {
              const courts = (group.courts || []).map(Number);
              const on = courts.some((net) => picked.has(net));
              return (
                <button
                  key={group.group ?? courts.join("-")}
                  type="button"
                  onClick={() => toggle(group)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    on
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {courts.length ? `Net${courts.length > 1 ? "s" : ""} ${courts.join(" & ")}` : group.label}
                  <span className={`ml-1.5 ${on ? "text-white/70" : "text-slate-500"}`}>
                    {(group.players || []).length}p
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
          {nets.length ? (
            <>
              <p className="font-semibold">
                {players} players on {nets.length} net{nets.length > 1 ? "s" : ""} — each round{" "}
                {mix.doubles} doubles{mix.singles ? ` + ${mix.singles} singles` : ""}.
              </p>
              <p className="mt-1 text-slate-500">
                {singles
                  ? `${singles} singles game${singles > 1 ? "s" : ""} in the night, all the rest doubles.`
                  : "Enough players for every game to be doubles."}
              </p>
            </>
          ) : (
            <p className="text-slate-500">No nets picked — every game stays as it is drawn.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(nets); onClose(); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, X } from "lucide-react";
import { singlesMatches, sideLabels, addPlayerToSingles } from "@/lib/singlesFill";

// Someone turns up who was not in the draw: give a singles player a partner, so that
// game is played as doubles. Only the chosen game changes, and only on a published
// draw — the change is saved straight away so players see it.
export default function AddSinglesPlayerDialog({ record, onApply, onClose }) {
  const games = singlesMatches(record);
  const [pickedKey, setPickedKey] = useState(games.length ? `${games[0].net}|${games[0].game}` : "");
  const [side, setSide] = useState("team1");
  const [player, setPlayer] = useState("");
  const [query, setQuery] = useState("");
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.functions.invoke("getMemberRoster", {})
      .then((res) => setRoster(res.data?.roster || []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, []);

  const match = games.find((m) => `${m.net}|${m.game}` === pickedKey);
  const sides = match ? sideLabels(match) : [];
  const open = sides.filter((s) => s.lone);
  const chosen = open.find((s) => s.side === side) || open[0];
  const other = chosen ? sides.find((s) => s.side !== chosen.side) : null;

  const q = query.trim().toLowerCase();
  const results = q.length < 2
    ? []
    : roster
        .filter((m) => `${m.display_name || ""} ${m.full_name || ""}`.toLowerCase().includes(q))
        .slice(0, 6);

  const apply = async () => {
    if (!match || !chosen) return;
    setBusy(true);
    setError("");
    try {
      const next = addPlayerToSingles(record, {
        net: match.net,
        game: match.game,
        side: chosen.side,
        player,
      });
      const ok = await onApply(next);
      if (ok) onClose();
    } catch (err) {
      setError(err.message || "Couldn't add the player.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3 no-print">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-white">Add a player to a singles game</h2>
            <p className="text-[11px] text-slate-400">They partner the player on their own, so the game is doubles.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!games.length ? (
            <p className="text-xs text-slate-300">
              There are no singles games on this draw — every game already has two players a side.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Singles game</label>
                <select
                  value={pickedKey}
                  onChange={(e) => { setPickedKey(e.target.value); setSide("team1"); setError(""); }}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-2 text-xs font-semibold text-white"
                >
                  {games.map((m) => (
                    <option key={`${m.net}|${m.game}`} value={`${m.net}|${m.game}`}>
                      Net {m.net} · Game {m.game} — {(m.team1 || []).join(" & ")} vs {(m.team2 || []).join(" & ")}
                    </option>
                  ))}
                </select>
              </div>

              {open.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Partner</label>
                  <div className="flex flex-wrap gap-1.5">
                    {open.map((s) => (
                      <button
                        key={s.side}
                        type="button"
                        onClick={() => setSide(s.side)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          chosen?.side === s.side ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Player from the member list</label>
                <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search the member list…"
                    className="w-full bg-transparent py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                {player && <p className="text-xs font-semibold text-yellow-400">{player} selected</p>}
                {loadingRoster && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading members…
                  </p>
                )}
                {results.length > 0 && (
                  <div className="rounded-lg border border-slate-700 divide-y divide-slate-700 overflow-hidden">
                    {results.map((m) => {
                      const name = m.display_name || m.full_name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => { setPlayer(name); setQuery(""); setError(""); }}
                          className="w-full text-left px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-700"
                        >
                          {name}
                          {m.full_name && m.full_name !== name && <span className="text-slate-500"> · {m.full_name}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {chosen && (
                <p className="text-[11px] text-slate-400">
                  Becomes {[chosen.label, player || "…"].join(" & ")} vs {other?.label} on Net {match.net}, Game {match.game}. Every
                  other game stays exactly as it is.
                </p>
              )}
            </>
          )}

          {error && <p className="text-[11px] text-red-300">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={apply}
              disabled={!match || !chosen || !player || busy}
              className="flex-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add player and publish
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2.5 text-xs font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
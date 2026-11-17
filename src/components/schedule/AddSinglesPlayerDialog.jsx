import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X } from "lucide-react";
import { singlesMatches, gameKey, addPlayersToGames, gamesPlayed, MAX_GAMES } from "@/lib/singlesFill";

// Someone turns up who was not in the draw: fill the pair on each game that still has
// only one player a side. Both sides of a game are chosen here, so the two new players
// can be picked onto opposite sides of the same game, and the whole night saves at once.
export default function AddSinglesPlayerDialog({ record, onApply, onClose }) {
  const games = useMemo(() => singlesMatches(record), [record]);
  const [pairs, setPairs] = useState({});
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

  const names = useMemo(() => {
    const list = roster.map((m) => m.display_name || m.full_name).filter(Boolean);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b));
  }, [roster]);

  const setSide = (key, side, value) => {
    setPairs((p) => ({ ...p, [key]: { ...(p[key] || {}), [side]: value } }));
    setError("");
  };

  const additions = games.flatMap((m) =>
    ["team1", "team2"]
      .filter((side) => (m[side] || []).length === 1)
      .map((side) => ({ net: m.net, game: Number(m.game), side, player: pairs[gameKey(m)]?.[side] || "" }))
      .filter((a) => a.player)
  );

  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const next = addPlayersToGames(record, additions);
      const ok = await onApply(next);
      if (ok) onClose();
    } catch (err) {
      setError(err.message || "Couldn't add those players.");
    } finally {
      setBusy(false);
    }
  };

  const sideSelect = (match, side) => {
    const key = gameKey(match);
    const current = pairs[key]?.[side] || "";
    return (
      <select
        value={current}
        onChange={(e) => setSide(key, side, e.target.value)}
        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-semibold text-white"
      >
        <option value="">Choose player…</option>
        {names.map((n) => {
          const played = gamesPlayed(record, n);
          return (
            <option key={n} value={n} disabled={played >= MAX_GAMES}>
              {n} · {played} {played === 1 ? "game" : "games"}
            </option>
          );
        })}
      </select>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3 no-print">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-white">Fill the singles games</h2>
            <p className="text-[11px] text-slate-400">
              Pick the player for each side. Nobody plays more than {MAX_GAMES} games.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loadingRoster && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading members…
            </p>
          )}

          {!loadingRoster && !games.length && (
            <p className="text-[11px] text-slate-400">
              Every game already has two players a side, so there is nothing to fill.
            </p>
          )}

          {games.map((m) => {
            const key = gameKey(m);
            const picked = pairs[key] || {};
            return (
              <div key={key} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Game {m.game} · Net {m.net}
                </p>
                {["team1", "team2"].map((side) => {
                  const team = m[side] || [];
                  const other = m[side === "team1" ? "team2" : "team1"] || [];
                  const added = picked[side];
                  return (
                    <div key={side} className="space-y-1">
                      <p className="text-[11px] text-slate-300">
                        {[...team, ...(added ? [added] : [])].join(" & ")}
                        <span className="text-slate-500"> vs {other.join(" & ") || "—"}</span>
                      </p>
                      {team.length === 1 && sideSelect(m, side)}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {error && <p className="text-[11px] text-red-300">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={apply}
              disabled={!additions.length || busy}
              className="flex-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save to draw
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
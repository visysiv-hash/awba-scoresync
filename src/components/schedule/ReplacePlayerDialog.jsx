import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, UserMinus, X } from "lucide-react";
import { appRatingMap } from "@/lib/appRatingMap";
import { memberGenders } from "@/lib/memberGenders";
import { gamesInvolving, rebalanceMissingGames, withReplacement } from "@/lib/playerChange";

// Someone didn't turn up. Pick who is missing and who is taking their place, then
// either simply hand over their games or re-form just those games so the contests
// stay even with a player of a different level.
export default function ReplacePlayerDialog({ record, onApply, onClose }) {
  const players = useMemo(
    () => [...new Set((record?.groups || []).flatMap((g) => g.players || []))].sort((a, b) => a.localeCompare(b)),
    [record]
  );
  const [missing, setMissing] = useState("");
  const [replacement, setReplacement] = useState("");
  const [query, setQuery] = useState("");
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    base44.functions.invoke("getMemberRoster", {})
      .then((res) => setRoster(res.data?.roster || []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, []);

  const affected = missing ? gamesInvolving(record, missing) : [];
  const games = affected.map((i) => record.matches[i]);

  const results = (() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return roster
      .filter((m) => `${m.display_name || ""} ${m.full_name || ""}`.toLowerCase().includes(q))
      .slice(0, 6);
  })();

  const apply = async (mode) => {
    if (!missing || !replacement) return;
    if (players.includes(replacement)) {
      setError(`${replacement} is already on the schedule — use a swap instead.`);
      return;
    }
    setBusy(mode);
    setError("");
    try {
      if (mode === "take") {
        const next = withReplacement(record, missing, replacement);
        const ok = onApply(next, `${replacement} takes over ${missing}'s ${games.length} game${games.length === 1 ? "" : "s"}.`);
        if (ok) onClose();
      } else {
        const [ratings, genders] = await Promise.all([
          appRatingMap().catch(() => ({})),
          memberGenders().catch(() => ({})),
        ]);
        const result = rebalanceMissingGames(record, {
          missing,
          replacement,
          profiles: { ratings, genders },
        });
        const extra = result.extra.length ? ` · ${result.extra.join(", ")} re-balanced too` : "";
        const message = `Re-did ${result.changed.join(", ")} for ${replacement}${extra} — balance within ${result.worstGap.toFixed(2)}.`;
        if (onApply(result.record, message)) onClose();
      }
    } catch (err) {
      setError(err.message || "Couldn't work out the change.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3 no-print">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-white">Player change</h2>
            <p className="text-[11px] text-slate-400">Someone missing? Bring a stand-in in.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <UserMinus className="w-3 h-3" /> Not coming
            </label>
            <select
              value={missing}
              onChange={(e) => { setMissing(e.target.value); setError(""); }}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-2 text-xs font-semibold text-white"
            >
              <option value="">Choose a player…</option>
              {players.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {missing && (
              <p className="text-[11px] text-slate-400">
                {games.length
                  ? `Plays ${games.length} game${games.length === 1 ? "" : "s"}: ${games.map((m) => `Net ${m.net} G${m.game}`).join(", ")}`
                  : "Not in any game yet."}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Taking their place</label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-2">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the member list…"
                className="w-full bg-transparent py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            {replacement && (
              <p className="text-xs font-semibold text-yellow-400">{replacement} selected</p>
            )}
            {loadingRoster && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading members…</p>}
            {results.length > 0 && (
              <div className="rounded-lg border border-slate-700 divide-y divide-slate-700 overflow-hidden">
                {results.map((m) => {
                  const name = m.display_name || m.full_name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setReplacement(name); setQuery(""); setError(""); }}
                      className="w-full text-left px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      {name}
                      {m.full_name && m.full_name !== name && <span className="text-slate-500"> · {m.full_name}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Or type a name"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-2 text-xs text-white placeholder:text-slate-500"
            />
          </div>

          {error && <p className="text-[11px] text-red-300">{error}</p>}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => apply("redo")}
              disabled={!missing || !replacement || !!busy}
              className="w-full rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5"
            >
              {busy === "redo" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Redo their games, keep them balanced
            </button>
            <button
              type="button"
              onClick={() => apply("take")}
              disabled={!missing || !replacement || !!busy}
              className="w-full rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-2 text-xs font-semibold text-white"
            >
              {busy === "take" ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
              Just take over their games
            </button>
            <p className="text-[10px] leading-snug text-slate-500">
              Redo touches only the games the absent player was in, putting the same four players together the most even way. One extra game may be adjusted if a contest is still lopsided. Nothing is saved until you press Save.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
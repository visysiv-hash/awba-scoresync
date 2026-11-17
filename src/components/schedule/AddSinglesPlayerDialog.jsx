import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search, X } from "lucide-react";
import { openPartners, roundNumbers, optionKey, addSinglesPlayer, gamesPlayed, MAX_GAMES } from "@/lib/singlesFill";

// Someone turns up who was not in the draw: give them a partner in each game of the
// night. The partner is chosen per game, so the same player can stand with a different
// singles player each round. Only those games change, and only on a published draw.
export default function AddSinglesPlayerDialog({ record, onApply, onClose }) {
  const rounds = useMemo(() => roundNumbers(record), [record]);
  const options = useMemo(() => openPartners(record), [record]);
  const [picks, setPicks] = useState({});
  const [player, setPlayer] = useState("");
  const [query, setQuery] = useState("");
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Start on the first free partner of every game, so the whole night is filled out
  // in one press and the admin only changes the games they want to.
  useEffect(() => {
    const start = {};
    for (const round of rounds) {
      const first = options.find((o) => o.game === round);
      if (first) start[round] = optionKey(first);
    }
    setPicks(start);
  }, [rounds, options]);

  useEffect(() => {
    base44.functions.invoke("getMemberRoster", {})
      .then((res) => setRoster(res.data?.roster || []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, []);

  const q = query.trim().toLowerCase();
  const results = q.length < 2
    ? []
    : roster
        .filter((m) => `${m.display_name || ""} ${m.full_name || ""}`.toLowerCase().includes(q))
        .slice(0, 6);

  const played = gamesPlayed(record, player);

  const chosen = rounds
    .map((round) => ({ round, option: options.find((o) => o.game === round && optionKey(o) === picks[round]) }))
    .filter((row) => row.option);

  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      const next = addSinglesPlayer(record, {
        player,
        picks: chosen.map((row) => row.option),
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
            <h2 className="text-sm font-bold text-white">Add a player to the singles games</h2>
            <p className="text-[11px] text-slate-400">Pick who they play with in each game. A player can play up to {MAX_GAMES} games.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Player to add</label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-2">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the member list…"
                className="w-full bg-transparent py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            {player && (
              <p className="text-xs font-semibold text-yellow-400">
                {player} selected
                <span className="font-normal text-slate-400">
                  {" "}· {played ? `already playing ${played} game${played === 1 ? "" : "s"}` : "not playing yet"}
                  {" "}· can be added to {Math.max(0, MAX_GAMES - played)} more
                </span>
              </p>
            )}
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

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Partner in each game</label>
            {rounds.map((round) => {
              const rowOptions = options.filter((o) => o.game === round);
              return (
                <div key={round} className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-500">Game {round}</p>
                  <select
                    value={picks[round] || ""}
                    onChange={(e) => { setPicks((p) => ({ ...p, [round]: e.target.value })); setError(""); }}
                    disabled={!rowOptions.length}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <option value="">{rowOptions.length ? "Rest this game" : "No singles game"}</option>
                    {rowOptions.map((o) => (
                      <option key={optionKey(o)} value={optionKey(o)}>
                        Net {o.net} — with {o.partner}
                        {o.against.length ? `, vs ${o.against.join(" & ")}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {!options.length && (
              <p className="text-[11px] text-slate-400">
                There are no singles games on this draw — every game already has two players a side.
              </p>
            )}
          </div>

          {chosen.length > 0 && (
            <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-2.5 space-y-1">
              {chosen.map(({ round, option }) => (
                <p key={round} className="text-[11px] text-slate-300">
                  <span className="text-slate-500">Game {round}:</span>{" "}
                  {[option.partner, player || "new player"].join(" & ")} vs {option.against.join(" & ")}
                </p>
              ))}
            </div>
          )}

          {error && <p className="text-[11px] text-red-300">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={apply}
              disabled={!player || !chosen.length || busy}
              className="flex-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add player and save
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
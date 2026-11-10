import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, CheckCircle2, ScanSearch, Wand2 } from "lucide-react";
import { pairAverage } from "@/lib/appRatingMap";
import { reviewDraw, WIDE_GAP } from "@/lib/drawReview";

const at = (w) => `Net ${w.net} Game ${w.game}`;

const whereText = (item) => {
  const bits = [];
  if (item.partnerAt.length) bits.push(`partners in ${item.partnerAt.map(at).join(", ")}`);
  if (item.opponentAt.length) bits.push(`opponents in ${item.opponentAt.map(at).join(", ")}`);
  return bits.join(" · ");
};

const repeatTag = (item) =>
  item.partnerAt.length > 1 ? "Partners twice" : item.opponentAt.length > 1 ? "Opponents twice" : "Both ways";

const teamText = (team, ratings) => {
  const avg = pairAverage(team, ratings);
  return {
    names: team.join(" & "),
    avg: avg === null ? null : avg.toFixed(2),
  };
};

function Split({ team1, team2, ratings }) {
  const a = teamText(team1, ratings);
  const b = teamText(team2, ratings);
  return (
    <p className="text-xs leading-snug">
      <span className="font-semibold text-white">{a.names}</span>
      {a.avg && <span className="text-slate-400"> {a.avg}</span>}
      <span className="text-slate-500"> vs </span>
      <span className="font-semibold text-white">{b.names}</span>
      {b.avg && <span className="text-slate-400"> {b.avg}</span>}
    </p>
  );
}

// A second pair of eyes on the schedule that is already on screen: which games are
// lopsided, and which of them can be split closer with the same four players.
export default function DrawReviewCard({ record, ratings = {}, onApplySplit, onApplySwap }) {
  const [open, setOpen] = useState(false);
  const review = useMemo(() => (open ? reviewDraw(record, ratings) : null), [open, record, ratings]);

  if (!record?.matches?.length) return null;

  const repeats = review?.uniqueness;

  return (
    <div className="no-print rounded-xl bg-slate-800 border border-slate-700 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-yellow-400" />
          <div>
            <p className="text-sm font-bold text-white">Review this draw</p>
            <p className="text-[11px] text-slate-400">
              Check the games on screen for lopsided pairs and pairs who meet again
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={open ? "secondary" : "default"}
          onClick={() => setOpen((v) => !v)}
          className={open ? "" : "bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold"}
        >
          {open ? "Hide review" : "Review draw"}
        </Button>
      </div>

      {review && (
        <div className="space-y-2">
          {review.worst === null ? (
            <p className="text-xs text-slate-400">
              No ratings found for these players, so balance can't be graded. Repeats are checked below.
            </p>
          ) : (
            <p
              className={`text-xs rounded-lg border px-3 py-2 ${
                review.flagged.length
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                  : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {review.flagged.length ? (
                <>
                  <span className="font-bold">
                    {review.flagged.length} game{review.flagged.length === 1 ? "" : "s"} wider than{" "}
                    {WIDE_GAP.toFixed(1)}
                  </span>{" "}
                  · widest {review.worst.toFixed(2)} · average {review.average.toFixed(2)} across{" "}
                  {review.rows.length} games
                  {review.fixes > 0 && ` · ${review.fixes} can be split closer right here`}
                </>
              ) : (
                <>
                  <span className="font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Every game is within {WIDE_GAP.toFixed(1)}
                  </span>{" "}
                  · widest {review.worst.toFixed(2)} · average {review.average.toFixed(2)} across{" "}
                  {review.rows.length} games
                </>
              )}
            </p>
          )}

          {review.flagged.map((row) => (
            <div
              key={`${row.net}-${row.game}`}
              className="rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Net {row.net} · Game {row.game}
                </p>
                <span className="text-[11px] font-bold text-amber-300">gap {row.gap.toFixed(2)}</span>
              </div>

              <Split team1={row.team1} team2={row.team2} ratings={ratings} />

              {row.better ? (
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 inline-flex items-center gap-1">
                      <Wand2 className="w-3 h-3" /> Closer split · gap {row.better.gap.toFixed(2)}
                    </p>
                    <Split team1={row.better.team1} team2={row.better.team2} ratings={ratings} />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onApplySplit?.(row)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold shrink-0"
                  >
                    Use it <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  These players can't be split closer — the gap comes from who is in this game, so
                  swapping someone in from another court or re-pairing is the way to even it up.
                </p>
              )}
            </div>
          ))}

          {review.repeatItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Pairs who meet again
              </p>
              {review.repeatItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white">
                      {item.a} &amp; {item.b}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        item.partnerAt.length > 1 ? "text-red-300" : "text-amber-300"
                      }`}
                    >
                      {repeatTag(item)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{whereText(item)}</p>
                  {item.fix ? (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-emerald-300">{item.fix.label}</p>
                      <Button
                        size="sm"
                        onClick={() => onApplySwap?.(item.fix)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold shrink-0"
                      >
                        Fix it <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 inline-flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      No single swap breaks this without unbalancing a game — re-pair the night for a fresh set.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {repeats && (
            <p className="text-[11px] text-slate-400">
              Repeats tonight: {repeats.partners} repeated partner pairing
              {repeats.partners === 1 ? "" : "s"}, {repeats.opponents} repeated opponent matchup
              {repeats.opponents === 1 ? "" : "s"}, {repeats.meetings} encounter
              {repeats.meetings === 1 ? "" : "s"} switched between partner and opponent
              {repeats.short > 0 && ` · ${repeats.short} player${repeats.short === 1 ? "" : "s"} short of three games`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
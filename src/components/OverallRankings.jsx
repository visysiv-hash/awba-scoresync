import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PlayerPairingModal from "./PlayerPairingModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Loader2, TrendingUp, ChevronDown, ChevronUp, Info } from "lucide-react";
import RatingTrendChart from "./RatingTrendChart";

function RatingBreakdown({ p }) {
  if (!p.hasStats) {
    return (
      <div className="mt-2 bg-slate-100 rounded-lg p-3 text-xs text-slate-500">
        No round data recorded yet — using base group only.
        <br />Base Group = <strong>{p.currentGroup}</strong>
      </div>
    );
  }

  // Group rounds by year (round numbers don't have years, so group under "2026")
  // Rounds are just round numbers; label the season as current year
  const season = "2026";
  const rounds = p.rounds || [];
  const hasOverride = p.ratingBaseGroup != null;

  return (
    <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg overflow-hidden text-xs text-slate-700">
      {/* Season header */}
      <div className="bg-blue-200 px-3 py-1.5 font-bold text-blue-900 text-xs flex items-center justify-between">
        <span>{season} SEASON</span>
        {hasOverride && <span className="text-orange-600 font-semibold">* Base overridden → Group {p.ratingBaseGroup}</span>}
      </div>

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-blue-100 text-slate-600">
            <th className="text-left px-2 py-1">Round</th>
            <th className="text-center px-2 py-1">Own Grp</th>
            <th className="text-center px-2 py-1">Base Used</th>
            <th className="text-center px-2 py-1">MP</th>
            <th className="text-center px-2 py-1">Diff</th>
            <th className="text-left px-2 py-1">Calculation</th>
            <th className="text-center px-2 py-1">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r, i) => {
            const base = r.base;
            const hasStrengthAdj = r.adjustedDiff != null && r.adjustedDiff !== r.diff;
            const diffUsed = r.adjustedDiff ?? r.diff;
            const calc = `${base} − (${diffUsed >= 0 ? "+" : ""}${diffUsed} ÷ ${r.gp * 2} ÷ ${r.divisor ?? 30}) = ${r.sessionRating}`;
            return (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
              <td className="px-2 py-1">Round {r.round}</td>
              <td className="text-center px-2 py-1">{r.group}</td>
              <td className="text-center px-2 py-1">
                <span className={r.isMixed ? "text-purple-600 font-semibold" : ""}>
                  {base}
                </span>
                {r.isMixed && <span className="ml-1 text-purple-400" title="Mixed group pairing — team avg used">⚡</span>}
              </td>
              <td className="text-center px-2 py-1">{r.gp}</td>
              <td className="text-center px-2 py-1">
                {r.diff >= 0 ? "+" : ""}{r.diff}
                {hasStrengthAdj && (
                  <span className="ml-1 text-green-600 font-semibold" title="Strength-adjusted diff">
                    →{diffUsed >= 0 ? "+" : ""}{diffUsed}⚖️
                  </span>
                )}
              </td>
              <td className="px-2 py-1 text-slate-400 font-mono">{calc}</td>
              <td className="text-center px-2 py-1 font-semibold">{r.sessionRating}</td>
            </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-blue-200 font-bold text-blue-900">
            <td className="px-2 py-1" colSpan={2}>Total MP: {p.gp}</td>
            <td className="text-center px-2 py-1">{p.gp}</td>
            <td className="text-center px-2 py-1">{p.diff >= 0 ? "+" : ""}{p.diff}</td>
            <td className="px-2 py-1"></td>
            <td className="text-center px-2 py-1 text-yellow-700">avg: {p.baseRating}</td>
          </tr>

        </tfoot>
      </table>
    </div>
  );
}

export default function OverallRankings({ groups }) {
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    base44.functions.invoke("getPlayerRatings", {})
      .then(res => setRatings(res.data?.players || []))
      .finally(() => setLoadingRatings(false));
  }, []);

  const risingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup > 1 && p.rating < p.currentGroup
  );

  const strugglingPlayers = ratings.filter(p =>
    p.hasStats && p.currentGroup < 6 && p.rating > p.currentGroup
  );

  return (
    <>
    <div className="space-y-4">
      {/* Explainer */}
      <div className="bg-white border border-slate-200 rounded-xl shadow">
        <button
          onClick={() => setShowExplainer(!showExplainer)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <span>📊 How are ratings calculated?</span>
          {showExplainer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showExplainer && (
          <div className="px-4 pb-4 text-sm text-slate-600 space-y-4 border-t pt-3">

            <div className="space-y-1">
              <p className="font-bold text-slate-800">🎯 What is the rating?</p>
              <p>Your rating is a number that reflects your actual playing strength — <span className="font-semibold">lower is better</span>. A rating of <strong>2.7</strong> means you're performing above Group 3 level. A rating of <strong>3.4</strong> means you're performing below Group 3 level.</p>
              <p>Everyone starts at their assigned group number (e.g. Group 4 → starting rating of 4.0). Your rating then moves up or down each round based on your results.</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-slate-800">📐 How is each round calculated?</p>
              <p>After each round, your rating updates using this formula:</p>
              <div className="bg-slate-100 rounded-lg px-3 py-2 font-mono text-xs text-slate-700">
                New Rating = Previous Rating − (Total Point Diff ÷ Games Played ÷ 30)
              </div>
              <ul className="list-disc ml-4 space-y-1 text-xs mt-2">
                <li><strong>Point Diff</strong> = for each match, your team's score minus opponent's score — adjusted individually if teams were from different groups (see below), then summed across the round</li>
                <li><strong>Games Played</strong> = total individual games in that round (3 matches × 2 games = 6)</li>
                <li><strong>÷ divisor</strong> = dampening factor based on your <em>current rolling rating</em> (not just assigned group) — rating ~1.x→÷~38, ~2.x→÷~33, ~3.x→÷~28, ~4.x→÷~23, ~5.x→÷~18, ~6→÷15. Players performing better move faster</li>
                <li>Ratings <strong>compound</strong> — your rating from last round becomes the base for the next</li>
                <li>Each match's strength adjustment is applied <strong>individually</strong> — so only the specific match with a cross-group pairing gets adjusted, not the whole round</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2 text-xs">
              <p className="font-semibold text-blue-900">Example — Sam in Group 3 (starting rating: 3.0)</p>

              <div>
                <p className="font-semibold text-slate-700">Round 1 — all same-group pairings, no adjustment:</p>
                <p className="ml-2 text-slate-600">Match 1: diff <strong>+6</strong> → no adjustment → +6</p>
                <p className="ml-2 text-slate-600">Match 2: diff <strong>+2</strong> → no adjustment → +2</p>
                <p className="ml-2 text-slate-600">Match 3: diff <strong>+4</strong> → no adjustment → +4</p>
                <p className="ml-2 font-semibold">Total adjusted diff: +12 → 3.0 − (12 ÷ 6 ÷ 30) = <strong>2.93</strong></p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Round 2 — one cross-group match (Sam's team avg Grp 3 vs opponent avg Grp 1.5, gap = 1.5):</p>
                <p className="ml-2 text-slate-600">Match 1: diff <strong>−2</strong> → no adjustment (same group) → −2</p>
                <p className="ml-2 text-slate-600">Match 2: diff <strong>−8</strong> → gap 1.5 &gt; 0.5, adjustment = −(1.5×2) = −3 → adjusted diff = −8 − (−3) = <strong>−5</strong></p>
                <p className="ml-2 text-slate-600">Match 3: diff <strong>+1</strong> → no adjustment → +1</p>
                <p className="ml-2 font-semibold">Total adjusted diff: −6 → 2.93 − (−6 ÷ 6 ÷ 30) = <strong>2.96</strong></p>
              </div>

              <p className="text-blue-700 font-semibold mt-1">Final rating after Round 2: 2.96 — Sam is performing above Group 3 level ✅</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-slate-800">⚖️ Mixed-group strength adjustment</p>
              <p className="text-xs">When players from different groups are paired together (e.g. a Group 2 player paired with a Group 4 player against a full Group 3 team), the system applies a fairness adjustment:</p>
              <ul className="list-disc ml-4 space-y-1 text-xs mt-1">
                <li>Each match is assessed <strong>independently</strong> — only that specific match's diff is adjusted based on its own pairing's group gap</li>
                <li>If your team faced <strong>stronger</strong> opponents in a match — that match's diff is adjusted to soften the loss</li>
                <li>If your team faced <strong>weaker</strong> opponents in a match — that match's diff is reduced to discount the win</li>
                <li>Only triggers when the average group gap between the two teams in <strong>that match</strong> is more than 0.5</li>
                <li>The adjustment = group difference × 2 points, applied to that match's diff only — other matches in the round are unaffected</li>
              </ul>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-slate-800">🏅 What does the rating mean for groupings?</p>
              <ul className="list-disc ml-4 space-y-1 text-xs">
                <li>Ratings are used at the end of the season to recommend group placements for the next season</li>
                <li>A rating well below your group number → you may be promoted up</li>
                <li>A rating well above your group number → you may be moved to a lower group</li>
                <li>Players with fewer than 10 match plays have their rating weighted proportionally</li>
              </ul>
            </div>

            <p className="text-xs text-slate-400 italic">Tap any player's name in the rankings to see their full round-by-round breakdown.</p>
          </div>
        )}
      </div>
      {loadingRatings && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading ratings...
        </div>
      )}

      {/* All Player Rankings */}
      <Card className="shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">All Player Ratings</CardTitle>
          <div className="flex items-start gap-2 text-xs text-slate-400 mt-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
            <span>Rating = Group Base − Avg Point Diff per game ÷ 10. Tap a player to see breakdown.</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 p-3">
          {ratings.map((p, i) => {
            const isExpanded = expandedPlayer === p.player;
            return (
              <div
                key={p.player}
                className="rounded-lg px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedPlayer(isExpanded ? null : p.player)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.player}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.gp > 0 ? `${p.gp} MP · Diff ${p.diff >= 0 ? "+" : ""}${p.diff}` : "No games recorded"}
                    </p>
                    {p.hasStats && p.gp < 10 && (
                      <p className="text-xs text-purple-500">{p.gp}/10 MP — {Math.round((p.gp/10)*100)}% performance weight</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <span className={`text-sm font-bold ${p.hasStats ? "text-yellow-600" : "text-slate-400"}`}>{p.rating}</span>
                      {p.hasStats && p.baseRating !== p.rating && (
                        <p className="text-xs text-slate-400">perf: {p.baseRating}</p>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && (
          <>
            <RatingBreakdown p={p} />
            <RatingTrendChart rounds={p.rounds} overallRating={p.rating} groupBase={p.currentGroup} />
          </>
        )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Rising Players */}
      {risingPlayers.length > 0 && (
        <Card className="shadow-2xl border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" /> Rising Players
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Players whose rating has crossed below their current group number — worth watching for promotion.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {risingPlayers.sort((a, b) => a.rating - b.rating).map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                <TrendingUp className="w-4 h-4 text-yellow-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.gp} MP · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                  </div>
                  <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-yellow-700">Rating {p.rating}</p>
                  <p className="text-xs text-green-600 font-semibold">↑ Group {Math.ceil(p.rating)} territory</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Demotion Watch */}
      {strugglingPlayers.length > 0 && (
        <Card className="shadow-2xl border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-orange-500" /> Room for Improvement
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Players whose rating has risen above their current group number — may be better suited to a lower group.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {strugglingPlayers.sort((a, b) => b.rating - a.rating).map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <ArrowDown className="w-4 h-4 text-orange-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.player}</p>
                  <p className="text-xs text-muted-foreground">{p.gp} MP · Diff {p.diff >= 0 ? "+" : ""}{p.diff}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-orange-700">Rating {p.rating}</p>
                  <p className="text-xs text-orange-500 font-semibold">↓ Group {Math.floor(p.rating) + 1} territory</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
    {selectedPlayer && <PlayerPairingModal player={selectedPlayer} groupName={selectedGroup} onClose={() => setSelectedPlayer(null)} />}
    </>
  );
}
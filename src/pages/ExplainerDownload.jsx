import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const CONTENT = `
PARTNER-ADJUSTED WIN RATE — EXPLANATION
========================================

WHAT IS IT?
-----------
Instead of ranking players purely on raw win rate, we adjust each player's
win rate based on the quality of their partners. This prevents players from
being unfairly rewarded for having strong partners, or penalised for having
weak partners.


THE FORMULA
-----------
1. Raw Win Rate       = Wins / Matches Played × 100
2. League Average WR  = Average raw WR across ALL players in the league
3. Avg Partner WR     = Average raw WR of all partners a player was paired with
4. Partner Bonus      = Avg Partner WR − League Average WR
5. Adjusted WR        = Raw WR − Partner Bonus


WHAT IS PARTNER BONUS?
----------------------
Partner Bonus measures how much stronger or weaker your partners were
compared to the league average.

  - POSITIVE bonus → your partners were above average → you get PENALISED
    (your partners may have carried you)

  - NEGATIVE bonus → your partners were below average → you get REWARDED
    (you were winning despite weaker partners)


WORKED EXAMPLE: SRUJAN vs VISY SWAP
-------------------------------------
League Average WR = 50%

SRUJAN (Group 1 — worst performer):
  Raw WR             = 35%
  Avg Partner WR     = 55%
  Partner Bonus      = 55% − 50% = +5%   (partners were ABOVE average)
  Adjusted WR        = 35% − 5% = 30%    (penalised — partners were helping him)

  → "Srujan was getting decent partners but still losing —
     his true skill is even lower than his raw score suggests."

VISY (Group 2 — best performer):
  Raw WR             = 60%
  Avg Partner WR     = 40%
  Partner Bonus      = 40% − 50% = −10%  (partners were BELOW average)
  Adjusted WR        = 60% − (−10%) = 70% (rewarded — partners were dragging him down)

  → "Visy was winning even with weaker partners —
     his true skill is even higher than his raw score suggests."

RESULT:
  Player   | Raw WR | Adjusted WR
  ---------|--------|------------
  Srujan   |  35%   |  30%  (worse than it looks)
  Visy     |  60%   |  70%  (better than it looks)

Since Visy's adjusted WR (70%) > Srujan's adjusted WR (30%),
the system suggests swapping them — moving Visy up to Group 1
and Srujan down to Group 2.

The gap is actually BIGGER once partner quality is accounted for,
making the swap even more justified.


WHY THIS IS FAIRER
------------------
Without adjustment, a player who always gets paired with top players
looks better than they are, and a player stuck with weak partners
looks worse than they are. The partner-adjusted system levels
the playing field so rankings reflect individual skill, not luck of the draw.
`;

export default function ExplainerDownload() {
  const handleDownload = () => {
    const blob = new Blob([CONTENT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Partner_Adjusted_WR_Explanation.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Partner-Adjusted WR</h1>
        <p className="text-slate-500 text-sm">
          Full explanation of the partner-adjusted win rate system, including the
          Srujan vs Visy swap example — ready to share.
        </p>
        <Button onClick={handleDownload} className="gap-2 w-full">
          <Download className="w-4 h-4" /> Download Explanation (.txt)
        </Button>
        <pre className="text-left text-xs bg-slate-50 rounded-lg p-4 overflow-auto max-h-72 text-slate-600 whitespace-pre-wrap">
          {CONTENT.trim()}
        </pre>
      </div>
    </div>
  );
}
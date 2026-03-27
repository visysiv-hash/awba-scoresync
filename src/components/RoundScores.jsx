import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getRoundError(score1, score2) {
  const s1 = Number(score1);
  const s2 = Number(score2);
  if (score1 !== "" && s1 > 21) return `${score1} exceeds maximum score of 21.`;
  if (score2 !== "" && s2 > 21) return `${score2} exceeds maximum score of 21.`;
  if (score1 !== "" && score2 !== "" && s1 === 21 && s2 === 21) return "Only one team can score 21 per round.";
  return null;
}

export default function RoundScores({ rounds, onChange, team1, team2 }) {
  const updateRound = (index, field, value) => {
    const updated = rounds.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {rounds.map((round, i) => {
        const error = getRoundError(round.score1, round.score2);
        return (
          <div key={i} className={`border rounded-lg p-4 space-y-2 ${error ? "border-red-400 bg-red-50" : ""}`}>
            <p className="text-sm font-semibold text-muted-foreground">Game {i + 1}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-blue-600 text-xs truncate block">{team1}</Label>
                <Input
                  type="number"
                  min="0"
                  max="21"
                  placeholder="0"
                  value={round.score1}
                  onChange={e => updateRound(i, "score1", e.target.value)}
                  className="text-center text-xl font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-red-600 text-xs truncate block">{team2}</Label>
                <Input
                  type="number"
                  min="0"
                  max="21"
                  placeholder="0"
                  value={round.score2}
                  onChange={e => updateRound(i, "score2", e.target.value)}
                  className="text-center text-xl font-bold"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          </div>
        );
      })}
    </div>
  );
}
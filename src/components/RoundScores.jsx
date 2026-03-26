import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RoundScores({ rounds, onChange, team1, team2 }) {
  const updateRound = (index, field, value) => {
    const updated = rounds.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {rounds.map((round, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Round {i + 1}</p>
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
        </div>
      ))}
    </div>
  );
}
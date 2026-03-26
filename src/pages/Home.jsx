import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";

export default function Home() {
  const [netNumber, setNetNumber] = useState("");
  const [gameNumber, setGameNumber] = useState("");
  const [gameDetails, setGameDetails] = useState(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFetchGame = async () => {
    if (!netNumber || !gameNumber) {
      toast.error("Please select both Net and Game number.");
      return;
    }
    setLoading(true);
    setGameDetails(null);
    setScore1("");
    setScore2("");
    setSubmitted(false);
    const res = await base44.functions.invoke("getGameDetails", { netNumber, gameNumber });
    setLoading(false);
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      setGameDetails(res.data);
    }
  };

  const handleSubmit = async () => {
    if (score1 === "" || score2 === "") {
      toast.error("Please enter scores for both teams.");
      return;
    }
    setSubmitting(true);
    const res = await base44.functions.invoke("submitScore", {
      netNumber: gameDetails.net,
      gameNumber: gameDetails.game,
      team1: gameDetails.team1,
      team2: gameDetails.team2,
      score1: Number(score1),
      score2: Number(score2),
    });
    setSubmitting(false);
    if (res.data?.success) {
      toast.success("Scores submitted successfully!");
      setSubmitted(true);
    } else {
      toast.error("Failed to submit scores. Please try again.");
    }
  };

  const handleReset = () => {
    setNetNumber("");
    setGameNumber("");
    setGameDetails(null);
    setScore1("");
    setScore2("");
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Score Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Net & Game Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Net Number</Label>
              <Select value={netNumber} onValueChange={setNetNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Net..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Net {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Game Number</Label>
              <Select value={gameNumber} onValueChange={setGameNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Game..." />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map(g => (
                    <SelectItem key={g} value={String(g)}>Game {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" onClick={handleFetchGame} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Loading..." : "Find Game"}
          </Button>

          {/* Game Details & Score Entry */}
          {gameDetails && !submitted && (
            <div className="space-y-5 border-t pt-5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Net {gameDetails.net} · Game {gameDetails.game}</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-lg font-bold text-blue-600">{gameDetails.team1}</span>
                  <span className="text-muted-foreground font-semibold">VS</span>
                  <span className="text-lg font-bold text-red-600">{gameDetails.team2}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-blue-600">{gameDetails.team1} Score</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={score1}
                    onChange={e => setScore1(e.target.value)}
                    className="text-center text-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-red-600">{gameDetails.team2} Score</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={score2}
                    onChange={e => setScore2(e.target.value)}
                    className="text-center text-xl font-bold"
                  />
                </div>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? "Submitting..." : "Submit Scores"}
              </Button>
            </div>
          )}

          {/* Success State */}
          {submitted && (
            <div className="border-t pt-5 text-center space-y-3">
              <p className="text-green-600 font-semibold text-lg">✅ Scores Saved!</p>
              <p className="text-sm text-muted-foreground">
                {gameDetails.team1} <span className="font-bold">{score1}</span> — <span className="font-bold">{score2}</span> {gameDetails.team2}
              </p>
              <Button variant="outline" className="w-full" onClick={handleReset}>Enter Another Score</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
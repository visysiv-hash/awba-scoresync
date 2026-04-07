import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import RoundScores from "./RoundScores";

const emptyRounds = () => [{ score1: "", score2: "", }, { score1: "", score2: "" }];

function isScoreEntryAllowed() {
  // Australia/Sydney time
  const now = new Date();
  const sydney = new Date(now.toLocaleString("en-AU", { timeZone: "Australia/Sydney" }));
  const day = sydney.getDay(); // 2 = Tuesday
  const hour = sydney.getHours();
  const minute = sydney.getMinutes();
  return day === 2 && (hour > 19 || (hour === 19 && minute >= 30));
}

export default function ScoreEntry({ prefilledGame, onPrefilledUsed }) {
  const [netNumber, setNetNumber] = useState("");
  const [gameNumber, setGameNumber] = useState("");
  const [gameDetails, setGameDetails] = useState(null);
  const [rounds, setRounds] = useState(emptyRounds());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [restrictionEnabled, setRestrictionEnabled] = useState(() => {
    const stored = localStorage.getItem("scoreEntryRestriction");
    return stored === null ? true : stored === "true";
  });
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  const handleHiddenTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setRestrictionEnabled(prev => {
        const next = !prev;
        localStorage.setItem("scoreEntryRestriction", String(next));
        toast.info(next ? "⏰ Time restriction ON" : "🔓 Time restriction OFF");
        return next;
      });
    }
  };

  const allowed = !restrictionEnabled || isScoreEntryAllowed();

  // Load prefilled game from search
  useEffect(() => {
    if (prefilledGame) {
      setNetNumber(String(prefilledGame.net));
      setGameNumber(String(prefilledGame.game));
      setGameDetails(prefilledGame);
      setRounds(emptyRounds());
      setSubmitted(false);
      onPrefilledUsed?.();
    }
  }, [prefilledGame]);

  const handleFetchGame = async () => {
    if (!netNumber || !gameNumber) {
      toast.error("Please select both Net and Game number.");
      return;
    }
    setLoading(true);
    setGameDetails(null);
    setRounds(emptyRounds());
    setSubmitted(false);
    const res = await base44.functions.invoke("getGameDetails", { netNumber, gameNumber });
    setLoading(false);
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      setGameDetails(res.data);
    }
  };

  const validateRounds = () => {
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const s1 = Number(r.score1);
      const s2 = Number(r.score2);
      if (r.score1 === "" || r.score2 === "") {
        toast.error(`Please enter scores for both teams in Game ${i + 1}.`);
        return false;
      }
      if (s1 > 21 || s2 > 21) {
        toast.error(`Game ${i + 1}: Maximum score is 21.`);
        return false;
      }
      if (s1 === 21 && s2 === 21) {
        toast.error(`Game ${i + 1}: Only one team can score 21.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateRounds()) return;
    setSubmitting(true);
    const total1 = rounds.reduce((sum, r) => sum + Number(r.score1), 0);
    const total2 = rounds.reduce((sum, r) => sum + Number(r.score2), 0);
    const res = await base44.functions.invoke("submitScore", {
      netNumber: gameDetails.net,
      gameNumber: gameDetails.game,
      team1: gameDetails.team1,
      team2: gameDetails.team2,
      rounds,
      total1,
      total2,
    });
    setSubmitting(false);
    if (res.data?.success) {
      const t1 = rounds.reduce((s, r) => s + Number(r.score1), 0);
      const t2 = rounds.reduce((s, r) => s + Number(r.score2), 0);
      toast.success(`✅ ${gameDetails.team1} ${t1} – ${t2} ${gameDetails.team2}`, { description: "Scores saved successfully!" });
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ["#16a34a", "#2563eb", "#f59e0b", "#dc2626"] });
    } else {
      toast.error(res.data?.error || "Failed to submit scores. Please try again.");
    }
  };

  const handleReset = () => {
    setNetNumber("");
    setGameNumber("");
    setGameDetails(null);
    setRounds(emptyRounds());
    setSubmitted(false);
  };

  return (
    <Card className="shadow-2xl">
      <CardContent className="pt-6 space-y-5">
        {/* Hidden tap target on the card top edge */}
        <div className="absolute top-0 left-0 w-full h-1 cursor-default" onClick={handleHiddenTap} />

        {!allowed && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center space-y-1">
            <p className="text-amber-700 font-semibold text-sm">⏰ Score entry opens Tuesday at 7:30 PM</p>
            <p className="text-amber-600 text-xs">Please return after league play has started.</p>
          </div>
        )}

        {allowed && (
          <div className="space-y-5">

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
            <Label>Match Number</Label>
            <Select value={gameNumber} onValueChange={setGameNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Match..." />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3].map(g => (
                  <SelectItem key={g} value={String(g)}>Match {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="w-full" onClick={handleFetchGame} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {loading ? "Loading..." : "Find Match"}
        </Button>

        {gameDetails && !submitted && (
          <div className="space-y-5 border-t pt-5">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Net {gameDetails.net} · Match {gameDetails.game}</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-lg font-bold text-blue-600">{gameDetails.team1}</span>
                <span className="text-muted-foreground font-semibold">VS</span>
                <span className="text-lg font-bold text-red-600">{gameDetails.team2}</span>
              </div>
            </div>

            <RoundScores rounds={rounds} onChange={setRounds} team1={gameDetails.team1} team2={gameDetails.team2} />

            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {submitting ? "Submitting..." : "Submit Scores"}
            </Button>
          </div>
        )}

        {submitted && (
          <div className="border-t pt-5 text-center space-y-3">
            <p className="text-green-600 font-semibold text-lg">✅ Scores Saved!</p>
            <div className="text-sm text-muted-foreground space-y-1">
              {rounds.map((r, i) => (
                <p key={i}>Game {i + 1}: <span className="font-bold">{r.score1}</span> – <span className="font-bold">{r.score2}</span></p>
              ))}
              <p className="font-semibold mt-2">
                Total: {gameDetails.team1} <span className="font-bold">{rounds.reduce((s, r) => s + Number(r.score1), 0)}</span>
                {" – "}
                <span className="font-bold">{rounds.reduce((s, r) => s + Number(r.score2), 0)}</span> {gameDetails.team2}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleReset}>Enter Another Score</Button>
          </div>
        )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
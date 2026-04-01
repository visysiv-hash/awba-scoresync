import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw } from "lucide-react";

export default function PairingTool() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [available, setAvailable] = useState(new Set());
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getAllPlayers", {});
      setAllPlayers(res.data?.players || []);
    } catch (error) {
      console.error("Failed to load players:", error);
    }
    setLoading(false);
  };

  const togglePlayer = (name) => {
    const newSet = new Set(available);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setAvailable(newSet);
  };

  const generatePairings = async () => {
    const availableList = Array.from(available);
    if (availableList.length < 4) {
      alert("Need at least 4 available players to generate matches");
      return;
    }

    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generatePairings", {
        availablePlayers: availableList,
      });
      setMatches(res.data?.matches || []);
    } catch (error) {
      console.error("Failed to generate pairings:", error);
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🎯 Match Pairing Tool</h1>
          <p className="text-slate-300">Select available players and generate optimal 2v2 pairings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Player Selection */}
          <div className="lg:col-span-1">
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Players
                  <span className="text-sm font-normal text-muted-foreground">
                    {available.size}/{allPlayers.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  allPlayers.map((player) => (
                    <div key={player} className="flex items-center gap-2">
                      <Checkbox
                        checked={available.has(player)}
                        onCheckedChange={() => togglePlayer(player)}
                        id={player}
                      />
                      <label
                        htmlFor={player}
                        className="text-sm cursor-pointer flex-1 truncate"
                      >
                        {player}
                      </label>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Button
              onClick={generatePairings}
              disabled={available.size < 4 || generating}
              className="w-full mt-4"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Pairings
                </>
              )}
            </Button>
          </div>

          {/* Right: Generated Matches */}
          <div className="lg:col-span-2">
            <Card className="shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg">
                  Generated Matches ({matches.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matches.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Select players and click "Generate Pairings" to see matches
                  </p>
                ) : (
                  matches.map((match, i) => (
                    <div
                      key={i}
                      className="border rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition"
                    >
                      <p className="text-xs text-muted-foreground mb-2">Match {i + 1}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {match.team1[0]} & {match.team1[1]}
                          </p>
                          <p className="text-xs text-muted-foreground">Team 1</p>
                        </div>
                        <div className="text-center text-lg font-bold text-slate-400 px-4">
                          vs
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-semibold text-sm">
                            {match.team2[0]} & {match.team2[1]}
                          </p>
                          <p className="text-xs text-muted-foreground">Team 2</p>
                        </div>
                      </div>
                      {match.reasoning && (
                        <p className="text-xs text-slate-500 mt-2 pt-2 border-t">
                          💡 {match.reasoning}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
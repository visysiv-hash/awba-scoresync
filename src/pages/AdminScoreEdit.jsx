import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import RoundScores from "../components/RoundScores";
import AdminPinGate from "../components/AdminPinGate";

export default function AdminScoreEdit() {
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("adminPinUnlocked") === "true");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editRounds, setEditRounds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const loadGames = async () => {
    setLoading(true);
    const res = await base44.functions.invoke("getAllGames", {});
    setLoading(false);
    const scored = (res.data?.games || []).filter(g => g.scored);
    setGames(scored);
  };

  useEffect(() => { if (pinUnlocked) loadGames(); }, [pinUnlocked]);

  const startEdit = (g) => {
    setEditingKey(`${g.net}-${g.game}`);
    setEditRounds(g.rounds.map(r => ({ ...r })));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditRounds([]);
  };

  const saveEdit = async (g) => {
    setSaving(true);
    const res = await base44.functions.invoke("updateScore", {
      net: g.net,
      game: g.game,
      rounds: editRounds,
    });
    setSaving(false);
    if (res.data?.success) {
      toast.success("Score updated successfully!");
      setEditingKey(null);
      loadGames();
    } else {
      toast.error(res.data?.error || "Failed to update score.");
    }
  };

  if (!pinUnlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <AdminPinGate
        onSuccess={() => { setPinUnlocked(true); loadGames(); }}
        onCancel={() => window.history.back()}
      />
    </div>
  );

  const filtered = games.filter(g =>
    !filter ||
    g.team1.toLowerCase().includes(filter.toLowerCase()) ||
    g.team2.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Edit Scores</h1>
          <p className="text-slate-400 text-sm">Correct previously submitted scores</p>
        </div>

        <input
          className="w-full h-9 rounded-md border border-input bg-white/10 text-white placeholder:text-slate-400 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-white/50"
          placeholder="Filter by player name..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No scored games found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((g) => {
              const key = `${g.net}-${g.game}`;
              const isEditing = editingKey === key;
              const total1 = isEditing
                ? editRounds.reduce((s, r) => s + Number(r.score1 || 0), 0)
                : Number(g.total1);
              const total2 = isEditing
                ? editRounds.reduce((s, r) => s + Number(r.score2 || 0), 0)
                : Number(g.total2);

              return (
                <Card key={key} className={isEditing ? "ring-2 ring-blue-500" : ""}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Net {g.net} · Match {g.game}</span>
                      {!isEditing ? (
                        <Button size="sm" variant="outline" onClick={() => startEdit(g)} className="gap-1 text-xs h-7">
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1 text-xs h-7" disabled={saving}>
                            <X className="w-3 h-3" /> Cancel
                          </Button>
                          <Button size="sm" className="gap-1 text-xs h-7 bg-green-600 hover:bg-green-700" onClick={() => saveEdit(g)} disabled={saving}>
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600 text-sm">{g.team1}</span>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{total1} – {total2}</div>
                      </div>
                      <span className="font-bold text-red-600 text-sm">{g.team2}</span>
                    </div>

                    {isEditing ? (
                      <RoundScores rounds={editRounds} onChange={setEditRounds} team1={g.team1} team2={g.team2} />
                    ) : (
                      <div className="text-xs text-muted-foreground text-center space-y-0.5">
                        {g.rounds?.map((r, ri) => (
                          <div key={ri}>G{ri + 1}: {r.score1} – {r.score2}</div>
                        ))}
                        {g.timestamp && <div className="mt-1">{new Date(g.timestamp).toLocaleString()}</div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
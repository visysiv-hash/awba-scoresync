import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2 } from "lucide-react";

export default function PlayerPairingModal({ player, groupName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPairings = async () => {
      try {
        const res = await base44.functions.invoke("getPlayerPairings", { player, group: groupName });
        setData(res.data);
      } catch (error) {
        console.error("Error loading pairings:", error);
      }
      setLoading(false);
    };
    loadPairings();
  }, [player, groupName]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{player} — Pairing History</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              Partners ({data?.totalPartners || 0})
            </p>
            <div className="space-y-1 bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              {data?.partners?.length > 0 ? (
                data.partners.map((p, i) => (
                  <p key={i} className="text-sm text-slate-700">• {p.name} <span className="text-xs text-muted-foreground">({p.count}x)</span></p>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No partners yet</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">
              Opponents ({data?.totalOpponents || 0})
            </p>
            <div className="space-y-1 bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              {data?.opponents?.length > 0 ? (
                data.opponents.map((o, i) => (
                  <p key={i} className="text-sm text-slate-700">• {o.name} <span className="text-xs text-muted-foreground">({o.count}x)</span></p>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No opponents yet</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Haven't Partnered With</p>
            <div className="space-y-2">
              {Object.entries(data?.missingPartners || {}).length > 0 ? (
                Object.entries(data.missingPartners).map(([groupNum, players]) => (
                  <div key={groupNum}>
                    <p className="text-xs text-muted-foreground font-semibold">Group {groupNum}</p>
                    <div className="space-y-1 bg-red-50 rounded-lg p-2 max-h-24 overflow-y-auto">
                      {players.map((p, i) => (
                        <p key={i} className="text-xs text-slate-700">• {p}</p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Partnered with everyone!</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-2">Haven't Played Against</p>
            <div className="space-y-2">
              {Object.entries(data?.missingOpponents || {}).length > 0 ? (
                Object.entries(data.missingOpponents).map(([groupNum, players]) => (
                  <div key={groupNum}>
                    <p className="text-xs text-muted-foreground font-semibold">Group {groupNum}</p>
                    <div className="space-y-1 bg-blue-50 rounded-lg p-2 max-h-24 overflow-y-auto">
                      {players.map((p, i) => (
                        <p key={i} className="text-xs text-slate-700">• {p}</p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Played against everyone!</p>
              )}
            </div>
          </div>
          </CardContent>
          </Card>
          </div>
          );
          }
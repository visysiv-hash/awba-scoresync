import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Swords } from "lucide-react";
import SuggestedSchedule from "../SuggestedSchedule";

// App-only scheduling: players come from today's bookings in the app and the
// draw is generated here, leaving the spreadsheet untouched.
export default function AppDrawPanel({ players, onLoadPlayers, loading }) {
  const [showDraw, setShowDraw] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        onClick={onLoadPlayers}
        disabled={loading}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {loading ? "Loading today's bookings…" : "Load today's app bookings"}
      </Button>

      <Button
        onClick={() => setShowDraw((s) => !s)}
        className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold"
      >
        <Swords className="w-4 h-4 mr-2" />
        {showDraw ? "Hide app draw" : "Show app draw"}
      </Button>

      {showDraw && <SuggestedSchedule players={players} />}
    </div>
  );
}
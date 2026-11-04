import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getCurrentPlayerName } from "@/lib/currentMember";
import PageBanner from "@/components/PageBanner";
import WrappedHero from "@/components/wrapped/WrappedHero";
import WrappedTrend from "@/components/wrapped/WrappedTrend";
import WrappedBadges from "@/components/wrapped/WrappedBadges";
import WrappedPartners from "@/components/wrapped/WrappedPartners";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SeasonWrapped() {
  const navigate = useNavigate();
  const requested = new URLSearchParams(window.location.search).get("name");
  const player = requested || getCurrentPlayerName();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setData(null);
    base44.functions
      .invoke("getSeasonWrapped", { player })
      .then((res) => alive && setData(res.data || null))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [player]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-24">
      <div className="mx-auto max-w-lg">
        <PageBanner className="h-14 mb-3" />

        <div className="mb-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-white">Season Wrapped</h2>
            <p className="text-[11px] text-slate-400">Your season in one card</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
          </div>
        ) : !data?.found ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
            <p className="text-sm text-slate-300">No games found for {player || "you"} yet this season.</p>
            <p className="mt-1 text-xs text-slate-500">
              Play a night and the wrap fills in from your results.
            </p>
            <Link to="/bookings" className="mt-3 inline-block text-xs font-bold text-yellow-400 hover:underline">
              Book a session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <WrappedHero data={data} />
            <WrappedTrend trend={data.trend} rating={data.rating} />
            <WrappedBadges badges={data.badges} />
            <WrappedPartners
              partners={data.partners}
              bigWin={data.bigWin}
              bestNight={data.bestNight}
              totals={data.totals}
              opponentCount={data.opponentCount}
            />
            {data.totals.bestStreak > 1 && (
              <p className="px-1 text-[11px] text-slate-400">
                Longest winning run: {data.totals.bestStreak} games · averaging {data.totals.avgPoints} points a game
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
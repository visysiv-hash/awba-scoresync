import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageBanner from "@/components/PageBanner";
import BandBlockCard from "@/components/ratings/BandBlockCard";
import RatingAnchorList from "@/components/ratings/RatingAnchorList";
import { VENUES, buildBands, blocksFor, spotsFor, anchorChanges } from "@/lib/ratingBands";
import { ArrowLeft, FlaskConical, Loader2 } from "lucide-react";

// A dry run of the rating model on the real ladder. Nothing is saved, no draw is
// changed and no base group is touched — it only shows what the numbers would give.
export default function RatingPreview() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState(VENUES[0].id);

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke("getAppRatings", {})
      .then((res) => alive && setPlayers((res.data || {}).players || []))
      .catch(() => alive && setPlayers([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const venue = VENUES.find((v) => v.id === venueId) || VENUES[0];
  const bands = useMemo(() => buildBands(players), [players]);
  const anchors = useMemo(() => anchorChanges(players), [players]);
  const capacity = blocksFor(venue);
  const playing = bands.filter((b) => b.index <= capacity);
  const waiting = bands.length - playing.length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
      <div className="max-w-5xl mx-auto space-y-4">
        <PageBanner className="h-14 mb-2" />

        <div className="flex items-center gap-3 pt-1">
          <Link
            to="/ratings/app"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </Link>
          <FlaskConical className="w-6 h-6 text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Rating model preview</h1>
            <p className="text-[11px] text-slate-400">A dry run — nothing here is saved</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-300 bg-yellow-500/10 border border-yellow-400/30 rounded-lg px-3 py-2 leading-snug">
          This runs the proposed model over your live ratings. It changes no base group, no draw and no
          score. Blocks are cut at the widest rating gap nearby, so equal players stay together.
        </p>

        <div className="flex gap-2">
          {VENUES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVenueId(v.id)}
              className={`flex-1 rounded-lg border px-3 py-2 text-left transition-colors ${
                v.id === venue.id
                  ? "bg-yellow-500/15 border-yellow-400/50"
                  : "bg-slate-800 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <p className="text-xs font-bold">{v.name}</p>
              <p className="text-[10px] text-slate-400">
                {v.day} · {v.nets} nets · {spotsFor(v)} players
              </p>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Spots", spotsFor(venue)],
                ["Blocks playing", capacity],
                ["Blocks waiting", Math.max(0, waiting)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="text-lg font-bold text-yellow-400">{value}</p>
                </div>
              ))}
            </div>

            <h2 className="text-xs font-bold text-slate-300 pt-1">
              Half-step anchors <span className="text-slate-500 font-normal">({anchors.length} would move)</span>
            </h2>
            <RatingAnchorList rows={anchors} />

            <h2 className="text-xs font-bold text-slate-300 pt-1">
              Blocks at {venue.nets} nets{" "}
              <span className="text-slate-500 font-normal">
                (first {capacity} play, {Math.max(0, waiting)} blocks below wait)
              </span>
            </h2>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {bands.map((band) => (
                <BandBlockCard key={band.index} band={band} inVenue={band.index <= capacity} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
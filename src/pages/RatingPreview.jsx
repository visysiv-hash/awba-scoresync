import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageBanner from "@/components/PageBanner";
import BandBlockCard from "@/components/ratings/BandBlockCard";
import RatingAnchorList from "@/components/ratings/RatingAnchorList";
import BaseGroupCheckList from "@/components/ratings/BaseGroupCheckList";
import NightPicker from "@/components/ratings/NightPicker";
import { buildBands, blocksFor, spotsFor, anchorChanges, baseGroupChecks, BLOCK_SIZE, VENUES } from "@/lib/ratingBands";
import { lookupName } from "@/lib/nameMatch";
import { todayIso } from "@/lib/nightDraw";
import { ArrowLeft, FlaskConical, Loader2 } from "lucide-react";

// A dry run of the rating model on a real night. Blocks are built only from the
// players who booked that night — the rest of the roster is not playing, so they
// are not in a block. Nothing here is saved.
export default function RatingPreview() {
  const [players, setPlayers] = useState([]);
  const [manualGroups, setManualGroups] = useState({});
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingNight, setLoadingNight] = useState(false);

  useEffect(() => {
    let alive = true;
    base44.functions
      .invoke("getAppRatings", {})
      .then((res) => {
        if (!alive) return;
        const data = res.data || {};
        setPlayers(data.players || []);
        setManualGroups(data.baseGroups || {});
      })
      .catch(() => alive && setPlayers([]))
      .finally(() => alive && setLoading(false));

    base44.entities.Session.list({ sort: "date", limit: 60 })
      .then((page) => {
        if (!alive) return;
        const today = todayIso();
        const upcoming = (page.items || []).filter((s) => s.date && s.date >= today).slice(0, 6);
        setSessions(upcoming);
        setSessionId((current) => current || upcoming[0]?.id || null);
      })
      .catch(() => alive && setSessions([]));

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    setLoadingNight(true);
    base44.entities.Booking.filter({ session_id: sessionId, status: "confirmed" }, { limit: 80 })
      .then((page) => alive && setBookings(page.items || []))
      .catch(() => alive && setBookings([]))
      .finally(() => alive && setLoadingNight(false));
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const session = sessions.find((s) => s.id === sessionId) || null;
  const spots = session?.max_spots || 0;

  const ratingByName = useMemo(() => {
    const map = {};
    for (const p of players) map[String(p.player || "").trim().toLowerCase()] = p;
    return map;
  }, [players]);

  // Booked players, matched to their rating. Anyone booked without a rating yet is
  // listed by name rather than silently dropped from the night.
  const { bookedPlayers, unrated } = useMemo(() => {
    const seen = new Set();
    const list = [];
    const missing = [];
    for (const booking of bookings) {
      const key = String(booking.user_name || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const row = lookupName(ratingByName, booking.user_name);
      if (row) list.push(row);
      else missing.push(booking.user_name);
    }
    return { bookedPlayers: list, unrated: missing };
  }, [bookings, ratingByName]);

  const bands = useMemo(() => buildBands(bookedPlayers), [bookedPlayers]);
  const anchors = useMemo(() => anchorChanges(bookedPlayers), [bookedPlayers]);
  const checks = useMemo(() => baseGroupChecks(players, manualGroups), [players, manualGroups]);

  // A block of eight is two nets: whoever fits in the booked nets plays, and any
  // leftover players rest.
  const canPlay = spots ? Math.min(bookedPlayers.length, spots) : bookedPlayers.length;
  const playingBlocks = Math.floor(canPlay / BLOCK_SIZE);
  const resting = bands
    .filter((b) => b.index > playingBlocks)
    .flatMap((b) => b.players);

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
          Blocks are built from the players who booked the chosen night, not the whole roster — only the
          people in the nets play. Blocks are cut at the widest rating gap nearby, so equal players stay
          together. Nothing is saved.
        </p>

        <NightPicker sessions={sessions} value={sessionId} onChange={setSessionId} />

        {loading || loadingNight ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Booked", bookedPlayers.length],
                ["Spots", spots || "—"],
                ["Blocks playing", playingBlocks],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="text-lg font-bold text-yellow-400">{value}</p>
                </div>
              ))}
            </div>

            <h2 className="text-xs font-bold text-slate-300 pt-1">
              Blocks for this night{" "}
              <span className="text-slate-500 font-normal">
                {session ? `${session.title || "Session"} · ${spots} spots` : "no session chosen"}
              </span>
            </h2>
            {bands.length === 0 ? (
              <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                Nobody is booked for this night yet.
              </p>
            ) : (
              <>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {bands.map((band) => (
                    <BandBlockCard key={band.index} band={band} inVenue={band.index <= playingBlocks} />
                  ))}
                </div>
                {resting.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    Resting {resting.length}: {resting.map((p) => p.player).join(", ")} — no net left for them.
                  </p>
                )}
              </>
            )}
            {unrated.length > 0 && (
              <p className="text-[11px] text-amber-300">
                Booked with no rating yet: {unrated.join(", ")} — give them a base group to place them.
              </p>
            )}

            <h2 className="text-xs font-bold text-slate-300 pt-1">
              Manual base groups checked against history{" "}
              <span className="text-slate-500 font-normal">({checks.length} set by hand)</span>
            </h2>
            <BaseGroupCheckList rows={checks} />

            <h2 className="text-xs font-bold text-slate-300 pt-1">
              Half-step anchors <span className="text-slate-500 font-normal">(booked players, {anchors.length} would move)</span>
            </h2>
            <RatingAnchorList rows={anchors} />

            <p className="text-[10px] text-slate-500 pt-1">
              Venue capacity used: {VENUES.map((v) => `${v.name} ${spotsFor(v)} spots / ${blocksFor(v)} blocks`).join(" · ")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
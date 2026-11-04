import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Swords } from "lucide-react";
import { toast } from "sonner";
import { buildNightDraw, toRecord } from "@/lib/nightDraw";
import { memberGenders } from "@/lib/memberGenders";
import { memberDobs, isJunior } from "@/lib/memberDob";

// Builds the night's draw from a session's confirmed bookings (plus the waitlist
// when the admin allows it) and saves it to the Schedule for that session's date.
export default function SessionScheduleButton({ session, players }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const build = async () => {
    if (!players.length) {
      toast.error("No players to schedule.");
      return;
    }
    setBusy(true);
    try {
      const [res, genders, dobs] = await Promise.all([
        base44.functions.invoke("getAppRatings", {}),
        memberGenders().catch(() => ({})),
        memberDobs().catch(() => ({})),
      ]);
      const ratings = {};
      for (const p of res.data?.players || []) ratings[String(p.player).toLowerCase()] = p.rating;

      const list = players.map((name) => ({
        name,
        rating: ratings[String(name).toLowerCase()] ?? null,
        gender: genders[String(name).toLowerCase()] || null,
        junior: isJunior(dobs[String(name).trim().toLowerCase()]),
      }));
      const payload = toRecord(buildNightDraw(list), session.date, {
        title: session.title,
        time_label: [session.start_time, session.end_time].filter(Boolean).join(" – "),
      });

      const page = await base44.entities.DrawNight.filter({ date: session.date }, { limit: 1 });
      const existing = (page.items || [])[0];
      if (existing) await base44.entities.DrawNight.update(existing.id, payload);
      else await base44.entities.DrawNight.create(payload);

      toast.success("Draw created — opening the Schedule.");
      navigate(`/schedule?date=${session.date}`);
    } catch (e) {
      toast.error("Couldn't create the draw.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1"
      onClick={build}
      disabled={busy || players.length === 0}
      title="Generate the night's groups, courts and pairings from these bookings"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Swords className="w-3.5 h-3.5" />}
      Schedule
    </Button>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageBanner from "@/components/PageBanner";
import AdminPinGate from "@/components/AdminPinGate";
import BaseGroupRow from "@/components/ratings/BaseGroupRow";
import { isAdminUnlocked } from "@/lib/adminUnlock";
import { saveBaseGroup } from "@/lib/baseGroups";
import { lookupName } from "@/lib/nameMatch";
import { ArrowLeft, Layers, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

// Base groups on their own page: every rated player and every member, so a wrong
// starting group can be reassigned without touching the App Ratings list.
export default function BaseGroups() {
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);
  const [players, setPlayers] = useState([]);
  const [baseGroups, setBaseGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    Promise.all([
      base44.functions.invoke("getAppRatings", {}).then((res) => res.data || {}).catch(() => ({})),
      base44.functions.invoke("getMemberRoster", {}).then((res) => res.data?.roster || []).catch(() => []),
    ])
      .then(([ratings, roster]) => {
        if (!alive) return;
        const rated = ratings.players || [];
        setBaseGroups(ratings.baseGroups || {});
        const seen = new Map(rated.map((p) => [String(p.player).trim().toLowerCase(), p]));
        const rows = [...rated];
        for (const member of roster) {
          const name = String(member.display_name || "").trim();
          if (!name || lookupName(seen, name) !== undefined) continue;
          rows.push({ player: name, rating: null, currentGroup: null });
        }
        rows.sort((a, b) => String(a.player).localeCompare(String(b.player)));
        setPlayers(rows);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [unlocked]);

  const assign = async (player, value) => {
    setSaving(player);
    try {
      await saveBaseGroup(player, value);
      const key = String(player).trim().toLowerCase();
      setBaseGroups((prev) => {
        const next = { ...prev };
        if (value) next[key] = Number(value);
        else delete next[key];
        return next;
      });
      toast.success(value ? `${player} starts from Group ${value}.` : `${player} uses their first group.`);
    } catch {
      toast.error("Couldn't save that base group.");
    } finally {
      setSaving(null);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AdminPinGate onSuccess={() => setUnlocked(true)} onCancel={() => window.history.back()} />
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const list = q ? players.filter((p) => String(p.player).toLowerCase().includes(q)) : players;
  const fixedCount = players.filter((p) => lookupName(baseGroups, p.player) != null).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4">
        <PageBanner className="h-14 mb-2" />

        <div className="flex items-center gap-3 pt-1">
          <Link to="/ratings/app" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </Link>
          <Layers className="w-6 h-6 text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Base Groups</h1>
            <p className="text-[11px] text-slate-400">Where each player's rating starts</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2 leading-snug">
          Auto uses the group the player was first placed in. Pick a number to fix where their rating starts.
          {fixedCount > 0 && <span className="text-amber-300"> {fixedCount} adjusted.</span>}
        </p>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a player..."
            className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 pl-8 pr-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 text-center">
            <p className="text-sm text-slate-300">{players.length ? "No player matches that name." : "No members to show."}</p>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/60 overflow-hidden">
            {list.map((p) => (
              <BaseGroupRow
                key={p.player}
                player={p.player}
                rating={p.rating}
                currentGroup={p.currentGroup}
                baseGroup={lookupName(baseGroups, p.player) ?? null}
                saving={saving === p.player}
                onSave={(value) => assign(p.player, value)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
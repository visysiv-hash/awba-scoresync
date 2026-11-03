import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "../components/AdminPinGate";
import PageBanner from "../components/PageBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminMembers() {
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter(m =>
        [m.display_name, m.full_name, m.email, m.phone, m.mobile, m.bv_member]
          .some(v => String(v || "").toLowerCase().includes(q))
      )
    : members;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getMemberData", {});
      setMembers(res.data?.members || []);
    } catch (e) {
      toast.error("Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (pinUnlocked) loadData(); }, [pinUnlocked]);

  const updateMember = async (m, changes) => {
    setBusyId(m.id);
    try {
      if ("is_admin" in changes) {
        await base44.functions.invoke("setMemberAdmin", { member_id: m.id, is_admin: changes.is_admin });
        toast.success(`${m.display_name} ${changes.is_admin ? "is now an admin" : "is no longer an admin"}.`);
      } else {
        await base44.functions.invoke("markMemberPaid", { member_id: m.id, paid: changes.paid });
        toast.success(changes.paid ? "Marked as paid." : "Marked as unpaid.");
      }
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, ...changes } : x));
    } catch (e) {
      toast.error("Failed to update member.");
    } finally {
      setBusyId(null);
    }
  };

  if (!pinUnlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <AdminPinGate
        onSuccess={() => { setPinUnlocked(true); loadData(); }}
        onCancel={() => window.history.back()}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6 pt-2">
          <PageBanner className="h-14 mb-2" />
          <h1 className="text-2xl font-bold text-white">Member List</h1>
        </div>

        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 shrink-0">{filtered.length} of {members.length}</Badge>
            <Badge variant="outline" className="text-white border-white/30 bg-white/10 shrink-0">{members.filter(m => m.is_admin).length} admins</Badge>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search any field…"
              className="pl-8 h-9 bg-white"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>
        ) : members.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No members found.</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No members match "{query}".</CardContent></Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/20 bg-white shadow-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">Display name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">Full name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">Phone</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">BV Member</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b whitespace-nowrap">Paid</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b whitespace-nowrap">Admin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                    <td className="px-3 py-2 text-slate-400 border-b">{i + 1}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap font-medium text-slate-800">{m.display_name}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap text-slate-700">{m.full_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap text-slate-700">{m.email || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap text-slate-700">{m.phone || m.mobile || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap text-slate-700">{m.bv_member || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 border-b whitespace-nowrap">
                      {m.paid ? (
                        <button onClick={() => updateMember(m, { paid: false })} disabled={busyId === m.id}>
                          <Badge className="bg-green-600 text-white">✓ Paid</Badge>
                        </button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => updateMember(m, { paid: true })}>
                          {busyId === m.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Mark paid
                        </Button>
                      )}
                    </td>
                    <td className="px-3 py-2 border-b whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={m.is_admin}
                          disabled={busyId === m.id}
                          onCheckedChange={(checked) => updateMember(m, { is_admin: checked })}
                        />
                        <span className={`text-xs ${m.is_admin ? "text-slate-800 font-semibold" : "text-slate-400"}`}>
                          {m.is_admin ? "Admin" : "Member"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
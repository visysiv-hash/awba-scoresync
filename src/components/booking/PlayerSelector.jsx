import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, Search } from "lucide-react";

export default function PlayerSelector({ onSelect, onClose }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Show cached roster instantly for repeat opens
    try {
      const cached = JSON.parse(localStorage.getItem("awba_roster") || "null");
      if (cached && cached.length) {
        setRoster(cached);
        setLoading(false);
      }
    } catch {}

    const load = async () => {
      try {
        const res = await base44.functions.invoke("getMemberRoster", {});
        const r = res.data?.roster || [];
        setRoster(r);
        localStorage.setItem("awba_roster", JSON.stringify(r));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const q = query.toLowerCase();
  const filtered = roster
    .filter(m => m.display_name.toLowerCase().includes(q) || m.full_name.toLowerCase().includes(q))
    .slice(0, 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Select your name</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Choose your name from the list. We'll remember it on this device for next time.</p>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search your name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No matches found.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {filtered.map(m => (
              <button
                key={m.email}
                onClick={() => onSelect({ name: m.display_name, email: m.email })}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-sm"
              >
                <span className="font-semibold">{m.display_name}</span>
                <span className="text-muted-foreground ml-2 text-xs">{m.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
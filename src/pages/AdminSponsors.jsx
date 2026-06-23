import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import AdminPinGate from "../components/AdminPinGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";

const emptyForm = () => ({
  name: "",
  logo_url: "",
  website_url: "",
  display_order: 0,
  active: true,
});

export default function AdminSponsors() {
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("adminPinUnlocked") === "true");
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const all = await base44.entities.Sponsor.list("display_order", 100);
    setSponsors(all);
    setLoading(false);
  };

  useEffect(() => { if (pinUnlocked) loadData(); }, [pinUnlocked]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setUploading(false);
    toast.success("Logo uploaded!");
  };

  const startEdit = (sponsor) => {
    setForm({
      name: sponsor.name,
      logo_url: sponsor.logo_url || "",
      website_url: sponsor.website_url || "",
      display_order: sponsor.display_order || 0,
      active: sponsor.active !== false,
    });
    setEditingId(sponsor.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    if (editingId) {
      const updated = await base44.entities.Sponsor.update(editingId, form);
      setSponsors(prev => prev.map(s => s.id === editingId ? updated : s));
      toast.success("Sponsor updated!");
    } else {
      const created = await base44.entities.Sponsor.create(form);
      setSponsors(prev => [...prev, created].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      toast.success("Sponsor added!");
    }
    setSaving(false);
    cancelForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sponsor?")) return;
    await base44.entities.Sponsor.delete(id);
    setSponsors(prev => prev.filter(s => s.id !== id));
    toast.success("Sponsor deleted.");
  };

  const toggleActive = async (sponsor) => {
    const updated = await base44.entities.Sponsor.update(sponsor.id, { active: !sponsor.active });
    setSponsors(prev => prev.map(s => s.id === sponsor.id ? updated : s));
  };

  if (!pinUnlocked) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <AdminPinGate
        onSuccess={() => { setPinUnlocked(true); loadData(); }}
        onCancel={() => window.history.back()}
      />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 pt-2">
          <h1 className="text-2xl font-bold text-white">Manage Sponsors</h1>
          <p className="text-slate-400 text-sm mt-1">Add and manage sponsor logos</p>
        </div>

        <Button className="w-full mb-4" onClick={() => { cancelForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm && !editingId ? "Cancel" : "Add Sponsor"}
        </Button>

        {showForm && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1">
                <Label>Sponsor Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Acme Corp" />
              </div>

              <div className="space-y-1">
                <Label>Logo</Label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                <div className="flex gap-2 items-center">
                  <label htmlFor="logo-upload" className="cursor-pointer px-3 py-2 border rounded-md text-sm bg-background hover:bg-accent transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </label>
                  {form.logo_url && (
                    <img src={form.logo_url} alt="Logo preview" className="h-10 object-contain rounded border" />
                  )}
                </div>
                <Input
                  value={form.logo_url}
                  onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
                  placeholder="Or paste image URL..."
                  className="mt-1"
                />
              </div>

              <div className="space-y-1">
                <Label>Website URL</Label>
                <Input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))} placeholder="https://example.com" />
              </div>

              <div className="space-y-1">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))} placeholder="0" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
                <span className="text-sm">Active (visible to users)</span>
              </label>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={cancelForm}>Cancel</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? "Update" : "Add Sponsor"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {sponsors.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No sponsors yet.</CardContent></Card>
          )}
          {sponsors.map(sponsor => (
            <Card key={sponsor.id} className={`shadow-md ${!sponsor.active ? "opacity-50" : ""}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {sponsor.logo_url
                      ? <img src={sponsor.logo_url} alt={sponsor.name} className="h-10 w-16 object-contain rounded border bg-white p-1" />
                      : <div className="h-10 w-16 rounded border bg-slate-100 flex items-center justify-center text-xs text-slate-400">No logo</div>
                    }
                    <div>
                      <p className="font-semibold text-sm">{sponsor.name}</p>
                      <p className="text-xs text-muted-foreground">Order: {sponsor.display_order || 0} · {sponsor.active ? "Active" : "Hidden"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {sponsor.website_url && (
                      <a href={sponsor.website_url} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" className={`h-7 w-7 ${sponsor.active ? "text-green-600" : "text-slate-400"}`} onClick={() => toggleActive(sponsor)}>
                      <span className="text-xs font-bold">{sponsor.active ? "ON" : "OFF"}</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={() => startEdit(sponsor)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(sponsor.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Pin, Eye, EyeOff } from "lucide-react";
import ReactQuill from "react-quill";

const CATEGORIES = ["General", "Match Updates", "Events", "Announcements"];

const emptyForm = () => ({
  title: "",
  content: "",
  category: "General",
  pinned: false,
  published: false,
});

const categoryColors = {
  "General": "bg-slate-100 text-slate-700",
  "Match Updates": "bg-blue-100 text-blue-700",
  "Events": "bg-purple-100 text-purple-700",
  "Announcements": "bg-orange-100 text-orange-700",
};

export default function AdminNews() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (u?.role !== "admin") { setLoading(false); return; }
      const all = await base44.entities.NewsPost.list("-created_date", 200);
      setPosts(all);
      setLoading(false);
    };
    load();
  }, []);

  const startEdit = (post) => {
    setForm({
      title: post.title,
      content: post.content || "",
      category: post.category || "General",
      pinned: post.pinned || false,
      published: post.published || false,
    });
    setEditingId(post.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    if (editingId) {
      const updated = await base44.entities.NewsPost.update(editingId, form);
      setPosts(prev => prev.map(p => p.id === editingId ? updated : p));
      toast.success("Post updated!");
    } else {
      const created = await base44.entities.NewsPost.create(form);
      setPosts(prev => [created, ...prev]);
      toast.success("Post created!");
    }
    setSaving(false);
    cancelForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    await base44.entities.NewsPost.delete(id);
    setPosts(prev => prev.filter(p => p.id !== id));
    toast.success("Post deleted.");
  };

  const toggleField = async (post, field) => {
    const updated = await base44.entities.NewsPost.update(post.id, { [field]: !post[field] });
    setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  if (user?.role !== "admin") return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <p className="text-white">Access denied — admins only.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 pt-2">
          <h1 className="text-2xl font-bold text-white">Manage News</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage news posts</p>
        </div>

        <Button className="w-full mb-4" onClick={() => { cancelForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm && !editingId ? "Cancel" : "New Post"}
        </Button>

        {showForm && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Post title..." />
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setForm(p => ({ ...p, category: cat }))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${form.category === cat ? "bg-primary text-primary-foreground border-primary" : "border-input bg-background text-muted-foreground hover:border-primary"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Content</Label>
                <div className="rounded-md border bg-white min-h-[200px]">
                  <ReactQuill
                    theme="snow"
                    value={form.content}
                    onChange={val => setForm(p => ({ ...p, content: val }))}
                    placeholder="Write your post content here..."
                    style={{ minHeight: 180 }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.pinned} onChange={e => setForm(p => ({ ...p, pinned: e.target.checked }))} />
                  <span className="text-sm flex items-center gap-1"><Pin className="w-3.5 h-3.5" /> Pinned</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
                  <span className="text-sm flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Published</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={cancelForm}>Cancel</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? "Update Post" : "Create Post"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {posts.length === 0 && (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No posts yet.</CardContent></Card>
          )}
          {posts.map(post => (
            <Card key={post.id} className="shadow-md">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.pinned && <Pin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      <p className="font-semibold text-sm truncate">{post.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[post.category] || "bg-slate-100 text-slate-700"}`}>
                        {post.category}
                      </span>
                      {post.published
                        ? <Badge className="text-xs bg-green-100 text-green-700 border-green-300">Published</Badge>
                        : <Badge variant="outline" className="text-xs text-slate-500">Draft</Badge>
                      }
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className={`h-7 w-7 ${post.pinned ? "text-yellow-500" : "text-slate-400"}`} onClick={() => toggleField(post, "pinned")} title="Toggle pin">
                      <Pin className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className={`h-7 w-7 ${post.published ? "text-green-600" : "text-slate-400"}`} onClick={() => toggleField(post, "published")} title="Toggle publish">
                      {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={() => startEdit(post)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(post.id)}>
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
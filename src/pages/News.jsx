import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pin, ArrowLeft } from "lucide-react";

const categoryColors = {
  "General": "bg-slate-100 text-slate-700",
  "Match Updates": "bg-blue-100 text-blue-700",
  "Events": "bg-purple-100 text-purple-700",
  "Announcements": "bg-orange-100 text-orange-700",
};

function linkifyHtml(html) {
  // Auto-link bare URLs not already inside an <a> tag
  return html.replace(/(?<!href="|">)(https?:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');
}

export default function News() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const all = await base44.entities.NewsPost.filter({ published: true }, "-created_date", 200);

      // Fetch content from URL if needed
      const withContent = await Promise.all(all.map(async (post) => {
        if (post.content && post.content.startsWith("http")) {
          const res = await fetch(post.content);
          const html = await res.text();
          return { ...post, content: html };
        }
        return post;
      }));

      // Pinned first, then by created_date desc
      const sorted = [
        ...withContent.filter(p => p.pinned).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
        ...withContent.filter(p => !p.pinned).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
      ];
      setPosts(sorted);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 pt-2 mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">News</h1>
            <p className="text-slate-400 text-xs mt-0.5">Latest updates & announcements</p>
          </div>
        </div>

        {posts.length === 0 && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              No news posts yet. Check back later!
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {posts.map(post => (
            <Card key={post.id} className={`shadow-lg ${post.pinned ? "border-yellow-400/40 ring-1 ring-yellow-400/30" : ""}`}>
              <CardContent className="pt-4 pb-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {post.pinned && <Pin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      <h2 className="font-bold text-base leading-snug">{post.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[post.category] || "bg-slate-100 text-slate-700"}`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rich text content */}
                {post.content && (
                  <div
                    className="prose prose-sm max-w-none text-slate-700 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                    dangerouslySetInnerHTML={{ __html: linkifyHtml(post.content) }}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
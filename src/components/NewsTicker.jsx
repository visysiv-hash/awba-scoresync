import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Newspaper, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NewsTicker({ onSelectPost }) {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.NewsPost.filter({ published: true }, "-created_date", 20).then(all => {
      const sorted = [
        ...all.filter(p => p.pinned),
        ...all.filter(p => !p.pinned),
      ].slice(0, 10);
      setPosts(sorted);
    }).catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="bg-white border-t border-slate-200">
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-slate-100">
        <Newspaper className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-violet-600 text-xs font-bold uppercase tracking-wide">News</span>
      </div>
      <div className="divide-y divide-slate-100">
        {posts.map(post => (
          <button
            key={post.id}
            onClick={() => navigate('/news')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors"
          >
            {post.pinned && <Pin className="w-3 h-3 text-yellow-500 shrink-0" />}
            <p className="text-slate-900 text-xs truncate flex-1 leading-snug">{post.title}</p>
            <span className="text-slate-400 text-[10px] shrink-0">
              {new Date(post.created_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
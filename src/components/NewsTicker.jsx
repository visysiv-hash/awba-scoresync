import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Newspaper, X } from "lucide-react";

export default function NewsTicker({ onSelectPost }) {
  const [posts, setPosts] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    base44.entities.NewsPost.filter({ published: true }, "-created_date", 20).then(all => {
      const sorted = [
        ...all.filter(p => p.pinned),
        ...all.filter(p => !p.pinned),
      ].slice(0, 10);
      setPosts(sorted);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (posts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % posts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [posts.length]);

  if (posts.length === 0) return null;

  const post = posts[current];

  return (
    <div
      className="bg-slate-800 border-t border-slate-700 flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-700 transition-colors"
      onClick={() => onSelectPost(post)}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <Newspaper className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-violet-400 text-xs font-bold uppercase tracking-wide">News</span>
      </div>
      <div className="w-px h-4 bg-slate-600 shrink-0" />
      <p className="text-white text-xs truncate flex-1 leading-none">{post.title}</p>
      {posts.length > 1 && (
        <div className="flex gap-1 shrink-0">
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-violet-400" : "bg-slate-600"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
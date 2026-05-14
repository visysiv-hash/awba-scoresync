import { useState, useEffect } from "react";
import { X, Pin, Calendar } from "lucide-react";
import { format } from "date-fns";

const categoryColors = {
  "General": "bg-slate-100 text-slate-700",
  "Match Updates": "bg-blue-100 text-blue-700",
  "Events": "bg-purple-100 text-purple-700",
  "Announcements": "bg-orange-100 text-orange-700",
};

function linkifyHtml(html) {
  if (!html) return "";
  return html.replace(
    /(?<!href=["'])(https?:\/\/[^\s<"']+)/g,
    '<a href="$1" target="_blank" rel="noreferrer" class="text-blue-600 underline">$1</a>'
  );
}

export default function NewsModal({ post, onClose }) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!post) return;
    const raw = post.content || "";
    if (raw.startsWith("http")) {
      fetch(raw).then(r => r.text()).then(html => setContent(linkifyHtml(html)));
    } else {
      setContent(linkifyHtml(raw));
    }
  }, [post]);

  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {post.pinned && <Pin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[post.category] || "bg-slate-100 text-slate-700"}`}>
                {post.category}
              </span>
            </div>
            <h2 className="font-bold text-base leading-tight">{post.title}</h2>
            {post.created_date && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(post.created_date), "d MMM yyyy")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition-colors shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-1">
          {content ? (
            <div
              className="prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-slate-400 text-sm italic">No content.</p>
          )}
        </div>
      </div>
    </div>
  );
}
import { Star } from "lucide-react";

/** A row of 1–5 stars. Pass onChange to make it tappable; tapping the chosen star again clears it. */
export default function StarRating({ value = 0, onChange, size = "md", className = "" }) {
  const dim = size === "sm" ? "w-4 h-4" : "w-7 h-7";
  const filled = Number(value) || 0;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === filled ? 0 : n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={onChange ? "transition-transform active:scale-90 hover:scale-110" : "cursor-default"}
        >
          <Star
            className={`${dim} ${n <= filled ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

/** Read-only "4/5 ★" chip for lists and headers. */
export function StarSummary({ value, className = "" }) {
  if (!value) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 ${className}`}>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      {value}/5
    </span>
  );
}
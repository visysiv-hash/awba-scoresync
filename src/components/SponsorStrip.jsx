import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function SponsorStrip() {
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    base44.entities.Sponsor.filter({ active: true }, "display_order", 50).then(all => {
      setSponsors(all);
    }).catch(() => {});
  }, []);

  if (sponsors.length === 0) return null;

  // Duplicate for seamless infinite scroll
  const items = [...sponsors, ...sponsors];

  return (
    <div className="bg-white border-t border-slate-200 py-2 overflow-hidden">
      <div className="flex items-center gap-1 mb-1 px-3">
        <span className="text-slate-500 text-xs uppercase tracking-widest font-semibold">Our Sponsors</span>
      </div>
      <div className="overflow-hidden relative">
        <div
          className="flex gap-6 items-center"
          style={{
            animation: `scroll-sponsors ${sponsors.length * 4}s linear infinite`,
            width: "max-content",
          }}
        >
          {items.map((s, i) => (
            <a
              key={i}
              href={s.website_url || undefined}
              target="_blank"
              rel="noreferrer"
              className={`shrink-0 flex items-center justify-center ${s.website_url ? "cursor-pointer" : "cursor-default"}`}
            >
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="h-8 max-w-[80px] object-contain filter brightness-75 hover:brightness-100 transition-all"
                />
              ) : (
                <span className="text-slate-400 text-xs font-semibold px-2 whitespace-nowrap hover:text-white transition-colors">
                  {s.name}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scroll-sponsors {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
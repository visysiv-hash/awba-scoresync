export default function CourtBackdrop() {
  const lines = [
    "M60 90 H340 V610 H60 Z",
    "M95 90 V610",
    "M305 90 V610",
    "M60 190 H340",
    "M60 510 H340",
    "M95 260 H305",
    "M95 440 H305",
    "M200 90 V610",
  ];

  return (
    <svg
      viewBox="0 0 400 700"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
      aria-hidden="true"
    >
      {lines.map((d, i) => (
        <path
          key={d}
          d={d}
          pathLength="1"
          stroke="#ffffff"
          strokeWidth="1.4"
          fill="none"
          strokeDasharray="1"
          strokeDashoffset="1"
          className="court-line"
          style={{ animationDelay: `${0.1 + i * 0.1}s` }}
        />
      ))}

      {/* net */}
      <g className="court-net" style={{ animationDelay: "0.9s" }}>
        <path d="M20 350 H380" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M20 350 V340 M380 350 V340" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        {Array.from({ length: 18 }).map((_, i) => (
          <path key={i} d={`M${30 + i * 20} 342 V358`} stroke="#ffffff" strokeWidth="0.8" />
        ))}
        <path d="M20 344 H380 M20 356 H380" stroke="#ffffff" strokeWidth="0.8" />
      </g>

      <style>{`
        @keyframes courtDraw {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .court-line {
          animation: courtDraw 1.4s ease-out forwards;
        }
        @keyframes netIn {
          from { opacity: 0; transform: scaleX(0.6); }
          to { opacity: 1; transform: scaleX(1); }
        }
        .court-net {
          transform-origin: center;
          animation: netIn 0.8s ease-out both;
        }
      `}</style>
    </svg>
  );
}
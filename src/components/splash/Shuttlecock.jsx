export default function Shuttlecock({ className = "" }) {
  return (
    <svg viewBox="0 0 48 48" className={`shuttle ${className}`} aria-hidden="true">
      <circle cx="24" cy="37" r="6" fill="#fef3c7" />
      <path d="M19 32 L9 9" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24 31 V8" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M29 32 L39 9" stroke="#f8fafc" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 15 L30 23 M18 12 L36 21 M37 15 L18 23 M30 12 L12 21" stroke="#f8fafc" strokeWidth="0.9" opacity="0.8" />
      <style>{`
        @keyframes shuttleFly {
          0% { opacity: 0; transform: translate(120px, -90px) rotate(-55deg) scale(0.8); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: translate(0, 0) rotate(8deg) scale(1); }
        }
        .shuttle {
          animation: shuttleFly 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
        }
      `}</style>
    </svg>
  );
}
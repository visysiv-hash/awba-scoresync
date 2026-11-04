import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import CourtBackdrop from "@/components/splash/CourtBackdrop";
import Shuttlecock from "@/components/splash/Shuttlecock";

const AWBA_LOGO = "https://media.base44.com/images/public/69c519111fbf9fefe3d69538/83f77bd4f_image.png";
const LOGO_MS = 2300;
const SPONSOR_MS = 2800;
const MAX_SPONSORS = 2;

export default function SplashScreen({ onDone }) {
  const [sponsors, setSponsors] = useState([]);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(-1); // -1 = AWBA logo, then sponsor index
  const [fading, setFading] = useState(false);

  useEffect(() => {
    base44.entities.Sponsor.list({ sort: "display_order", limit: 50 })
      .then((list) => {
        const all = (Array.isArray(list) ? list : list?.items || []).filter((s) => s.logo_url);
        // "Splash screen only" sponsors lead the splash, regardless of the Active flag
        const flagged = all.filter((s) => s.splash_only === true);
        const pool = flagged.length ? flagged : all.filter((s) => s.active === true);
        setSponsors(pool.slice(0, MAX_SPONSORS));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const close = () => setFading(true);

  useEffect(() => {
    if (fading) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
  }, [fading, onDone]);

  useEffect(() => {
    if (!ready || fading) return;
    if (index === -1) {
      const t = setTimeout(() => (sponsors.length ? setIndex(0) : close()), LOGO_MS);
      return () => clearTimeout(t);
    }
    const isLast = index >= sponsors.length - 1;
    const t = setTimeout(() => (isLast ? close() : setIndex(index + 1)), SPONSOR_MS);
    return () => clearTimeout(t);
  }, [ready, index, sponsors.length, fading]);

  const sponsor = index >= 0 ? sponsors[index] : null;

  return (
    <div
      onClick={close}
      className={`fixed inset-0 z-[100] overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {sponsor ? (
        // Sponsor takes over the whole screen
        <div key={sponsor.id} className="splash-fade flex h-full w-full flex-col items-center justify-center bg-white px-8 py-10">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Proudly supported by
          </p>
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="min-h-0 w-full max-w-[86vw] flex-1 object-contain sm:max-w-[34rem]"
          />
          <p className="mt-8 text-lg font-bold text-slate-800">{sponsor.name}</p>
          {sponsors.length > 1 && (
            <div className="mt-4 flex gap-1.5">
              {sponsors.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-slate-800" : "bg-slate-300"}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        // AWBA lockup over a drawing court
        <div className="relative flex h-full w-full flex-col items-center justify-center px-8">
          <CourtBackdrop />
          <div className="relative splash-logo flex flex-col items-center">
            <Shuttlecock className="absolute -right-10 -top-8 h-9 w-9" />
            <img src={AWBA_LOGO} alt="AWBA" className="h-24 max-w-[80vw] object-contain" />
            <p className="mt-5 text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Albury Wodonga
            </p>
            <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Badminton Association
            </p>
          </div>
        </div>
      )}

      <button
        onClick={close}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-600"
      >
        Tap to skip
      </button>

      <style>{`
        @keyframes splashFade {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .splash-fade { animation: splashFade 0.5s ease-out both; }
        @keyframes logoLand {
          0% { opacity: 0; transform: scale(1.18); filter: blur(6px); }
          70% { opacity: 1; transform: scale(0.98); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        .splash-logo { animation: logoLand 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both; }
      `}</style>
    </div>
  );
}
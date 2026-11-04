import { Award, Flame, Star, Sparkles, Shield, Target, Users, TrendingUp, Zap, Trophy, Lock } from "lucide-react";

// One icon per badge id, all names that exist in lucide-react.
const ICONS = {
  first: Sparkles,
  ten: Star,
  twentyfive: Trophy,
  streak: Flame,
  giant: Shield,
  perfect: Target,
  century: Zap,
  pair: Users,
  social: Award,
  climber: TrendingUp,
};

export default function WrappedBadges({ badges = [] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-bold text-white">Badges</p>
        <p className="text-[11px] text-slate-400">
          {earned} of {badges.length} unlocked
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {badges.map((badge) => {
          const Icon = badge.earned ? ICONS[badge.id] || Award : Lock;
          return (
            <div
              key={badge.id}
              className={`rounded-xl border p-2.5 ${
                badge.earned
                  ? "border-amber-400/60 bg-gradient-to-br from-amber-400/20 to-amber-600/10"
                  : "border-slate-700 bg-slate-900/40"
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  badge.earned ? "bg-amber-400 text-amber-950" : "bg-slate-700 text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className={`mt-1.5 text-xs font-bold leading-tight ${badge.earned ? "text-white" : "text-slate-500"}`}>
                {badge.label}
              </p>
              <p className={`text-[10px] leading-tight ${badge.earned ? "text-amber-200/90" : "text-slate-500"}`}>
                {badge.earned && badge.detail ? badge.detail : badge.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import { Link, useLocation } from "react-router-dom";
import { CalendarCheck } from "lucide-react";
import { Home, BarChart2, Trophy, BookOpen, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function BottomNav() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const tabs = [
    { path: "/", label: "Home", icon: Home },
    { path: "/dashboard", label: "Results", icon: BarChart2 },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    // { path: "/bookings", label: "Book", icon: CalendarCheck },
    { path: "/manual", label: "Manual", icon: BookOpen },
    // { path: "/register", label: "Register", icon: CalendarCheck },
    ...(isAdmin ? [{ path: "/admin/scores", label: "Scores", icon: ShieldCheck }] : []),
    // admin registrations tab hidden: { path: "/admin/registrations", label: "Regs", icon: ShieldCheck }
    // admin sessions tab hidden: { path: "/admin/sessions", label: "Sessions", icon: CalendarCheck }
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 flex">
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path;
        return (
          <Link key={path} to={path} className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${active ? "text-yellow-400" : "text-slate-400 hover:text-white"}`}>
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ClipboardList, BarChart2, Trophy, CalendarCheck,
  User, BookOpen, ShieldCheck, Shield, CalendarDays, Newspaper, Star, ChevronDown, ChevronUp, LogIn, UserPlus } from
  "lucide-react";
import NewsTicker from "../components/NewsTicker";
import SponsorStrip from "../components/SponsorStrip";
import PageBanner from "../components/PageBanner";
import MyBookingsThisWeek from "../components/MyBookingsThisWeek";
import AdminPinGate from "../components/AdminPinGate";

const tiles = [
{
  label: "Match Details",
  description: "Search & submit match scores",
  icon: ClipboardList,
  to: "/match-details",
  gradient: "from-blue-500 to-blue-700"
},
{
  label: "Results",
  description: "View all game results",
  icon: BarChart2,
  to: "/dashboard",
  gradient: "from-emerald-500 to-emerald-700"
},
{
  label: "Leaderboard",
  description: "Player standings & stats",
  icon: Trophy,
  to: "/leaderboard?tab=rankings",
  gradient: "from-yellow-400 to-orange-500"
},
{
  label: "Player Profile",
  description: "View your stats & history",
  icon: User,
  to: "/leaderboard?tab=search",
  gradient: "from-pink-500 to-rose-600"
},
{
  label: "News",
  description: "Latest updates & announcements",
  icon: Newspaper,
  to: "/news",
  gradient: "from-violet-500 to-purple-600"
},
{
  label: "User Manual",
  description: "How to use ScoreSync",
  icon: BookOpen,
  to: "/manual",
  gradient: "from-slate-500 to-slate-700"
},
{
  label: "Book a Session",
  description: "View & book available sessions",
  icon: CalendarDays,
  to: "/bookings",
  gradient: "from-teal-500 to-cyan-700"
},
{
  label: "Register",
  description: "Register for the season",
  icon: ClipboardList,
  to: "/register",
  gradient: "from-indigo-500 to-blue-700"
}];


const adminTiles = [
{
  label: "Scheduling",
  description: "Schedule games for Tuesday Nights",
  icon: CalendarCheck,
  to: "/availability",
  gradient: "from-purple-500 to-purple-700"
},
{
  label: "Edit Scores",
  description: "Correct submitted scores",
  icon: ShieldCheck,
  to: "/admin/scores",
  gradient: "from-red-500 to-red-700"
},
{
  label: "Registrations",
  description: "Manage player registrations",
  icon: ShieldCheck,
  to: "/admin/registrations",
  gradient: "from-orange-500 to-orange-600"
},
{
  label: "Sessions",
  description: "Create & manage sessions",
  icon: CalendarCheck,
  to: "/admin/sessions",
  gradient: "from-rose-500 to-pink-700"
},
{
label: "News",
description: "Manage news & announcements",
icon: Newspaper,
to: "/admin/news",
gradient: "from-indigo-500 to-indigo-700"
},
{
label: "Sponsors",
description: "Manage sponsor logos",
icon: Star,
to: "/admin/sponsors",
gradient: "from-yellow-500 to-amber-600"
},
{
label: "Add Member",
description: "Add a new member to the sheet",
icon: UserPlus,
to: "/admin/add-member",
gradient: "from-cyan-500 to-teal-700"
}];


function Tile({ label, description, icon: Icon, to, gradient, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-2 flex flex-col gap-1 shadow-md hover:shadow-xl active:scale-95 transition-all duration-150`}>
      
      {/* decorative circles */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />

      <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
        <Icon className="w-3 h-3 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-xs leading-tight">{label}</p>
        <p className="text-white/75 text-[10px] leading-tight">{description}</p>
      </div>
    </Link>);

}

export default function Home() {
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [loginGateEnabled, setLoginGateEnabled] = useState(
    () => localStorage.getItem("awba_member_login_enabled") === "true"
  );
  const [showPinGate, setShowPinGate] = useState(false);

  useEffect(() => {
    base44.entities.PageVisit.create({ page: 'landing' });
  }, []);

  const doToggle = () => {
    const next = !loginGateEnabled;
    setLoginGateEnabled(next);
    if (next) {
      localStorage.setItem("awba_member_login_enabled", "true");
    } else {
      localStorage.removeItem("awba_member_login_enabled");
      localStorage.removeItem("awba_member");
    }
  };

  const toggleLoginGate = () => {
    if (sessionStorage.getItem("adminPinUnlocked") === "true") {
      doToggle();
    } else {
      setShowPinGate(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center pt-0 pb-2">
          <PageBanner className="h-16" />
        </div>

        {/* Sponsor Strip */}
        <div className="mt-4">
          <div className="text-center mb-2">
            <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Our Sponsors</span>
          </div>
          <div className="rounded-xl overflow-hidden">
            <SponsorStrip />
          </div>
        </div>

        {/* News Ticker */}
        <div className="mt-2 rounded-xl overflow-hidden">
          <NewsTicker />
        </div>

        {/* My bookings this week */}
        <div className="mt-4">
          <MyBookingsThisWeek />
        </div>

        {/* Main tiles */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {tiles.map((tile) => <Tile key={tile.label} {...tile} />)}
        </div>

        {/* Admin section */}
        <div className="mt-6">
            <button
              onClick={() => setAdminExpanded(v => !v)}
              className="w-full flex items-center gap-3 py-2"
            >
              <div className="flex-1 h-px bg-slate-700" />
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold tracking-widest uppercase">
                <Shield className="w-3.5 h-3.5" />
                Admin
                {adminExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 h-px bg-slate-700" />
            </button>
            {adminExpanded && (
              <>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {adminTiles.map((tile) => (
                    <Tile key={tile.label} {...tile} />
                  ))}
                </div>
                {/* Member Login Gate toggle — testing only */}
                <button
                  onClick={toggleLoginGate}
                  className={`mt-3 w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    loginGateEnabled
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-800/50 border-slate-700"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    loginGateEnabled ? "bg-emerald-500" : "bg-slate-700"
                  }`}>
                    <LogIn className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-xs font-bold">Member Login Gate</p>
                    <p className="text-slate-400 text-[10px]">
                      {loginGateEnabled ? "Enabled — members must log in" : "Disabled — open access"}
                    </p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${
                    loginGateEnabled ? "bg-emerald-500" : "bg-slate-600"
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      loginGateEnabled ? "left-5" : "left-0.5"
                    }`} />
                  </div>
                </button>
              </>
            )}
          </div>
      </div>

      {showPinGate && (
        <AdminPinGate
          onSuccess={() => { setShowPinGate(false); doToggle(); }}
          onCancel={() => setShowPinGate(false)}
        />
      )}

    </div>);

}
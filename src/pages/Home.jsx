import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ClipboardList, BarChart2, Trophy, CalendarCheck,
  User, BookOpen, ShieldCheck, Shield } from
"lucide-react";
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
  label: "Availability",
  description: "Mark your session availability",
  icon: CalendarCheck,
  to: "/availability",
  gradient: "from-purple-500 to-purple-700"
},
{
  label: "Player Profile",
  description: "View your stats & history",
  icon: User,
  to: "/player",
  gradient: "from-pink-500 to-rose-600"
},
{
  label: "User Manual",
  description: "How to use ScoreSync",
  icon: BookOpen,
  to: "/manual",
  gradient: "from-slate-500 to-slate-700"
}];


const adminTiles = [
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
}];


function Tile({ label, description, icon: Icon, to, gradient, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 flex flex-col gap-3 shadow-md hover:shadow-xl active:scale-95 transition-all duration-150`}>
      
      {/* decorative circles */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />

      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-base leading-tight">{label}</p>
        <p className="text-white/75 text-xs mt-0.5">{description}</p>
      </div>
    </Link>);

}

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.PageVisit.create({ page: 'landing' });
    base44.auth.me().then((user) => {
      if (user?.role === 'admin') setIsAdmin(true);
    }).catch(() => {});
  }, []);

  const handleAdminTileClick = (e, to) => {
    e.preventDefault();
    setPendingRoute(to);
  };

  const handlePinSuccess = () => {
    const route = pendingRoute;
    setPendingRoute(null);
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center pt-6 pb-8">
          <img
            src="https://media.base44.com/images/public/69c519111fbf9fefe3d69538/38fc332c7_image.png"
            alt="AWBA"
            className="mx-auto mb-3 h-16 object-contain" />
          
          <h1 className="text-3xl font-bold text-white">AWBA</h1>
          <p className="text-sm text-slate-400 mt-1">Select a section to get started</p>
        </div>

        {/* Main tiles */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => <Tile key={tile.label} {...tile} />)}
        </div>

        {/* Admin section */}
        {isAdmin &&
        <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-700" />
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold tracking-widest uppercase">
                <Shield className="w-3.5 h-3.5" />
                Admin
              </div>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {adminTiles.map((tile) =>
            <Tile
              key={tile.label}
              {...tile}
              onClick={(e) => handleAdminTileClick(e, tile.to)} />

            )}
            </div>
          </div>
        }
      </div>

      {pendingRoute &&
      <AdminPinGate
        onSuccess={handlePinSuccess}
        onCancel={() => setPendingRoute(null)} />

      }
    </div>);

}
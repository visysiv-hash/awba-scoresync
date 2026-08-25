import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MemberLogin from './pages/MemberLogin';
// Add page imports here
import News from './pages/News';
import AdminNews from './pages/AdminNews';
import BookingSessions from './pages/BookingSessions';
import Register from './pages/Register';
import AdminRegistrations from './pages/AdminRegistrations';
import AdminSessions from './pages/AdminSessions';
import ExplainerDownload from './pages/ExplainerDownload';
import UserManual from './pages/UserManual';
import AdminScoreEdit from './pages/AdminScoreEdit';
import PlayerProfile from './pages/PlayerProfile';
import BottomNav from './components/BottomNav';
import AdminSponsors from './pages/AdminSponsors';
import Home from './pages/Home';
import MatchDetails from './pages/MatchDetails';
import PlayerAvailability from './pages/PlayerAvailability';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/Dashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [memberVerified, setMemberVerified] = useState(() => {
    try {
      const member = JSON.parse(localStorage.getItem("awba_member") || "null");
      if (!member) return false;
      // Timeout after 4 hours
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      if (member.login_time && Date.now() - member.login_time > FOUR_HOURS) {
        localStorage.removeItem("awba_member");
        return false;
      }
      return true;
    } catch { return false; }
  });

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Member login gate — must verify BV member ID before accessing the app
  if (!memberVerified) {
    return <MemberLogin onVerified={() => setMemberVerified(true)} />;
  }

  // Render the main app
  return (
    <>
      <div className="pb-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/availability" element={<PlayerAvailability />} />
          <Route path="/player" element={<PlayerProfile />} />
          <Route path="/manual" element={<UserManual />} />
          <Route path="/explainer" element={<ExplainerDownload />} />
          <Route path="/admin/scores" element={<AdminScoreEdit />} />
          <Route path="/bookings" element={<BookingSessions />} />
          <Route path="/admin/sessions" element={<AdminSessions />} />
          <Route path="/match-details" element={<MatchDetails />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/news" element={<News />} />
          <Route path="/admin/news" element={<AdminNews />} />
          <Route path="/admin/sponsors" element={<AdminSponsors />} />

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <BottomNav />
      </div>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Stars from './components/Stars';
import InviteNotification from './components/InviteNotification';
import io from 'socket.io-client';
import Home from './pages/Home';
import Game from './pages/Game';
import TeamGamePage from './pages/TeamGamePage';
import Matchmaking from './pages/Matchmaking';
import MatchBattle from './pages/MatchBattle';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Leaderboard from './pages/Leaderboard';
import SeasonWinners from './pages/SeasonWinners';
import AdminPanel from './pages/AdminPanel';
import BuyShards from './pages/BuyShards';
import Shop from './pages/Shop';
import ReferralPage from './pages/ReferralPage';
import TwoFactorSetup from './pages/TwoFactorSetup';
import TwoFactorVerify from './pages/TwoFactorVerify';
import PrivateRoute from './components/PrivateRoute';
import Collection from './pages/Collection';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Contact from './pages/Contact';
import ClanPage from './pages/ClanPage'; // ✅ ADDED
import './App.css';

// ✅ NEW: ScrollToTop component to fix scroll position on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // or 'smooth' if you want animated scrolling
    });
  }, [pathname]);

  return null;
};

const AppContent = () => {
  const { user, isAuthenticated } = useAuth();
  const [invite, setInvite] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('⏳ Not authenticated, skipping socket connection');
      return;
    }

    const userId = user?._id || user?.id || user?.userId;
    
    console.log('👤 User object:', user);
    console.log('👤 User ID found:', userId);

    if (!userId) {
      console.warn('⚠️ No user ID found, cannot register socket');
      return;
    }

    console.log('🔌 Connecting to socket server...');

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      socket.emit('register-user', { userId: userId });
      console.log(`📤 Registered user ${userId} for private messages`);
    });

    socket.on('team-invite', (data) => {
      console.log('📨 Team invite received!', data);
      console.log('📨 From:', data.from?.username);
      console.log('📨 Room:', data.roomCode);
      setInvite({ ...data, type: 'team' });
    });

    socket.on('team-invite-global', (data) => {
      console.log('📨 Global team invite received:', data);
      if (data.targetUserId === userId) {
        setInvite({ ...data, type: 'team' });
      }
    });

    socket.on('match-invite', (data) => {
      console.log('📨 Match invite received!', data);
      console.log('📨 From:', data.from?.username);
      console.log('📨 Match Code:', data.matchCode);
      setInvite({ ...data, type: 'match' });
    });

    socket.on('match-invite-global', (data) => {
      console.log('📨 Global match invite received:', data);
      if (data.targetUserId === userId) {
        setInvite({ ...data, type: 'match' });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket');
        socketRef.current.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const handleInviteClose = () => {
    setInvite(null);
  };

  return (
    <>
      <ScrollToTop /> {/* ✅ ADD THIS LINE - fixes scroll position */}
      <Navbar />
      <Stars />
      <main className="main-content">
        <Routes>
          {/* ===== PUBLIC ROUTES ===== */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/season-winners" element={<SeasonWinners />} />
          <Route path="/2fa-verify" element={<TwoFactorVerify />} />
          
          {/* ===== LEGAL PAGES ===== */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* ===== PRIVATE ROUTES ===== */}
          <Route path="/game" element={
            <PrivateRouteWrapper><Game /></PrivateRouteWrapper>
          } />
          
          <Route path="/team-game/:roomCode" element={
            <PrivateRouteWrapper><TeamGamePage /></PrivateRouteWrapper>
          } />
          
          <Route path="/match" element={
            <PrivateRouteWrapper><Matchmaking /></PrivateRouteWrapper>
          } />
          
          <Route path="/match/battle/:matchCode" element={
            <PrivateRouteWrapper><MatchBattle /></PrivateRouteWrapper>
          } />
          
          <Route path="/collection" element={
            <PrivateRouteWrapper><Collection /></PrivateRouteWrapper>
          } />
          
          <Route path="/shop" element={
            <PrivateRouteWrapper><Shop /></PrivateRouteWrapper>
          } />
          
          <Route path="/referral" element={
            <PrivateRouteWrapper><ReferralPage /></PrivateRouteWrapper>
          } />
          
          <Route path="/profile" element={
            <PrivateRouteWrapper><Profile /></PrivateRouteWrapper>
          } />
          
          <Route path="/profile/:username" element={
            <PrivateRouteWrapper><PublicProfile /></PrivateRouteWrapper>
          } />
          
          <Route path="/2fa-setup" element={
            <PrivateRouteWrapper><TwoFactorSetup /></PrivateRouteWrapper>
          } />
          
          <Route path="/buy-shards" element={
            <PrivateRouteWrapper><BuyShards /></PrivateRouteWrapper>
          } />
          
          {/* ✅ ADDED: Clan Route */}
          <Route path="/clan" element={
            <PrivateRouteWrapper><ClanPage /></PrivateRouteWrapper>
          } />
          
          <Route path="/admin" element={
            <AdminRouteWrapper><AdminPanel /></AdminRouteWrapper>
          } />
        </Routes>
      </main>
      <Footer />
      
      {invite && (
        <InviteNotification 
          invite={invite} 
          onClose={handleInviteClose} 
        />
      )}
    </>
  );
};

const PrivateRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-container">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRouteWrapper = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="loading-container">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'admin') return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
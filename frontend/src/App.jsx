import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Stars from './components/Stars';
import Home from './pages/Home';
import Game from './pages/Game';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Leaderboard from './pages/Leaderboard';
import SeasonWinners from './pages/SeasonWinners';
import AdminPanel from './pages/AdminPanel';
import BuyShards from './pages/BuyShards';
import Shop from './pages/Shop';
import ReferralPage from './pages/ReferralPage'; // ✅ NEW: Referral Page
import TwoFactorSetup from './pages/TwoFactorSetup';
import TwoFactorVerify from './pages/TwoFactorVerify';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const PrivateRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRouteWrapper = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Navbar />
          <Stars />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/season-winners" element={<SeasonWinners />} />
              
              <Route path="/2fa-verify" element={<TwoFactorVerify />} />
              
              <Route path="/game" element={
                <PrivateRouteWrapper>
                  <Game />
                </PrivateRouteWrapper>
              } />
              
              <Route path="/shop" element={
                <PrivateRouteWrapper>
                  <Shop />
                </PrivateRouteWrapper>
              } />
              
              {/* ===== ✅ REFERRAL PAGE ROUTE ===== */}
              <Route path="/referral" element={
                <PrivateRouteWrapper>
                  <ReferralPage />
                </PrivateRouteWrapper>
              } />
              
              <Route path="/profile" element={
                <PrivateRouteWrapper>
                  <Profile />
                </PrivateRouteWrapper>
              } />
              
              <Route path="/profile/:username" element={
                <PrivateRouteWrapper>
                  <PublicProfile />
                </PrivateRouteWrapper>
              } />
              
              <Route path="/2fa-setup" element={
                <PrivateRouteWrapper>
                  <TwoFactorSetup />
                </PrivateRouteWrapper>
              } />
              <Route path="/buy-shards" element={
                <PrivateRouteWrapper>
                  <BuyShards />
                </PrivateRouteWrapper>
              } />
              
              <Route path="/admin" element={
                <AdminRouteWrapper>
                  <AdminPanel />
                </AdminRouteWrapper>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
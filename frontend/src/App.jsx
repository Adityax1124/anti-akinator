import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Game from './pages/Game';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile'; // ← ADD THIS IMPORT
import Leaderboard from './pages/Leaderboard';
import SeasonWinners from './pages/SeasonWinners';
import AdminPanel from './pages/AdminPanel';
import BuyShards from './pages/BuyShards';
import TwoFactorSetup from './pages/TwoFactorSetup';
import TwoFactorVerify from './pages/TwoFactorVerify';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

// ===== PRIVATE ROUTE WRAPPER =====
const PrivateRouteWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// ===== ADMIN ROUTE WRAPPER =====
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
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/season-winners" element={<SeasonWinners />} />
              
              {/* 2FA Routes */}
              <Route path="/2fa-verify" element={<TwoFactorVerify />} />
              
              {/* Protected Routes */}
              <Route path="/game" element={
                <PrivateRouteWrapper>
                  <Game />
                </PrivateRouteWrapper>
              } />
              
              {/* ===== PROFILE ROUTES - ORDER MATTERS! ===== */}
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
              
              {/* 2FA Setup (Protected) */}
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
              
              {/* Admin Routes */}
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
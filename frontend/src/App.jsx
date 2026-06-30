import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Stars from './components/Stars';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Game from './pages/Game';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import AdminPanel from './pages/AdminPanel';
import SeasonWinners from './pages/SeasonWinners';
import './App.css';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Footer from './components/Footer';
import BuyShards from './pages/BuyShards';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Stars />
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/game" element={<PrivateRoute><Game /></PrivateRoute>} />
              <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/profile/:username" element={<PrivateRoute><PublicProfile /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
              <Route path="/season-winners" element={<PrivateRoute><SeasonWinners /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/buy-shards" element={<PrivateRoute><BuyShards /></PrivateRoute>} />
            </Routes>
            <Footer />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
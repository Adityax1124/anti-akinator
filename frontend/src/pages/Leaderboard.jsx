import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [season, setSeason] = useState(1);
  const [seasonDisplayName, setSeasonDisplayName] = useState('Season 1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/season/leaderboard?_t=' + Date.now());
      
      const data = response.data;
      
      setLeaderboard(data.leaderboard || []);
      setSeason(data.season || 1);
      
      if (data.seasonDisplayName) {
        setSeasonDisplayName(data.seasonDisplayName);
      } else {
        setSeasonDisplayName(`Season ${data.season || 1}`);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      
      if (error.response?.status === 404) {
        setError('Leaderboard feature coming soon! 🚀');
      } else {
        setError('Failed to load leaderboard. Please try again.');
      }
      
      setLoading(false);
    }
  };

  const calculateTimeLeft = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const diff = endOfMonth - now;
    
    if (diff <= 0) {
      setTimeLeft('Season ends today!');
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeLeft(`${days}d ${hours}h ${minutes}m`);
  };

  const handlePlayerClick = (username) => {
    if (username) {
      navigate(`/profile/${username}`);
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container fade-in">
      <div className="leaderboard-header">
        <h1>🏆 {seasonDisplayName} Leaderboard</h1>
        <p className="prize-message">
          🥇 Season Winner will receive <strong>₹2,000 INR</strong>!
        </p>
        <p className="leaderboard-subtitle">
          Ranked by season wins • Highest streak breaks ties
        </p>
        <p className="season-countdown">
          ⏳ Season ends in: <strong>{timeLeft}</strong>
        </p>
      </div>

      <div className="leaderboard-card">
        {error && <div className="leaderboard-error">{error}</div>}
        
        {!error && leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <p>No players yet. Be the first to play!</p>
          </div>
        ) : !error && (
          <div className="leaderboard-list">
            <div className="leaderboard-item header">
              <span className="rank">#</span>
              <span className="avatar-col">Avatar</span>
              <span className="player">Player</span>
              <span className="games">Season Wins</span>
              <span className="streak">🔥 Streak</span>
            </div>
            
            {leaderboard.map((player, index) => (
              <div 
                key={player.username || index} 
                className={`leaderboard-item ${index < 3 ? 'top' : ''}`}
                onClick={() => handlePlayerClick(player.username)}
                style={{ cursor: player.username ? 'pointer' : 'default' }}
              >
                <span className="rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="avatar-col">
                  {player.profilePhoto ? (
                    <img 
                      src={player.profilePhoto} 
                      alt={player.username}
                      className="leaderboard-avatar-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const placeholder = document.createElement('span');
                        placeholder.className = 'leaderboard-avatar-placeholder';
                        placeholder.textContent = player.username?.charAt(0).toUpperCase() || '?';
                        e.target.parentElement.appendChild(placeholder);
                      }}
                    />
                  ) : (
                    <span className="leaderboard-avatar-placeholder">
                      {player.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </span>
                <span className="player">{player.username || 'Unknown'}</span>
                <span className="games">{player.wins || 0}</span>
                <span className="streak">{player.streak || 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
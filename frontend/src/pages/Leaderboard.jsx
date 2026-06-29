import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/public/leaderboard');
setLeaderboard(response.data.topPlayers || []);
      setLoading(false);
    } catch (error) {
      setError('Failed to load leaderboard');
      setLoading(false);
    }
  };

  const handlePlayerClick = (username) => {
    navigate(`/profile/${username}`);
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
        <h1>🏆 Leaderboard</h1>
        <p>Top players ranked by their highest win streak</p>
      </div>

      <div className="leaderboard-card">
        {error && <div className="leaderboard-error">{error}</div>}
        
        {leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <p>No players yet. Be the first to play!</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            <div className="leaderboard-item header">
              <span className="rank">#</span>
              <span className="avatar-col">Avatar</span>
              <span className="player">Player</span>
              <span className="games">Wins</span>
              <span className="streak">🔥 Streak</span>
            </div>
            
            {leaderboard.map((player, index) => (
              <div 
                key={player._id} 
                className={`leaderboard-item ${index < 3 ? 'top' : ''}`}
                onClick={() => handlePlayerClick(player.username)}
                style={{ cursor: 'pointer' }}
              >
                <span className="rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="avatar-col">
                  {player.equipped?.profilePhoto?.imageUrl ? (
                    <img 
                      src={player.equipped.profilePhoto.imageUrl} 
                      alt={player.username} 
                      className="leaderboard-avatar" 
                    />
                  ) : (
                    <span className="leaderboard-avatar-placeholder">
                      {player.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="player">{player.username}</span>
                <span className="games">{player.stats.gamesWon || 0}</span>
                <span className="streak">{player.stats.winStreak || 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
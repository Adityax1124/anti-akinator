import React, { useState, useEffect, useRef } from 'react';
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

  const fetchedRef = useRef(false);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchLeaderboard();
    }
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && leaderboard.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      );

      itemRefs.current.forEach((item) => {
        if (item) observer.observe(item);
      });

      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [loading, leaderboard]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await api.get('/season/leaderboard');

      let data = response.data;
      let leaderboardData = data.leaderboard || [];
      let seasonNumber = data.season || 1;

      if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
        setLeaderboard(leaderboardData);
      } else {
        setLeaderboard([]);
      }

      setSeason(seasonNumber);

      if (data.seasonDisplayName) {
        setSeasonDisplayName(data.seasonDisplayName);
      } else {
        setSeasonDisplayName(`Season ${seasonNumber}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Leaderboard fetch error:', error);

      if (error.response?.status === 404) {
        setError('Leaderboard feature coming soon! 🚀');
      } else if (error.response?.status === 429) {
        setError('Too many requests. Please wait a moment.');
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
    if (username && username !== 'Unknown') {
      navigate(`/profile/${username}`);
    }
  };

  const getRankClass = (index) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  };

  const getRankDisplay = (index, rank) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="leaderboard-container fade-in">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container fade-in" ref={containerRef}>
      <div className="bg-noise"></div>
      <div className="bg-grid"></div>
      <div className="aurora aurora-1"></div>
      <div className="aurora aurora-2"></div>

      <div className="leaderboard-header">
        <div className="leaderboard-badge">
          <span className="badge-dot"></span>
          {seasonDisplayName}
        </div>
        <h1>🏆 Leaderboard 🏆</h1>
        <p className="prize-message">
          🥇 Season Winner will receive <strong>₹2,000 INR</strong>!
        </p>
        <p className="leaderboard-subtitle">
          Ranked by streak • Less season win breaks ties
        </p>
        <p className="season-countdown">
          ⏳ Season ends in: <strong>{timeLeft}</strong>
        </p>
      </div>

      <div className="leaderboard-card">
        {error && <div className="leaderboard-error">{error}</div>}

        {!error && leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <p>No players yet. Be the first to play! 🎯</p>
            <p className="empty-subtext">Win games to appear on the leaderboard</p>
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

            {leaderboard.map((player, index) => {
              const rank = player.rank || index + 1;
              const username = player.username || 'Unknown';
              const wins = player.wins || 0;
              const streak = player.streak || 0;
              const rankClass = getRankClass(index);
              const rankDisplay = getRankDisplay(index, rank);
              const isTop = index < 3;

              return (
                <div
                  key={username + index + player._id || index}
                  ref={el => itemRefs.current[index] = el}
                  className={`leaderboard-item ${isTop ? 'top' : ''}`}
                  onClick={() => handlePlayerClick(username)}
                  style={{ cursor: username !== 'Unknown' ? 'pointer' : 'default' }}
                >
                  <span className={`rank ${rankClass}`}>
                    {rankDisplay}
                  </span>
                  <span className="avatar-col">
                    {player.profilePhoto ? (
                      <img
                        src={player.profilePhoto}
                        alt={username}
                        className="leaderboard-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          const placeholder = document.createElement('span');
                          placeholder.className = 'leaderboard-avatar-placeholder';
                          placeholder.textContent = username.charAt(0).toUpperCase() || '?';
                          parent.appendChild(placeholder);
                        }}
                      />
                    ) : (
                      <span className="leaderboard-avatar-placeholder">
                        {username.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </span>
                  <span className="player">{username}</span>
                  <span className="games">{wins}</span>
                  <span className={`streak ${streak >= 10 ? 'high' : ''}`}>
                    {streak}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
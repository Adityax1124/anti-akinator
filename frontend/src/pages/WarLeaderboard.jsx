import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './WarLeaderboard.css';

const WarLeaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, top10, top20

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/clan-war/leaderboard?limit=20');
      if (response.data.success) {
        setLeaderboard(response.data.leaderboard || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Filter leaderboard
  const getFilteredLeaderboard = () => {
    let filtered = [...leaderboard];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(clan =>
        clan.clanName?.toLowerCase().includes(query)
      );
    }
    
    // Rank filter
    if (filter === 'top10') {
      filtered = filtered.slice(0, 10);
    } else if (filter === 'top20') {
      filtered = filtered.slice(0, 20);
    }
    
    return filtered;
  };

  const filteredLeaderboard = getFilteredLeaderboard();

  // Get medal emoji
  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // Get rank color
  const getRankColor = (rank) => {
    if (rank === 1) return '#fbbf24';
    if (rank === 2) return '#9ca3af';
    if (rank === 3) return '#cd7f32';
    return 'rgba(255,255,255,0.2)';
  };

  // Get win rate color
  const getWinRateColor = (rate) => {
    if (rate >= 75) return '#4ecdc4';
    if (rate >= 50) return '#f59e0b';
    if (rate >= 25) return '#f97316';
    return '#ff6b6b';
  };

  // Navigate to clan page
  const handleClanClick = (clanId) => {
    navigate(`/clan?clanId=${clanId}`);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '0';
  };

  return (
    <div className="war-leaderboard-page">
      {/* Background Effects */}
      <div className="leaderboard-bg-noise"></div>
      <div className="leaderboard-bg-grid"></div>
      <div className="leaderboard-aurora leaderboard-aurora-1"></div>
      <div className="leaderboard-aurora leaderboard-aurora-2"></div>

      {/* Header */}
      <div className="leaderboard-header">
        <div className="leaderboard-header-left">
          <h1>⚔️ Clan War Leaderboard</h1>
          <span className="leaderboard-subtitle">Top 20 clans by war victories</span>
        </div>
        <div className="leaderboard-header-right">
          <button 
            className="leaderboard-refresh-btn"
            onClick={fetchLeaderboard}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="leaderboard-alert error">{error}</div>}

      {/* Controls */}
      <div className="leaderboard-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search clans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'top10' ? 'active' : ''}`}
            onClick={() => setFilter('top10')}
          >
            Top 10
          </button>
          <button
            className={`filter-btn ${filter === 'top20' ? 'active' : ''}`}
            onClick={() => setFilter('top20')}
          >
            Top 20
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      {!loading && leaderboard.length > 0 && (
        <div className="leaderboard-stats">
          <div className="stat-card">
            <span className="stat-value">{leaderboard.length}</span>
            <span className="stat-label">Clans</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {leaderboard.reduce((sum, c) => sum + (c.totalWins || 0), 0)}
            </span>
            <span className="stat-label">Total Wins</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {leaderboard.reduce((sum, c) => sum + (c.totalWars || 0), 0)}
            </span>
            <span className="stat-label">Total Wars</span>
          </div>
          <div className="stat-card highlight">
            <span className="stat-value">
              {leaderboard[0]?.clanName || 'N/A'}
            </span>
            <span className="stat-label">🏆 Top Clan</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="leaderboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filteredLeaderboard.length === 0 && (
        <div className="leaderboard-empty">
          <span className="empty-icon">📊</span>
          <h3>No clans found</h3>
          <p>
            {searchQuery 
              ? 'No clans match your search criteria' 
              : 'No clans have participated in wars yet'}
          </p>
          {searchQuery && (
            <button 
              className="empty-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && !error && filteredLeaderboard.length > 0 && (
        <div className="leaderboard-list">
          {/* Header Row */}
          <div className="leaderboard-row header">
            <div className="col-rank">Rank</div>
            <div className="col-clan">Clan</div>
            <div className="col-wins">🏆 Wins</div>
            <div className="col-wars">⚔️ Wars</div>
            <div className="col-rate">📊 Win Rate</div>
            <div className="col-score">⭐ Score</div>
            <div className="col-members">👥 Members</div>
          </div>

          {/* Rows */}
          {filteredLeaderboard.map((clan, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const winRate = clan.winRate || 0;

            return (
              <div
                key={clan.clanId || index}
                className={`leaderboard-row ${isTop3 ? 'top3' : ''}`}
                onClick={() => handleClanClick(clan.clanId)}
              >
                <div className="col-rank">
                  <span 
                    className="rank-badge"
                    style={{ 
                      backgroundColor: isTop3 ? getRankColor(rank) : 'rgba(255,255,255,0.05)',
                      color: isTop3 ? '#000' : 'rgba(255,255,255,0.4)'
                    }}
                  >
                    {getMedal(rank)}
                  </span>
                </div>
                
                <div className="col-clan">
                  <span className="clan-name">{clan.clanName || 'Unknown Clan'}</span>
                  {isTop3 && (
                    <span className="clan-badge">
                      {rank === 1 ? '👑' : rank === 2 ? '⭐' : '🌟'}
                    </span>
                  )}
                </div>
                
                <div className="col-wins">
                  <span className="wins-value">{formatNumber(clan.totalWins || 0)}</span>
                </div>
                
                <div className="col-wars">
                  <span className="wars-value">{formatNumber(clan.totalWars || 0)}</span>
                </div>
                
                <div className="col-rate">
                  <div className="win-rate-container">
                    <div 
                      className="win-rate-bar"
                      style={{ 
                        width: `${Math.min(winRate, 100)}%`,
                        backgroundColor: getWinRateColor(winRate)
                      }}
                    />
                    <span className="win-rate-text">{Math.round(winRate)}%</span>
                  </div>
                </div>
                
                <div className="col-score">
                  <span className="score-value">{formatNumber(clan.totalScore || 0)}</span>
                </div>
                
                <div className="col-members">
                  <span className="members-value">{clan.totalMembers || 0}</span>
                </div>

                <div className="col-action">
                  <span className="action-arrow">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="leaderboard-footer">
        <p>
          Showing {filteredLeaderboard.length} of {leaderboard.length} clans
        </p>
        {filteredLeaderboard.length > 0 && (
          <p className="footer-hint">
            Click on a clan to view their profile
          </p>
        )}
      </div>
    </div>
  );
};

export default WarLeaderboard;
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './WarHistory.css';

const WarHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clanId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [record, setRecord] = useState(null);
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Fetch war history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/clan-war/history/${clanId || user?.clanId}`);
      if (response.data.success) {
        setHistory(response.data.history || []);
        setRecord(response.data.record || { wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 });
        setStreak(response.data.streak || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [clanId, user?.clanId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Get filtered history
  const getFilteredHistory = () => {
    if (filter === 'all') return history;
    return history.filter(h => h.result === filter);
  };

  const filteredHistory = getFilteredHistory();

  // Get result icon
  const getResultIcon = (result) => {
    if (result === 'win') return '🏆';
    if (result === 'loss') return '💀';
    return '🤝';
  };

  // Get result color
  const getResultColor = (result) => {
    if (result === 'win') return '#4ecdc4';
    if (result === 'loss') return '#ff6b6b';
    return '#f59e0b';
  };

  // Get result text
  const getResultText = (result) => {
    if (result === 'win') return 'Victory';
    if (result === 'loss') return 'Defeat';
    return 'Draw';
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Navigate to war details
  const handleViewWar = (warId) => {
    navigate(`/clan/war?warId=${warId}`);
  };

  // Navigate back to clan page
  const handleBack = () => {
    navigate('/clan');
  };

  return (
    <div className="war-history-page">
      {/* Background Effects */}
      <div className="history-bg-noise"></div>
      <div className="history-bg-grid"></div>
      <div className="history-aurora history-aurora-1"></div>
      <div className="history-aurora history-aurora-2"></div>

      {/* Header */}
      <div className="history-header">
        <button className="history-back-btn" onClick={handleBack}>
          ← Back
        </button>
        <div className="history-header-center">
          <h1>📊 War History</h1>
          <span className="history-clan-name">{user?.clanName || 'Your Clan'}</span>
        </div>
        <div className="history-header-right">
          <button className="history-refresh-btn" onClick={fetchHistory} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="history-alert error">{error}</div>}

      {/* Stats Summary */}
      {record && (
        <div className="history-stats">
          <div className="stat-card">
            <span className="stat-value">{record.total || 0}</span>
            <span className="stat-label">Total Wars</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#4ecdc4' }}>{record.wins || 0}</span>
            <span className="stat-label">Wins 🏆</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#ff6b6b' }}>{record.losses || 0}</span>
            <span className="stat-label">Losses 💀</span>
          </div>
          <div className="stat-card">
            <span className="stat-value" style={{ color: '#f59e0b' }}>{record.draws || 0}</span>
            <span className="stat-label">Draws 🤝</span>
          </div>
          <div className="stat-card highlight">
            <span className="stat-value">{record.winRate || 0}%</span>
            <span className="stat-label">Win Rate</span>
          </div>
          <div className="stat-card highlight">
            <span className="stat-value" style={{ color: streak > 0 ? '#4ecdc4' : '#ff6b6b' }}>
              {streak > 0 ? `+${streak}` : streak < 0 ? `${streak}` : '0'}
            </span>
            <span className="stat-label">Streak</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="history-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({history.length})
        </button>
        <button
          className={`filter-btn ${filter === 'win' ? 'active' : ''}`}
          onClick={() => setFilter('win')}
        >
          🏆 Wins ({history.filter(h => h.result === 'win').length})
        </button>
        <button
          className={`filter-btn ${filter === 'loss' ? 'active' : ''}`}
          onClick={() => setFilter('loss')}
        >
          💀 Losses ({history.filter(h => h.result === 'loss').length})
        </button>
        <button
          className={`filter-btn ${filter === 'draw' ? 'active' : ''}`}
          onClick={() => setFilter('draw')}
        >
          🤝 Draws ({history.filter(h => h.result === 'draw').length})
        </button>
      </div>

      {/* History List */}
      {loading ? (
        <div className="history-loading">
          <div className="loading-spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="history-empty">
          <span className="empty-icon">📜</span>
          <h3>No war history yet</h3>
          <p>Your clan hasn't participated in any wars yet.</p>
          <p className="empty-hint">Start a war to make history! ⚔️</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredHistory.map((war, index) => (
            <div 
              key={war._id || index}
              className={`history-item ${war.result}`}
              onClick={() => handleViewWar(war.warId)}
            >
              <div className="history-item-left">
                <div className="history-result-icon" style={{ color: getResultColor(war.result) }}>
                  {getResultIcon(war.result)}
                </div>
                <div className="history-result-text">
                  <span className="result-label" style={{ color: getResultColor(war.result) }}>
                    {getResultText(war.result)}
                  </span>
                  <span className="result-opponent">vs {war.opponentName}</span>
                </div>
              </div>

              <div className="history-item-center">
                <div className="history-score">
                  <span className="score-clan">{war.clanScore}</span>
                  <span className="score-vs">vs</span>
                  <span className="score-opponent">{war.opponentScore}</span>
                </div>
                <div className="history-mvp">
                  {war.mvp?.username && (
                    <span className="mvp-text">
                      🏅 MVP: {war.mvp.username} ({war.mvp.wins} wins)
                    </span>
                  )}
                </div>
              </div>

              <div className="history-item-right">
                <div className="history-date">{formatDate(war.createdAt)}</div>
                <div className="history-attacks">
                  ⚔️ {war.attacksUsed || 0}/{war.totalMembers || 10}
                </div>
                {war.rewardsGiven && (
                  <div className="history-reward">🎁 Rewarded</div>
                )}
              </div>

              <div className="history-item-arrow">→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WarHistory;
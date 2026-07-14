import React from 'react';
import './WarActions.css';

const WarActions = ({
  onRefresh,
  onViewHistory,
  onViewLeaderboard,
  onGoToNotifications,
  onCancelSearch,
  isSearching = false,
  isLeader = false,
  isComplete = false,
  canCancel = false,
  loading = false,
  compact = false
}) => {
  return (
    <div className={`war-actions ${compact ? 'compact' : ''}`}>
      {/* Primary Actions */}
      <div className="actions-primary">
        {/* Refresh Button */}
        <button 
          className="action-btn refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          <span className="btn-icon">🔄</span>
          <span className="btn-text">Refresh</span>
        </button>

        {/* View History */}
        <button 
          className="action-btn history"
          onClick={onViewHistory}
          disabled={loading}
        >
          <span className="btn-icon">📊</span>
          <span className="btn-text">History</span>
        </button>

        {/* Leaderboard */}
        <button 
          className="action-btn leaderboard"
          onClick={onViewLeaderboard}
          disabled={loading}
        >
          <span className="btn-icon">🏆</span>
          <span className="btn-text">Leaderboard</span>
        </button>

        {/* Notifications */}
        <button 
          className="action-btn notifications"
          onClick={onGoToNotifications}
          disabled={loading}
        >
          <span className="btn-icon">🔔</span>
          <span className="btn-text">Notifications</span>
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="actions-secondary">
        {/* Cancel Search (Only for Leader when searching) */}
        {isSearching && isLeader && canCancel && (
          <button 
            className="action-btn cancel-search"
            onClick={onCancelSearch}
            disabled={loading}
          >
            <span className="btn-icon">✖</span>
            <span className="btn-text">Cancel Search</span>
          </button>
        )}

        {/* War Complete Message */}
        {isComplete && (
          <div className="action-complete-message">
            <span className="complete-icon">🏁</span>
            <span className="complete-text">War Complete!</span>
            <span className="complete-hint">Check Notifications for rewards 🎁</span>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="actions-loading">
          <span className="loading-spinner"></span>
          <span className="loading-text">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default WarActions;
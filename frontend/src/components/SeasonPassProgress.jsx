import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SeasonPassProgress.css';

const SeasonPassProgress = ({ 
  seasonData, 
  progress, 
  compact = false,
  showViewAll = true 
}) => {
  const navigate = useNavigate();

  if (!seasonData || !progress) {
    return null;
  }

  const totalTiers = seasonData.totalTiers || 100;
  const currentTier = progress.currentTier || 1;
  const progressPercent = progress.progress || 0;
  const isCompleted = progress.isCompleted || false;
  const correctGuesses = progress.correctGuesses || 0;
  const timeRemaining = seasonData.timeRemaining || '';

  const handleClick = () => {
    navigate('/season-pass');
  };

  return (
    <div className={`season-pass-progress-component ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="sp-header">
        <div className="sp-title">
          <span className="sp-icon">🎫</span>
          <span className="sp-name">{seasonData.seasonName || `Season ${seasonData.seasonNumber}`}</span>
        </div>
        {showViewAll && (
          <button className="sp-view-btn" onClick={handleClick}>
            View All →
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="sp-stats">
        <div className="sp-stat">
          <span className="sp-stat-value">{currentTier}</span>
          <span className="sp-stat-label">Tier</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-value">{correctGuesses}</span>
          <span className="sp-stat-label">Correct Guesses</span>
        </div>
        <div className="sp-stat">
          <span className="sp-stat-value">{Math.round(progressPercent)}%</span>
          <span className="sp-stat-label">Progress</span>
        </div>
        {timeRemaining && (
          <div className="sp-stat">
            <span className="sp-stat-value sp-time">{timeRemaining}</span>
            <span className="sp-stat-label">Remaining</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="sp-progress-bar">
        <div 
          className="sp-progress-fill"
          style={{
            width: `${Math.min(progressPercent, 100)}%`,
            background: isCompleted
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
              : 'linear-gradient(90deg, #4a9eff, #8b5cf6)'
          }}
        />
        {isCompleted && (
          <div className="sp-progress-completed-badge">🏆</div>
        )}
      </div>

      {/* Mini Tiers Preview */}
      {!compact && (
        <div className="sp-tiers-preview">
          <div className="sp-tiers-row">
            {[...Array(Math.min(10, totalTiers))].map((_, index) => {
              const tierNumber = index + 1;
              const isUnlocked = tierNumber <= currentTier;
              
              return (
                <div 
                  key={index}
                  className={`sp-tier-dot ${isUnlocked ? 'unlocked' : 'locked'}`}
                  style={{
                    background: isUnlocked 
                      ? `linear-gradient(135deg, #4a9eff, #8b5cf6)`
                      : 'rgba(255,255,255,0.05)'
                  }}
                  title={`Tier ${tierNumber}`}
                />
              );
            })}
            {totalTiers > 10 && (
              <div className="sp-tier-more">+{totalTiers - 10} more</div>
            )}
          </div>
        </div>
      )}

      {/* Compact: Show only progress text */}
      {compact && (
        <div className="sp-compact-info">
          <span className="sp-compact-text">
            {isCompleted ? '🏆 Completed!' : `${currentTier}/${totalTiers} tiers`}
          </span>
          <span className="sp-compact-progress">{Math.round(progressPercent)}%</span>
        </div>
      )}

      {/* Click to view */}
      {!compact && (
        <div className="sp-footer">
          <button className="sp-footer-btn" onClick={handleClick}>
            View Full Season Pass →
          </button>
        </div>
      )}
    </div>
  );
};

export default SeasonPassProgress;
import React from 'react';
import './WarStats.css';

const WarStats = ({
  stats = {},
  compact = false
}) => {
  const {
    mostWins = null,
    mostWinsCount = 0,
    mostAttacks = null,
    mostAttacksCount = 0,
    mvp = null,
    totalBattles = 0,
    totalWins = 0,
    totalLosses = 0,
    winRate = 0,
    clan1Wins = 0,
    clan2Wins = 0,
    clan1Name = 'Clan 1',
    clan2Name = 'Clan 2',
    timeRemaining = null,
    phase = 'battle'
  } = stats;

  // Get phase icon
  const getPhaseIcon = () => {
    const icons = {
      'searching': '🔍',
      'preparation': '📋',
      'battle': '⚔️',
      'completed': '🏁'
    };
    return icons[phase] || '⚔️';
  };

  // Get phase color
  const getPhaseColor = () => {
    const colors = {
      'searching': '#f59e0b',
      'preparation': '#4a9eff',
      'battle': '#ff6b6b',
      'completed': '#4ecdc4'
    };
    return colors[phase] || '#a0a0a0';
  };

  // Format time
  const formatTime = (seconds) => {
    if (!seconds) return '--:--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`war-stats ${compact ? 'compact' : ''}`}>
      {/* Phase Indicator */}
      <div className="stats-phase">
        <span className="phase-icon">{getPhaseIcon()}</span>
        <span className="phase-text" style={{ color: getPhaseColor() }}>
          {phase.charAt(0).toUpperCase() + phase.slice(1)} Phase
        </span>
        {timeRemaining && (
          <span className="phase-timer">
            ⏱️ {formatTime(timeRemaining)}
          </span>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        {/* Total Battles */}
        <div className="stat-item">
          <span className="stat-icon">⚔️</span>
          <span className="stat-value">{totalBattles}</span>
          <span className="stat-label">Total Battles</span>
        </div>

        {/* Win Rate */}
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <span className="stat-value">{winRate}%</span>
          <span className="stat-label">Win Rate</span>
        </div>

        {/* Wins / Losses */}
        <div className="stat-item">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{totalWins}</span>
          <span className="stat-label">Wins</span>
        </div>

        <div className="stat-item">
          <span className="stat-icon">❌</span>
          <span className="stat-value">{totalLosses}</span>
          <span className="stat-label">Losses</span>
        </div>
      </div>

      {/* MVP Section */}
      {mvp && (
        <div className="stats-mvp">
          <div className="mvp-badge">
            <span className="mvp-icon">🏅</span>
            <span className="mvp-label">MVP</span>
          </div>
          <div className="mvp-info">
            <span className="mvp-name">{mvp.username || 'Unknown'}</span>
            <span className="mvp-wins">{mvp.wins || 0} wins</span>
          </div>
        </div>
      )}

      {/* Top Performers */}
      <div className="stats-performers">
        {/* Most Wins */}
        {mostWins && (
          <div className="performer-item">
            <span className="performer-icon">🏆</span>
            <span className="performer-label">Most Wins</span>
            <span className="performer-name">{mostWins}</span>
            <span className="performer-count">{mostWinsCount}</span>
          </div>
        )}

        {/* Most Attacks */}
        {mostAttacks && (
          <div className="performer-item">
            <span className="performer-icon">⚔️</span>
            <span className="performer-label">Most Attacks</span>
            <span className="performer-name">{mostAttacks}</span>
            <span className="performer-count">{mostAttacksCount}</span>
          </div>
        )}
      </div>

      {/* Clan Score Comparison (if both clans have data) */}
      {(clan1Wins > 0 || clan2Wins > 0) && (
        <div className="stats-clan-comparison">
          <div className="clan-comp-item">
            <span className="clan-comp-name">{clan1Name}</span>
            <span className="clan-comp-score">{clan1Wins}</span>
            <div className="clan-comp-bar">
              <div 
                className="clan-comp-fill"
                style={{ 
                  width: `${(clan1Wins / 10) * 100}%`,
                  backgroundColor: clan1Wins > clan2Wins ? '#4ecdc4' : '#a0a0a0'
                }}
              />
            </div>
          </div>
          <div className="clan-comp-vs">VS</div>
          <div className="clan-comp-item">
            <span className="clan-comp-name">{clan2Name}</span>
            <span className="clan-comp-score">{clan2Wins}</span>
            <div className="clan-comp-bar">
              <div 
                className="clan-comp-fill"
                style={{ 
                  width: `${(clan2Wins / 10) * 100}%`,
                  backgroundColor: clan2Wins > clan1Wins ? '#ff6b6b' : '#a0a0a0'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarStats;
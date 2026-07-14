import React from 'react';
import './WarHeader.css';

const WarHeader = ({
  clan1Name,
  clan2Name,
  clan1Score,
  clan2Score,
  timeLeft,
  status,
  isComplete,
  winner
}) => {
  // Format time left
  const formatTimeLeft = (time) => {
    if (!time) return '--:--:--';
    
    const parts = time.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h ${minutes}m`;
      }
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return time;
  };

  // Get status color
  const getStatusColor = () => {
    if (isComplete) return '#4ecdc4';
    if (status === 'searching') return '#f59e0b';
    if (status === 'preparation') return '#4a9eff';
    if (status === 'battle') return '#ff6b6b';
    return '#a0a0a0';
  };

  // Get status text
  const getStatusText = () => {
    if (isComplete) {
      if (winner === 'clan1') return `${clan1Name} Wins! 🏆`;
      if (winner === 'clan2') return `${clan2Name} Wins! 🏆`;
      return 'Draw! 🤝';
    }
    if (status === 'searching') return '🔍 Searching for opponent...';
    if (status === 'preparation') return '📋 Preparation Phase';
    if (status === 'battle') return '⚔️ Battle Phase';
    return 'Unknown';
  };

  // Get status emoji
  const getStatusEmoji = () => {
    if (isComplete) {
      if (winner === 'clan1' || winner === 'clan2') return '🏆';
      return '🤝';
    }
    if (status === 'searching') return '🔍';
    if (status === 'preparation') return '📋';
    if (status === 'battle') return '⚔️';
    return '❓';
  };

  // Determine winner text
  const getWinnerText = () => {
    if (!isComplete) return null;
    if (winner === 'clan1') return `${clan1Name} is the Champion! 🎉`;
    if (winner === 'clan2') return `${clan2Name} is the Champion! 🎉`;
    return 'It\'s a Draw! 🤝';
  };

  return (
    <div className="war-header">
      <div className="war-header-bg"></div>
      
      <div className="war-header-top">
        <div className="war-header-title">
          <span className="war-header-icon">⚔️</span>
          <span className="war-header-name">CLAN WAR</span>
        </div>
        <div className="war-header-status" style={{ color: getStatusColor() }}>
          <span className="status-dot" style={{ backgroundColor: getStatusColor() }}></span>
          {getStatusText()}
        </div>
      </div>

      <div className="war-header-score">
        {/* Clan 1 */}
        <div className="score-clan">
          <div className="score-clan-name">{clan1Name || 'Clan 1'}</div>
          <div className="score-clan-value">{clan1Score || 0}</div>
        </div>

        {/* VS */}
        <div className="score-vs">
          <span className="vs-text">VS</span>
          <div className="vs-timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTimeLeft(timeLeft)}</span>
          </div>
        </div>

        {/* Clan 2 */}
        <div className="score-clan">
          <div className="score-clan-name">{clan2Name || 'Clan 2'}</div>
          <div className="score-clan-value">{clan2Score || 0}</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="war-score-bar">
        <div 
          className="war-score-bar-fill clan1"
          style={{ 
            width: `${((clan1Score || 0) / 10) * 100}%`,
            backgroundColor: clan1Score > clan2Score ? '#4ecdc4' : '#a0a0a0'
          }}
        ></div>
        <div 
          className="war-score-bar-fill clan2"
          style={{ 
            width: `${((clan2Score || 0) / 10) * 100}%`,
            backgroundColor: clan2Score > clan1Score ? '#4ecdc4' : '#a0a0a0'
          }}
        ></div>
      </div>

      {/* Winner announcement */}
      {isComplete && (
        <div className={`war-winner-announcement ${winner ? 'victory' : 'draw'}`}>
          <span className="winner-emoji">{getStatusEmoji()}</span>
          <span className="winner-text">{getWinnerText()}</span>
        </div>
      )}

      {/* Score labels */}
      <div className="war-score-labels">
        <span className="score-label clan1-label">{clan1Name || 'Clan 1'}</span>
        <span className="score-label total-label">/10</span>
        <span className="score-label clan2-label">{clan2Name || 'Clan 2'}</span>
      </div>

      {/* Attack counters */}
      <div className="war-attack-counters">
        <span className="attack-counter clan1">
          ⚔️ {clan1Score || 0}/10
        </span>
        <span className="attack-counter clan2">
          ⚔️ {clan2Score || 0}/10
        </span>
      </div>
    </div>
  );
};

export default WarHeader;
import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import './TeamDisplay.css';

const TeamDisplay = ({
  teamName,
  players = [],
  showCards = true,
  isOurTeam = true,
  onAttack,
  canAttack = false,
  currentUserId = null,
  maxDisplay = 10,
  compact = false
}) => {
  const [showAll, setShowAll] = useState(false);

  // Count players by status
  const getStatusCounts = () => {
    const counts = {
      win: 0,
      loss: 0,
      pending: 0
    };

    players.forEach(player => {
      if (!player.hasAttacked) {
        counts.pending++;
      } else if (player.battleResult === 'win') {
        counts.win++;
      } else if (player.battleResult === 'loss') {
        counts.loss++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();
  const displayedPlayers = showAll ? players : players.slice(0, maxDisplay);
  const hasMore = players.length > maxDisplay;

  // Get status emoji
  const getStatusEmoji = () => {
    if (statusCounts.win === players.length && players.length > 0) return '🏆';
    if (statusCounts.loss === players.length && players.length > 0) return '💀';
    return '⚔️';
  };

  // Get win rate
  const getWinRate = () => {
    const totalAttacked = statusCounts.win + statusCounts.loss;
    if (totalAttacked === 0) return 0;
    return Math.round((statusCounts.win / totalAttacked) * 100);
  };

  return (
    <div className={`team-display ${compact ? 'compact' : ''} ${isOurTeam ? 'our-team' : 'opponent-team'}`}>
      {/* Team Header */}
      <div className="team-header">
        <div className="team-header-left">
          <span className="team-icon">
            {isOurTeam ? '🛡️' : '⚔️'}
          </span>
          <h3 className="team-name">{teamName}</h3>
          <span className="team-member-count">({players.length}/10)</span>
        </div>
        <div className="team-header-right">
          <div className="team-status-badge">
            <span className="status-emoji">{getStatusEmoji()}</span>
            <span className="status-text">
              {statusCounts.win}W - {statusCounts.loss}L - {statusCounts.pending}P
            </span>
          </div>
          {players.length > 0 && (
            <div className="team-win-rate">
              <span className="win-rate-value">{getWinRate()}%</span>
              <span className="win-rate-label">Win Rate</span>
            </div>
          )}
        </div>
      </div>

      {/* Attack Progress Bar */}
      <div className="team-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill win"
            style={{ 
              width: `${(statusCounts.win / players.length) * 100}%`,
              backgroundColor: '#4ecdc4'
            }}
          />
          <div 
            className="progress-fill loss"
            style={{ 
              width: `${(statusCounts.loss / players.length) * 100}%`,
              backgroundColor: '#ff6b6b'
            }}
          />
          <div 
            className="progress-fill pending"
            style={{ 
              width: `${(statusCounts.pending / players.length) * 100}%`,
              backgroundColor: '#f59e0b'
            }}
          />
        </div>
        <div className="progress-labels">
          <span className="progress-label win">
            ✅ {statusCounts.win} Won
          </span>
          <span className="progress-label loss">
            ❌ {statusCounts.loss} Lost
          </span>
          <span className="progress-label pending">
            ⏳ {statusCounts.pending} Pending
          </span>
        </div>
      </div>

      {/* Players Grid */}
      <div className={`players-grid ${compact ? 'compact' : ''}`}>
        {displayedPlayers.map((player, index) => {
          const isCurrentUser = player.userId === currentUserId;
          
          return (
            <PlayerCard
              key={player.userId || index}
              player={player}
              showCard={showCards}
              isOurTeam={isOurTeam}
              onAttack={onAttack}
              canAttack={canAttack && !player.hasAttacked}
              isCurrentUser={isCurrentUser}
            />
          );
        })}
      </div>

      {/* Show More / Less Button */}
      {hasMore && (
        <button 
          className="show-more-btn"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show Less' : `Show ${players.length - maxDisplay} More`}
          <span className="btn-arrow">{showAll ? '▲' : '▼'}</span>
        </button>
      )}

      {/* Empty State */}
      {players.length === 0 && (
        <div className="team-empty">
          <span className="empty-icon">👤</span>
          <p className="empty-text">No players in this team yet</p>
        </div>
      )}

      {/* Attack Status Summary */}
      {isOurTeam && players.length > 0 && (
        <div className="team-attack-summary">
          <span className="summary-text">
            ⚔️ Attacks Used: {statusCounts.win + statusCounts.loss}/{players.length}
          </span>
          {statusCounts.pending === 0 && players.length > 0 && (
            <span className="summary-complete">
              {statusCounts.win > statusCounts.loss ? '🏆 Winning!' : 
               statusCounts.win < statusCounts.loss ? '💀 Losing!' : 
               '🤝 Tied!'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamDisplay;
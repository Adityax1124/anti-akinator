import React from 'react';
import './PlayerCard.css';

const PlayerCard = ({
  player,
  showCard = true,
  isOurTeam = true,
  onAttack,
  canAttack = false,
  isCurrentUser = false
}) => {
  const {
    userId,
    username,
    hasAttacked,
    battleResult,
    attackedUserId,
    attackedUsername,
    selectedCard,
    showCard: showCardProp
  } = player;

  // Determine status
  const getStatusIcon = () => {
    if (!hasAttacked) return '⏳';
    if (battleResult === 'win') return '✅';
    if (battleResult === 'loss') return '❌';
    return '⏳';
  };

  const getStatusText = () => {
    if (!hasAttacked) return 'Not Attacked';
    if (battleResult === 'win') return 'Won! 🎉';
    if (battleResult === 'loss') return 'Lost 💀';
    return 'Pending';
  };

  const getStatusClass = () => {
    if (!hasAttacked) return 'status-pending';
    if (battleResult === 'win') return 'status-win';
    if (battleResult === 'loss') return 'status-loss';
    return 'status-pending';
  };

  const getStatusColor = () => {
    if (!hasAttacked) return '#f59e0b';
    if (battleResult === 'win') return '#4ecdc4';
    if (battleResult === 'loss') return '#ff6b6b';
    return '#f59e0b';
  };

  // Get card rarity color
  const getRarityColor = (rarity) => {
    const colors = {
      'Common': '#a0a0a0',
      'Uncommon': '#4ecdc4',
      'Rare': '#4a9eff',
      'Epic': '#a855f7',
      'Legendary': '#f59e0b'
    };
    return colors[rarity] || '#a0a0a0';
  };

  // Get card rarity stars
  const getRarityStars = (rarity) => {
    const stars = {
      'Common': '⭐',
      'Uncommon': '⭐⭐',
      'Rare': '⭐⭐⭐',
      'Epic': '⭐⭐⭐⭐',
      'Legendary': '⭐⭐⭐⭐⭐'
    };
    return stars[rarity] || '⭐';
  };

  // Get element emoji
  const getElementEmoji = (element) => {
    const emojis = {
      'Fire': '🔥',
      'Water': '💧',
      'Wind': '🌪️',
      'Earth': '🌍'
    };
    return emojis[element] || '❓';
  };

  // Handle attack click
  const handleAttack = () => {
    if (canAttack && !hasAttacked && onAttack) {
      onAttack(userId);
    }
  };

  // Determine if attack button should show
  const showAttackButton = canAttack && !hasAttacked && !isOurTeam;

  return (
    <div className={`player-card ${getStatusClass()} ${isOurTeam ? 'our-team' : 'opponent-team'}`}>
      {/* Player Avatar / Icon */}
      <div className="player-avatar">
        <div className="player-avatar-inner">
          {username ? username.charAt(0).toUpperCase() : '?'}
        </div>
        <div 
          className="player-status-dot" 
          style={{ backgroundColor: getStatusColor() }}
        ></div>
      </div>

      {/* Player Info */}
      <div className="player-info">
        <div className="player-name">
          {username || 'Unknown'}
          {isCurrentUser && <span className="player-badge">(You)</span>}
        </div>
        
        {/* Card Display */}
        {showCard && selectedCard ? (
          <div className="player-card-info">
            <div 
              className="card-rarity-badge"
              style={{ 
                borderColor: getRarityColor(selectedCard.rarity),
                color: getRarityColor(selectedCard.rarity)
              }}
            >
              {getRarityStars(selectedCard.rarity)}
            </div>
            <span className="card-name">
              {getElementEmoji(selectedCard.element)} {selectedCard.name}
            </span>
            <span className="card-power">
              ⚡ {selectedCard.power || 0}
            </span>
          </div>
        ) : showCard && !selectedCard ? (
          <div className="player-no-card">
            <span className="no-card-text">❌ No Card Selected</span>
          </div>
        ) : (
          <div className="player-hidden-card">
            <span className="hidden-card-text">🃏 Card Hidden</span>
          </div>
        )}

        {/* Attack Status */}
        <div className="player-status">
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
          {hasAttacked && attackedUsername && (
            <span className="attacked-info">
              vs {attackedUsername}
            </span>
          )}
        </div>
      </div>

      {/* Attack Button */}
      {showAttackButton && (
        <button 
          className="attack-btn"
          onClick={handleAttack}
          disabled={hasAttacked}
        >
          ⚔️ Attack
        </button>
      )}

      {/* Attacked indicator for opponent */}
      {!isOurTeam && hasAttacked && (
        <div className="attacked-indicator">
          {battleResult === 'win' ? '✅' : '❌'}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
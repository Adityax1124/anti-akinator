import React, { useState } from 'react';
import api from '../api/axios';
import './CardModal.css';

const CardModal = ({ card, onClose, onUpgradeSuccess, userGems }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get upgrade info
  const getUpgradeInfo = (level) => {
    const upgradeData = {
      1: { cost: 10, powerIncrease: 1, nextLevel: 2 },
      2: { cost: 15, powerIncrease: 1, nextLevel: 3 },
      3: { cost: 20, powerIncrease: 2, nextLevel: 4 },
      4: { cost: 30, powerIncrease: 2, nextLevel: 5 },
      5: { cost: 40, powerIncrease: 2, nextLevel: 6 },
      6: { cost: 55, powerIncrease: 3, nextLevel: 7 },
      7: { cost: 70, powerIncrease: 3, nextLevel: 8 },
      8: { cost: 90, powerIncrease: 4, nextLevel: 9 },
      9: { cost: 120, powerIncrease: 4, nextLevel: 10 },
      10: { cost: 0, powerIncrease: 0, nextLevel: null, isMax: true }
    };
    return upgradeData[level] || upgradeData[1];
  };

  const currentLevel = card.level || 1;
  const isMaxLevel = currentLevel >= 10;
  const upgradeInfo = getUpgradeInfo(currentLevel);
  const canUpgrade = !isMaxLevel && (userGems || 0) >= upgradeInfo.cost;

  const handleUpgrade = async () => {
    if (!canUpgrade) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/cards/upgrade', {
        characterId: card.characterId
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        const updatedCard = response.data.card;
        onUpgradeSuccess(updatedCard);
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upgrade card');
    } finally {
      setLoading(false);
    }
  };

  // Get rarity color
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

  // Get rarity stars
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

  const rarityColor = getRarityColor(card.rarity);

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Card Image */}
        <div className="modal-card-image" style={{ borderColor: rarityColor }}>
          {card.image ? (
            <img src={card.image} alt={card.characterName} className="modal-card-img" />
          ) : (
            <div className="modal-card-placeholder">
              {card.characterName?.charAt(0) || '?'}
            </div>
          )}
          <div className="modal-card-badges">
            <span className="modal-element-badge">{getElementEmoji(card.element)}</span>
            <span className="modal-level-badge">Lv.{currentLevel}/10</span>
          </div>
        </div>

        {/* Card Info */}
        <div className="modal-card-info">
          <h2 className="modal-card-name">{card.characterName || 'Unknown'}</h2>
          <div className="modal-card-rarity" style={{ color: rarityColor }}>
            {getRarityStars(card.rarity)} {card.rarity}
          </div>
          <div className="modal-card-element">
            <span className="element-label">Element:</span>
            <span className="element-value">{getElementEmoji(card.element)} {card.element}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="modal-stats">
          <div className="modal-stat">
            <span className="stat-label">Current Power</span>
            <span className="stat-value">⚡ {card.currentPower || card.powerLevel || 0}</span>
          </div>
          <div className="modal-stat">
            <span className="stat-label">Base Power</span>
            <span className="stat-value">{card.basePower || card.powerLevel || 0}</span>
          </div>
          <div className="modal-stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{currentLevel}/10</span>
          </div>
          <div className="modal-stat">
            <span className="stat-label">Gems</span>
            <span className="stat-value gems">💎 {userGems || 0}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="modal-progress">
          <div className="progress-label">
            <span>Progress to Level 10</span>
            <span>{Math.round((currentLevel / 10) * 100)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(currentLevel / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Upgrade Section */}
        {!isMaxLevel ? (
          <div className="modal-upgrade">
            <div className="upgrade-info">
              <div className="upgrade-detail">
                <span className="upgrade-label">Next Level</span>
                <span className="upgrade-value">{upgradeInfo.nextLevel}</span>
              </div>
              <div className="upgrade-detail">
                <span className="upgrade-label">Power Increase</span>
                <span className="upgrade-value">+{upgradeInfo.powerIncrease}</span>
              </div>
              <div className="upgrade-detail">
                <span className="upgrade-label">Cost</span>
                <span className={`upgrade-value ${canUpgrade ? 'affordable' : 'expensive'}`}>
                  💎 {upgradeInfo.cost}
                </span>
              </div>
            </div>

            <button
              className={`upgrade-btn ${canUpgrade ? 'active' : 'disabled'}`}
              onClick={handleUpgrade}
              disabled={!canUpgrade || loading}
            >
              {loading ? '⏳ Upgrading...' : `⬆️ Upgrade to Level ${upgradeInfo.nextLevel}`}
            </button>

            {!canUpgrade && !loading && (
              <p className="upgrade-hint">
                Need {upgradeInfo.cost - (userGems || 0)} more gems
              </p>
            )}

            {error && <p className="upgrade-error">{error}</p>}
            {success && <p className="upgrade-success">{success}</p>}
          </div>
        ) : (
          <div className="modal-max-level">
            <div className="max-level-icon">🏆</div>
            <h3>MAX LEVEL!</h3>
            <p>This card has reached its maximum potential</p>
            <p className="max-power">⚡ Power: {card.currentPower || card.powerLevel || 0}</p>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default CardModal;
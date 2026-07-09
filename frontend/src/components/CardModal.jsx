import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import './CardModal.css';

const CardModal = ({ card, onClose, onUpgradeSuccess, userGems }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSellConfirm, setShowSellConfirm] = useState(false);

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

  // ✅ CORRECTED: Calculate sell price
const getSellPrice = (card) => {
  const basePrices = {
    'Common': 5,
    'Uncommon': 25,
    'Rare': 60,
    'Epic': 150,
    'Legendary': 350
  };

  const levelBonus = {
    'Common': { 1: 0, 2: 3, 3: 6, 4: 9, 5: 15, 6: 18, 7: 21, 8: 25, 9: 30, 10: 35 },
    'Uncommon': { 1: 0, 2: 4, 3: 8, 4: 12, 5: 15, 6: 20, 7: 25, 8: 30, 9: 35, 10: 40 },
    'Rare': { 1: 0, 2: 5, 3: 10, 4: 15, 5: 25, 6: 30, 7: 35, 8: 40, 9: 50, 10: 60 },
    'Epic': { 1: 0, 2: 10, 3: 20, 4: 30, 5: 50, 6: 65, 7: 80, 8: 95, 9: 110, 10: 130 },
    'Legendary': { 1: 0, 2: 20, 3: 40, 4: 60, 5: 100, 6: 130, 7: 160, 8: 190, 9: 220, 10: 250 }
  };

  const rarity = card.rarity || 'Common';
  const level = card.level || 1;
  const basePrice = basePrices[rarity] || 5;
  const bonus = levelBonus[rarity]?.[level] || 0;
  
  return basePrice + bonus;
};

  const currentLevel = card.level || 1;
  const isMaxLevel = currentLevel >= 10;
  const upgradeInfo = getUpgradeInfo(currentLevel);
  const canUpgrade = !isMaxLevel && (userGems || 0) >= upgradeInfo.cost;
  const sellPrice = getSellPrice(card);

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

  // ✅ Handle Sell Card
  const handleSell = async () => {
    if (!showSellConfirm) {
      setShowSellConfirm(true);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/cards/sell', {
        cardId: card.characterId
      });

      if (response.data.success) {
        setSuccess(`✅ Card sold for ${response.data.gemsEarned} 💎 gems!`);
        onUpgradeSuccess({ sold: true, gemsEarned: response.data.gemsEarned });
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to sell card');
      setShowSellConfirm(false);
    } finally {
      setLoading(false);
    }
  };

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

  const getElementEmoji = (element) => {
    const emojis = {
      'Fire': '🔥',
      'Water': '💧',
      'Wind': '🌪️',
      'Earth': '🌍'
    };
    return emojis[element] || '❓';
  };

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

  const modalContent = (
    <div className="card-modal-overlay" onClick={onClose}>
      <div className="card-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

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

        {!isMaxLevel ? (
          <div className="modal-upgrade">
            <div className="upgrade-info">
              <div className="upgrade-detail">
                <div className="upgrade-icon">🔼</div>
                <span className="upgrade-label">Next Level</span>
                <span className="upgrade-value">{upgradeInfo.nextLevel}</span>
              </div>
              <div className="upgrade-detail">
                <div className="upgrade-icon">⚡</div>
                <span className="upgrade-label">Power</span>
                <span className="upgrade-value power">+{upgradeInfo.powerIncrease}</span>
              </div>
              <div className="upgrade-detail">
                <div className="upgrade-icon">💎</div>
                <span className="upgrade-label">Cost</span>
                <span className={`upgrade-value ${canUpgrade ? 'affordable' : 'expensive'}`}>
                  {upgradeInfo.cost}
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

        {/* ✅ SELL SECTION - Below Upgrade */}
        <div className="modal-sell">
          <div className="sell-divider"></div>
          <div className="sell-info">
            <span className="sell-label">💰 Sell Card</span>
            <span className="sell-price">{sellPrice} 💎</span>
          </div>
          <p className="sell-hint">
            {showSellConfirm ? (
              <span className="sell-warning-text">⚠️ Are you sure? This card will be permanently removed!</span>
            ) : (
              <span>Card will be removed from your collection</span>
            )}
          </p>
          <div className="sell-buttons">
            <button
              className={`btn-sell ${showSellConfirm ? 'confirm' : ''}`}
              onClick={handleSell}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : showSellConfirm ? '✅ Confirm Sell' : '💰 Sell Card'}
            </button>
            {showSellConfirm && (
              <button
                className="btn-sell-cancel"
                onClick={() => setShowSellConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CardModal;
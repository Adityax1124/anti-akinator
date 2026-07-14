import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import './TreasureChestModal.css';

const TreasureChestModal = ({ chestId, onClose, onOpened }) => {
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [chest, setChest] = useState(null);
  const [reward, setReward] = useState(null);
  const [isOpened, setIsOpened] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Fetch chest details
  useEffect(() => {
    const fetchChest = async () => {
      try {
        const response = await api.get(`/chests/${chestId}`);
        if (response.data.success) {
          setChest(response.data.chest);
          setIsOpened(response.data.chest.isOpened);
          if (response.data.chest.isOpened) {
            setReward(response.data.chest.reward);
          }
        } else {
          setError('Failed to load chest');
        }
      } catch (err) {
        console.error('Fetch chest error:', err);
        setError(err.response?.data?.message || 'Failed to load chest');
      } finally {
        setLoading(false);
      }
    };

    fetchChest();
  }, [chestId]);

  // Handle open chest
  const handleOpenChest = async () => {
    if (opening || isOpened) return;

    setOpening(true);
    setError('');

    try {
      const response = await api.post(`/chests/${chestId}/open`);
      if (response.data.success) {
        setReward(response.data.reward);
        setIsOpened(true);
        setShowConfetti(true);
        
        // Trigger confetti animation
        setTimeout(() => setShowConfetti(false), 3000);
        
        if (onOpened) {
          onOpened(response.data.reward);
        }
      } else {
        setError(response.data.message || 'Failed to open chest');
      }
    } catch (err) {
      console.error('Open chest error:', err);
      setError(err.response?.data?.message || 'Failed to open chest');
    } finally {
      setOpening(false);
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

  // Modal content
  const modalContent = (
    <div className="chest-modal-overlay" onClick={onClose}>
      <div className="chest-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="chest-modal-close" onClick={onClose}>✕</button>

        {/* Loading State */}
        {loading && (
          <div className="chest-loading">
            <div className="chest-loading-spinner"></div>
            <p>Opening chest...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="chest-error">
            <span className="error-icon">❌</span>
            <p>{error}</p>
            <button className="error-btn" onClick={onClose}>Close</button>
          </div>
        )}

        {/* Chest Content */}
        {!loading && !error && (
          <>
            {/* Header */}
            <div className="chest-header">
              <span className="chest-icon">🎁</span>
              <h2>Treasure Chest</h2>
              {isOpened && <span className="chest-opened-badge">✓ Opened</span>}
              {chest?.expiresAt && !isOpened && (
                <span className="chest-expires">
                  Expires: {new Date(chest.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Chest Visual */}
            <div className={`chest-visual ${isOpened ? 'opened' : ''}`}>
              {!isOpened ? (
                <div className="chest-closed">
                  <div className="chest-box">
                    <div className="chest-lid">
                      <div className="chest-lid-line"></div>
                    </div>
                    <div className="chest-body">
                      <div className="chest-lock"></div>
                      <div className="chest-strap chest-strap-1"></div>
                      <div className="chest-strap chest-strap-2"></div>
                    </div>
                  </div>
                  <div className="chest-glow"></div>
                </div>
              ) : (
                <div className="chest-opened">
                  {reward?.type === 'card' ? (
                    <div className="card-reward">
                      <div 
                        className="card-reward-visual"
                        style={{ borderColor: getRarityColor(reward.card.rarity) }}
                      >
                        {reward.card.image ? (
                          <img 
                            src={reward.card.image} 
                            alt={reward.card.name}
                            className="card-reward-image"
                          />
                        ) : (
                          <div className="card-reward-placeholder">
                            {reward.card.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="card-reward-rarity" style={{ color: getRarityColor(reward.card.rarity) }}>
                          {getRarityStars(reward.card.rarity)} {reward.card.rarity}
                        </div>
                        <div className="card-reward-element">
                          {getElementEmoji(reward.card.element)} {reward.card.element}
                        </div>
                        <div className="card-reward-power">
                          ⚡ {reward.card.power || 0}
                        </div>
                      </div>
                      <div className="card-reward-info">
                        <h3>{reward.card.name}</h3>
                        <p className="card-reward-rarity-text" style={{ color: getRarityColor(reward.card.rarity) }}>
                          {reward.card.rarity} Card
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="gems-reward">
                      <div className="gems-reward-visual">
                        <span className="gems-icon">💎</span>
                        <span className="gems-amount">{reward?.gemsAmount || 200}</span>
                      </div>
                      <div className="gems-reward-info">
                        <h3>Gems Reward!</h3>
                        {reward?.wasDuplicate && (
                          <p className="gems-duplicate-text">
                            You already owned this card. Converted to gems!
                          </p>
                        )}
                        <p className="gems-amount-text">
                          +{reward?.gemsAmount || 200} 💎 Gems
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            {!isOpened ? (
              <button
                className={`chest-open-btn ${opening ? 'opening' : ''}`}
                onClick={handleOpenChest}
                disabled={opening}
              >
                {opening ? (
                  <>
                    <span className="btn-spinner"></span>
                    Opening...
                  </>
                ) : (
                  '🔓 Open Chest'
                )}
              </button>
            ) : (
              <button className="chest-close-btn" onClick={onClose}>
                👍 Awesome!
              </button>
            )}

            {/* War Details */}
            {chest?.warDetails && (
              <div className="chest-war-details">
                <span className="war-detail">
                  ⚔️ {chest.warDetails.clan1Name} vs {chest.warDetails.clan2Name}
                </span>
                <span className="war-detail-score">
                  Score: {chest.warDetails.score}
                </span>
                <span className={`war-detail-result ${chest.warDetails.result}`}>
                  {chest.warDetails.result === 'win' ? '🏆 Victory!' : 
                   chest.warDetails.result === 'loss' ? '💀 Defeat' : '🤝 Draw'}
                </span>
              </div>
            )}
          </>
        )}

        {/* Confetti Effect */}
        {showConfetti && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div 
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TreasureChestModal;
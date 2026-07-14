import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import './GiftModal.css';

const GiftModal = ({ notification, onClose, onClaimed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleClaim = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/notifications/claim-gift/${notification._id}`);
      if (response.data.success) {
        setSuccess(response.data.message);
        if (onClaimed) {
          onClaimed(response.data);
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim gift');
    } finally {
      setLoading(false);
    }
  };

  const getGiftIcon = (type) => {
    const icons = {
      'card': '🃏',
      'title': '🏆',
      'banner': '🎨',
      'profilePhoto': '📸',
      'shards': '🎴',
      'gems': '💎'
    };
    return icons[type] || '🎁';
  };

  const getGiftColor = (type) => {
    const colors = {
      'card': '#a855f7',
      'title': '#f59e0b',
      'banner': '#4a9eff',
      'profilePhoto': '#4ecdc4',
      'shards': '#ff6b6b',
      'gems': '#fbbf24'
    };
    return colors[type] || '#a0a0a0';
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

  const getElementEmoji = (element) => {
    const emojis = {
      'Fire': '🔥',
      'Water': '💧',
      'Wind': '🌪️',
      'Earth': '🌍'
    };
    return emojis[element] || '❓';
  };

  const giftData = notification.data || {};
  const isCard = giftData.giftType === 'card';

  const modalContent = (
    <div className="gift-modal-overlay" onClick={onClose}>
      <div className="gift-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gift-modal-close" onClick={onClose}>✕</button>
        
        <div className="gift-modal-icon">
          {getGiftIcon(giftData.giftType)}
        </div>
        
        <h2>🎁 You received a gift!</h2>
        
        <div className="gift-details">
          <div 
            className="gift-item" 
            style={{ 
              borderColor: isCard ? getRarityColor(giftData.cardRarity) : getGiftColor(giftData.giftType)
            }}
          >
            {/* Gift Type Label */}
            <span className="gift-type-label">
              {giftData.giftType?.toUpperCase() || 'GIFT'}
            </span>

            {/* Gift Content */}
            {isCard && giftData.itemName ? (
              <div className="gift-card-display">
                <div 
                  className="gift-card-visual"
                  style={{ 
                    borderColor: getRarityColor(giftData.cardRarity),
                    background: `${getRarityColor(giftData.cardRarity)}10`
                  }}
                >
                  <div className="gift-card-content">
                    <span className="gift-card-rarity" style={{ color: getRarityColor(giftData.cardRarity) }}>
                      {getRarityStars(giftData.cardRarity)}
                    </span>
                    <span className="gift-card-name">{giftData.itemName}</span>
                    {giftData.cardElement && (
                      <span className="gift-card-element">
                        {getElementEmoji(giftData.cardElement)} {giftData.cardElement}
                      </span>
                    )}
                    {giftData.cardPower && (
                      <span className="gift-card-power">⚡ {giftData.cardPower}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : giftData.giftType === 'title' ? (
              <div className="gift-title-display">
                <span className="gift-title-name">🏆 {giftData.itemName}</span>
                <span className="gift-title-hint">Title</span>
              </div>
            ) : giftData.giftType === 'banner' ? (
              <div className="gift-banner-display">
                <span className="gift-banner-name">🎨 {giftData.itemName}</span>
                <span className="gift-banner-hint">Banner</span>
              </div>
            ) : giftData.giftType === 'profilePhoto' ? (
              <div className="gift-photo-display">
                <span className="gift-photo-name">📸 {giftData.itemName}</span>
                <span className="gift-photo-hint">Profile Photo</span>
              </div>
            ) : giftData.giftType === 'shards' ? (
              <div className="gift-amount-display">
                <span className="gift-amount-icon">🎴</span>
                <span className="gift-amount-value">+{giftData.amount}</span>
                <span className="gift-amount-label">Shards</span>
              </div>
            ) : giftData.giftType === 'gems' ? (
              <div className="gift-amount-display">
                <span className="gift-amount-icon">💎</span>
                <span className="gift-amount-value">+{giftData.amount}</span>
                <span className="gift-amount-label">Gems</span>
              </div>
            ) : (
              <div className="gift-generic-display">
                <span className="gift-generic-name">{giftData.itemName || 'Gift'}</span>
              </div>
            )}
          </div>
          
          {notification.message && (
            <p className="gift-message">📝 {notification.message}</p>
          )}
        </div>
        
        {error && <div className="gift-error">❌ {error}</div>}
        {success && <div className="gift-success">✅ {success}</div>}
        
        <button 
          className={`gift-claim-btn ${loading ? 'loading' : ''}`}
          onClick={handleClaim}
          disabled={loading || success}
        >
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              Claiming...
            </>
          ) : success ? (
            '✅ Claimed!'
          ) : (
            '🎁 Claim Gift'
          )}
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default GiftModal;
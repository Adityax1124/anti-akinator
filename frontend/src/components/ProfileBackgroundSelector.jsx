import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';
import './ProfileBackgroundSelector.css';

const ProfileBackgroundSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  onUnequip,
  currentBackground,
  userId 
}) => {
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedBg, setSelectedBg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchBackgrounds();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedBg(currentBackground);
  }, [currentBackground]);

  const fetchBackgrounds = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/profile/backgrounds', {
        params: { _t: Date.now() }
      });
      setBackgrounds(response.data.backgrounds || []);
    } catch (err) {
      console.error('Error fetching backgrounds:', err);
      setError('Failed to load backgrounds');
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

  const handleSelect = (background) => {
    setSelectedBg(background);
    if (onSelect) {
      onSelect(background._id);
    }
    onClose();
  };

  const handleUnequip = () => {
    if (onUnequip) {
      onUnequip();
    }
    setSelectedBg(null);
    onClose();
  };

  const filteredBackgrounds = backgrounds.filter(bg => {
    if (!searchTerm) return true;
    return bg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           bg.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           bg.rarity?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const unlockedBackgrounds = filteredBackgrounds.filter(bg => bg.isUnlocked);
  const lockedBackgrounds = filteredBackgrounds.filter(bg => !bg.isUnlocked);

  if (!isOpen) return null;

  const modalContent = (
    <div className="bg-selector-overlay" onClick={onClose}>
      <div className="bg-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bg-selector-header">
          <h2>🖼️ Select Profile Background</h2>
          <button className="bg-selector-close" onClick={onClose}>✕</button>
        </div>

        {/* Current Background */}
        {currentBackground && (
          <div className="bg-selector-current">
            <span className="current-label">Currently Equipped:</span>
            <div className="current-preview">
              <div 
                className="current-preview-image"
                style={{
                  backgroundImage: `url(${currentBackground.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="current-info">
                <span className="current-name">{currentBackground.name}</span>
                {currentBackground.rarity && (
                  <span className="current-rarity" style={{ color: getRarityColor(currentBackground.rarity) }}>
                    {getRarityStars(currentBackground.rarity)} {currentBackground.rarity}
                  </span>
                )}
              </div>
              <button className="current-unequip" onClick={handleUnequip}>
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-selector-search">
          <input
            type="text"
            className="bg-search-input"
            placeholder="🔍 Search backgrounds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="bg-search-clear" onClick={() => setSearchTerm('')}>
              ✕
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-selector-loading">
            <div className="loader"></div>
            <p>Loading backgrounds...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-selector-error">
            <span>❌</span>
            <p>{error}</p>
            <button onClick={fetchBackgrounds}>Retry</button>
          </div>
        )}

        {/* Backgrounds Grid */}
        {!loading && !error && (
          <div className="bg-selector-grid">
            {/* Unlocked Backgrounds */}
            {unlockedBackgrounds.length > 0 && (
              <>
                <div className="bg-section-label">
                  <span>🔓 Unlocked ({unlockedBackgrounds.length})</span>
                </div>
                <div className="bg-grid">
                  {unlockedBackgrounds.map((bg) => {
                    const isEquipped = currentBackground?._id === bg._id;
                    return (
                      <div
                        key={bg._id}
                        className={`bg-card ${isEquipped ? 'equipped' : ''}`}
                        onClick={() => handleSelect(bg)}
                      >
                        <div 
                          className="bg-card-preview"
                          style={{
                            backgroundImage: `url(${bg.imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {isEquipped && (
                            <div className="bg-equipped-badge">✅ Equipped</div>
                          )}
                          {bg.rarity && (
                            <div 
                              className="bg-card-rarity"
                              style={{ color: getRarityColor(bg.rarity) }}
                            >
                              {getRarityStars(bg.rarity)}
                            </div>
                          )}
                        </div>
                        <div className="bg-card-info">
                          <h4>{bg.name}</h4>
                          {bg.category && (
                            <span className="bg-card-category">{bg.category}</span>
                          )}
                          {bg.rarity && (
                            <span 
                              className="bg-card-rarity-text"
                              style={{ color: getRarityColor(bg.rarity) }}
                            >
                              {bg.rarity}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Locked Backgrounds */}
            {lockedBackgrounds.length > 0 && (
              <>
                <div className="bg-section-label locked">
                  <span>🔒 Locked ({lockedBackgrounds.length})</span>
                </div>
                <div className="bg-grid">
                  {lockedBackgrounds.map((bg) => (
                    <div key={bg._id} className="bg-card locked">
                      <div 
                        className="bg-card-preview locked-preview"
                        style={{
                          backgroundImage: `url(${bg.imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          filter: 'grayscale(1) blur(2px)'
                        }}
                      >
                        <div className="bg-lock-overlay">
                          <span className="bg-lock-icon">🔒</span>
                        </div>
                        {bg.rarity && (
                          <div 
                            className="bg-card-rarity"
                            style={{ color: getRarityColor(bg.rarity) }}
                          >
                            {getRarityStars(bg.rarity)}
                          </div>
                        )}
                      </div>
                      <div className="bg-card-info">
                        <h4>???</h4>
                        {bg.rarity && (
                          <span 
                            className="bg-card-rarity-text"
                            style={{ color: getRarityColor(bg.rarity) }}
                          >
                            {bg.rarity}
                          </span>
                        )}
                        <span className="bg-card-hint">Keep playing to unlock!</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {unlockedBackgrounds.length === 0 && lockedBackgrounds.length === 0 && (
              <div className="bg-selector-empty">
                <span className="empty-icon">🖼️</span>
                <h3>No backgrounds available</h3>
                <p>Check back later for new backgrounds!</p>
              </div>
            )}

            {/* Search No Results */}
            {searchTerm && unlockedBackgrounds.length === 0 && lockedBackgrounds.length === 0 && (
              <div className="bg-selector-empty">
                <span className="empty-icon">🔍</span>
                <h3>No results found</h3>
                <p>Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-selector-footer">
          <button className="bg-selector-close-btn" onClick={onClose}>
            Close
          </button>
          {currentBackground && (
            <button className="bg-selector-unequip-btn" onClick={handleUnequip}>
              Remove Background
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileBackgroundSelector;
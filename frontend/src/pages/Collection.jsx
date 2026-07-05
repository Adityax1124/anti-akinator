import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import CardModal from '../components/CardModal';
import './Collection.css';

const Collection = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [stats, setStats] = useState({ totalCards: 0, totalPower: 0, avgPower: 0, gems: 0 });
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('power');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCollection();
  }, []);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const response = await api.get('/cards/collection');
      if (response.data.success) {
        setCards(response.data.cards || []);
        setStats(response.data.stats || { totalCards: 0, totalPower: 0, avgPower: 0, gems: 0 });
      }
    } catch (err) {
      setError('Failed to load collection');
      console.error('Collection fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== FIX: Scroll to top AND prevent body scroll when modal opens =====
  const handleCardClick = (card) => {
    // Scroll to top of page immediately
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Lock body scroll
    document.body.classList.add('modal-open');
    
    setSelectedCard(card);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedCard(null);
    document.body.classList.remove('modal-open');
  };

  const handleUpgradeSuccess = (updatedCard) => {
    setCards(prevCards => 
      prevCards.map(c => 
        c.characterId === updatedCard.characterId ? updatedCard : c
      )
    );
    fetchCollection();
    setSuccess(`✅ ${updatedCard.characterName} upgraded to Level ${updatedCard.level}!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getFilteredCards = () => {
    let filtered = [...cards];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.characterName?.toLowerCase().includes(query)
      );
    }

    if (filter !== 'all') {
      filtered = filtered.filter(card => 
        card.element?.toLowerCase() === filter.toLowerCase()
      );
    }

    switch (sortBy) {
      case 'power':
        filtered.sort((a, b) => b.currentPower - a.currentPower);
        break;
      case 'level':
        filtered.sort((a, b) => b.level - a.level);
        break;
      case 'rarity':
        const rarityOrder = { 'Legendary': 5, 'Epic': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1 };
        filtered.sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.characterName?.localeCompare(b.characterName || '') || 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredCards = getFilteredCards();

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

  if (loading) {
    return (
      <div className="collection-container">
        <div className="collection-loading">
          <div className="loader"></div>
          <p>Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-container">
      <div className="collection-header">
        <h1>📁 My Collection</h1>
        <div className="collection-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.totalCards}</span>
            <span className="stat-label">Cards</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.totalPower}</span>
            <span className="stat-label">Total Power</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.avgPower}</span>
            <span className="stat-label">Avg Power</span>
          </div>
          <div className="stat-item gems">
            <span className="stat-value">💎 {stats.gems}</span>
            <span className="stat-label">Gems</span>
          </div>
        </div>
      </div>

      {error && <div className="collection-alert error">{error}</div>}
      {success && <div className="collection-alert success">{success}</div>}

      <div className="collection-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Elements</option>
            <option value="fire">🔥 Fire</option>
            <option value="water">💧 Water</option>
            <option value="wind">🌪️ Wind</option>
            <option value="earth">🌍 Earth</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="power">Sort by Power</option>
            <option value="level">Sort by Level</option>
            <option value="rarity">Sort by Rarity</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="collection-empty">
          <div className="empty-icon">🃏</div>
          <h3>No cards found</h3>
          <p>
            {cards.length === 0 
              ? "You don't have any cards yet. Win battles to collect cards!" 
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="collection-grid">
          {filteredCards.map((card) => (
            <div
              key={card.characterId}
              className="collection-card"
              onClick={() => handleCardClick(card)}
              style={{
                borderColor: getRarityColor(card.rarity),
                boxShadow: `0 0 20px ${getRarityColor(card.rarity)}22`
              }}
            >
              <div className="card-image-container">
                {card.image ? (
                  <img src={card.image} alt={card.characterName} className="card-image" />
                ) : (
                  <div className="card-placeholder">
                    {card.characterName?.charAt(0) || '?'}
                  </div>
                )}
                <div className="card-level-badge">Lv.{card.level || 1}</div>
                <div className="card-element-badge">{getElementEmoji(card.element)}</div>
              </div>
              <div className="card-details">
                <div className="card-name">{card.characterName || 'Unknown'}</div>
                <div className="card-rarity" style={{ color: getRarityColor(card.rarity) }}>
                  {getRarityStars(card.rarity)} {card.rarity}
                </div>
                <div className="card-stats">
                  <span className="card-power">⚡ {card.currentPower || card.powerLevel || 0}</span>
                  <span className="card-level-text">Level {card.level || 1}/10</span>
                </div>
                <div className="card-progress-bar">
                  <div 
                    className="card-progress-fill" 
                    style={{ width: `${((card.level || 1) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={handleModalClose}
          onUpgradeSuccess={handleUpgradeSuccess}
          userGems={stats.gems}
        />
      )}

      <div className="collection-footer">
        <p>Showing {filteredCards.length} of {cards.length} cards</p>
        {filteredCards.length > 0 && (
          <p>Total Power: {filteredCards.reduce((sum, c) => sum + (c.currentPower || c.powerLevel || 0), 0)}</p>
        )}
      </div>
    </div>
  );
};

export default Collection;
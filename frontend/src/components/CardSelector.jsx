import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import './CardSelector.css';

const CardSelector = ({ onSelect, maxCards = 10, onClose }) => {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('power'); // 'power' | 'name'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await api.get('/profile/cards');
      if (response.data.success) {
        setCards(response.data.cards || []);
        // Auto-select top 10 by power
        const topCards = [...(response.data.cards || [])]
          .sort((a, b) => b.powerLevel - a.powerLevel)
          .slice(0, maxCards);
        setSelected(topCards.map(c => c.characterId));
      }
    } catch (error) {
      console.error('Fetch cards error:', error);
      setError('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (card) => {
    const index = selected.indexOf(card.characterId);
    if (index !== -1) {
      if (selected.length <= maxCards) {
        // Don't allow deselecting below maxCards
        return;
      }
      setSelected(prev => prev.filter(id => id !== card.characterId));
    } else {
      if (selected.length >= maxCards) {
        setError(`You can only select ${maxCards} cards`);
        setTimeout(() => setError(''), 2000);
        return;
      }
      setSelected(prev => [...prev, card.characterId]);
    }
  };

  const handleConfirm = () => {
    if (selected.length !== maxCards) {
      setError(`Please select exactly ${maxCards} cards`);
      setTimeout(() => setError(''), 2000);
      return;
    }
    onSelect(selected);
  };

  const getSortedCards = () => {
    let filtered = cards;
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.characterName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortBy === 'power') {
      return [...filtered].sort((a, b) => b.powerLevel - a.powerLevel);
    }
    return [...filtered].sort((a, b) => a.characterName.localeCompare(b.characterName));
  };

  const sortedCards = getSortedCards();
  const isSelected = (cardId) => selected.includes(cardId);

  if (loading) {
    return (
      <div className="card-selector-overlay">
        <div className="card-selector-modal premium-card">
          <div className="selector-loader"></div>
          <p>Loading your cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-selector-overlay">
      <div className="card-selector-modal premium-card">
        <div className="selector-header">
          <h2>🃏 Select Your Team</h2>
          <button className="selector-close" onClick={onClose}>✕</button>
        </div>

        <div className="selector-info">
          <span className="selector-count">
            Selected: <strong>{selected.length}</strong> / {maxCards}
          </span>
          <span className="selector-hint">Choose your best {maxCards} cards</span>
        </div>

        <div className="selector-controls">
          <div className="selector-search">
            <input
              type="text"
              placeholder="🔍 Search cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="selector-search-input"
            />
          </div>
          <div className="selector-sort">
            <button 
              className={`sort-btn ${sortBy === 'power' ? 'active' : ''}`}
              onClick={() => setSortBy('power')}
            >
              ⚡ Power
            </button>
            <button 
              className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => setSortBy('name')}
            >
              📝 Name
            </button>
          </div>
        </div>

        {error && <div className="selector-error">{error}</div>}

        <div className="selector-grid">
          {sortedCards.map((card) => {
            const selected = isSelected(card.characterId);
            return (
              <div
                key={card.characterId}
                className={`selector-card ${selected ? 'selected' : ''}`}
                onClick={() => toggleCard(card)}
              >
                <div className="selector-card-image">
                  {card.image ? (
                    <img src={card.image} alt={card.characterName} />
                  ) : (
                    <div className="selector-card-placeholder">
                      {card.characterName?.charAt(0) || '?'}
                    </div>
                  )}
                  {selected && (
                    <div className="selector-card-check">✅</div>
                  )}
                </div>
                <div className="selector-card-info">
                  <span className="selector-card-name">{card.characterName}</span>
                  <span className="selector-card-power">⚡{card.powerLevel}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="selector-actions">
          <button 
            className="btn-confirm-team premium-btn"
            onClick={handleConfirm}
            disabled={selected.length !== maxCards}
          >
            {selected.length === maxCards ? '✅ Confirm Team' : `Select ${maxCards - selected.length} more`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardSelector;
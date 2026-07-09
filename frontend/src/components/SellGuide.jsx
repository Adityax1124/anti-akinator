import React, { useState } from 'react';
import './SellGuide.css';

const SellGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const rarityData = [
    {
      rarity: 'Common',
      stars: '⭐',
      color: '#b0b0b0',
      bgColor: 'rgba(176, 176, 176, 0.06)',
      borderColor: 'rgba(176, 176, 176, 0.15)',
      prices: [
        { level: 1, price: 5 },
        { level: 5, price: 20 },
        { level: 10, price: 35 }
      ]
    },
    {
      rarity: 'Uncommon',
      stars: '⭐⭐',
      color: '#4ecdc4',
      bgColor: 'rgba(78, 205, 196, 0.06)',
      borderColor: 'rgba(78, 205, 196, 0.15)',
      prices: [
        { level: 1, price: 25 },
        { level: 5, price: 40 },
        { level: 10, price: 65 }
      ]
    },
    {
      rarity: 'Rare',
      stars: '⭐⭐⭐',
      color: '#4a9eff',
      bgColor: 'rgba(74, 158, 255, 0.06)',
      borderColor: 'rgba(74, 158, 255, 0.15)',
      prices: [
        { level: 1, price: 60 },
        { level: 5, price: 85 },
        { level: 10, price: 120 }
      ]
    },
    {
      rarity: 'Epic',
      stars: '⭐⭐⭐⭐',
      color: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.06)',
      borderColor: 'rgba(167, 139, 250, 0.15)',
      prices: [
        { level: 1, price: 150 },
        { level: 5, price: 200 },
        { level: 10, price: 280 }
      ]
    },
    {
      rarity: 'Legendary',
      stars: '⭐⭐⭐⭐⭐',
      color: '#f5a623',
      bgColor: 'rgba(245, 166, 35, 0.06)',
      borderColor: 'rgba(245, 166, 35, 0.15)',
      prices: [
        { level: 1, price: 350 },
        { level: 5, price: 450 },
        { level: 10, price: 600 }
      ]
    }
  ];

  return (
    <div className="sell-guide-container">
      <div className="sell-guide-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="sell-guide-title">
          <span className="sell-guide-icon">💰</span>
          <span>Card Selling Guide</span>
          <span className="sell-guide-badge">NEW</span>
        </div>
        <button className="sell-guide-toggle">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="sell-guide-body">
          <p className="sell-guide-description">
            Sell your unwanted cards for <strong>Gems</strong>! Higher rarity and level = more gems! 💎
          </p>

          <div className="sell-guide-rarity-grid">
            {rarityData.map((item) => (
              <div 
                key={item.rarity}
                className="sell-guide-rarity-card"
                style={{
                  background: item.bgColor,
                  borderColor: item.borderColor
                }}
              >
                <div className="sell-guide-rarity-header">
                  <span className="sell-guide-rarity-stars" style={{ color: item.color }}>
                    {item.stars}
                  </span>
                  <span className="sell-guide-rarity-name" style={{ color: item.color }}>
                    {item.rarity}
                  </span>
                </div>
                <div className="sell-guide-rarity-prices">
                  {item.prices.map((p, idx) => (
                    <div key={idx} className={`sell-guide-price-item ${p.level === 10 ? 'highlight' : ''}`}>
                      <span className="sell-guide-price-label">Level {p.level}</span>
                      <span className="sell-guide-price-value">{p.price} 💎</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sell-guide-tip">
            <span className="sell-guide-tip-icon">💡</span>
            <span className="sell-guide-tip-text">
              <strong>Pro Tip:</strong> Upgrade your cards before selling to get more gems!
              Higher level = higher sell price.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellGuide;
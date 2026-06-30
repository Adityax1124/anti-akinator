// BuyShards.jsx
import React from 'react';
import './BuyShards.css';

const BuyShards = () => {
  const shardPackages = [
    { 
      id: 1,
      name: 'STARTER', 
      shards: 50, 
      price: '₹35 INR', 
      hints: 1, 
      tag: null 
    },
    { 
      id: 2,
      name: 'ENTHUSIAST', 
      shards: 150, 
      price: '₹105 INR', 
      hints: 3, 
      tag: null 
    },
    { 
      id: 3,
      name: 'PRO', 
      shards: 350, 
      price: '₹210 INR', 
      hints: 7, 
      tag: null 
    },
    { 
      id: 4,
      name: 'POPULAR', 
      shards: 750, 
      price: '₹375 INR', 
      hints: 15, 
      tag: '⭐ POPULAR' // Yellow highlighted one
    },
    { 
      id: 5,
      name: 'ULTIMATE', 
      shards: 1500, 
      price: '₹750 INR', 
      hints: 30, 
      tag: null 
    },
    { 
      id: 6,
      name: 'LEGENDARY', 
      shards: 3000, 
      price: '₹1350 INR', 
      hints: 60, 
      tag: null 
    },
  ];

  return (
    <div className="buy-shards-container">
      <div className="buy-shards-inner">
        {/* Top Navigation Bar - Matches screenshot exactly */}
        <div className="top-nav">
          <div className="nav-left">
            <span className="search-icon">🔍</span>
            <span className="url-text">anti-akinator-silk.vercel.app/buy-shards</span>
          </div>
          <div className="nav-right">
            <span className="nav-item">Play</span>
            <span className="nav-item">Leaderboard</span>
            <span className="nav-item">Winners</span>
            <span className="nav-item">Admin</span>
            <span className="nav-item active">Buy Shards</span>
            <span className="nav-item">Adityax2411</span>
            <span className="shard-badge">270</span>
            <span className="nav-item logout">Logout</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Buy Character Shards</h1>
          <p className="page-subtitle">
            Purchase shards to use hints and unlock premium features
          </p>
          <div className="balance-display">
            You have <span className="balance-amount">270 Shards</span>
          </div>
        </div>

        {/* Shards Grid */}
        <div className="shards-grid">
          {shardPackages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`shard-card ${pkg.tag ? 'popular' : ''}`}
            >
              <div className="card-header">
                <span className="card-name">{pkg.name}</span>
                {pkg.tag && <span className="popular-tag">{pkg.tag}</span>}
              </div>
              <div className="card-shards">{pkg.shards} Shards</div>
              <div className="card-price">{pkg.price}</div>
              <div className="card-hints">{pkg.hints} Hints</div>
              <button className="buy-btn">Buy Now</button>
            </div>
          ))}
        </div>

        {/* Footer - Weather & Search */}
        <div className="footer">
          <div className="weather-info">
            <span className="weather-icon">⛅</span>
            <span className="weather-temp">25°C</span>
            <span className="weather-desc">Mostly cloudy</span>
          </div>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search" className="search-input" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyShards;
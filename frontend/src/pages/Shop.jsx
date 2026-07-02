import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Shop.css';

const Shop = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purchasing, setPurchasing] = useState(null);
  const [activeTab, setActiveTab] = useState('banners'); // 'banners' or 'photos'

  useEffect(() => {
    fetchShopItems();
  }, []);

  const fetchShopItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/shop/items?_t=' + Date.now());
      setItems(response.data.items || []);
      setError('');
    } catch (err) {
      console.error('Fetch shop error:', err);
      setError('Failed to load shop items');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (shopItemId) => {
    if (!window.confirm('Are you sure you want to purchase this item?')) return;

    setPurchasing(shopItemId);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/shop/buy', { shopItemId });
      setSuccess(response.data.message);
      await refreshUser();
      fetchShopItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to purchase item');
    } finally {
      setPurchasing(null);
    }
  };

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'Common': return '#a0a0a0';
      case 'Uncommon': return '#4ecdc4';
      case 'Rare': return '#4a9eff';
      case 'Epic': return '#a855f7';
      case 'Legendary': return '#f59e0b';
      default: return '#a0a0a0';
    }
  };

  const getRarityEmoji = (rarity) => {
    switch(rarity) {
      case 'Common': return '⬜';
      case 'Uncommon': return '🟩';
      case 'Rare': return '🟦';
      case 'Epic': return '🟪';
      case 'Legendary': return '⭐';
      default: return '⬜';
    }
  };

  // ===== CORS PROXY HELPER =====
  const getProxiedUrl = (url) => {
    if (!url) return '';
    // If it's a Pinterest URL, use CORS proxy
    if (url.includes('pinimg.com')) {
      return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }
    return url;
  };

  // ===== FILTER ITEMS BY TYPE =====
  const bannerItems = items.filter(item => item.itemType === 'banner');
  const photoItems = items.filter(item => item.itemType === 'profilePhoto');

  const currentItems = activeTab === 'banners' ? bannerItems : photoItems;

  if (loading) {
    return (
      <div className="shop-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-container fade-in">
      <div className="shop-header">
        <h1>🛒 Shop</h1>
        <p className="shop-subtitle">Spend your shards on exclusive items!</p>
        <div className="shards-display">
          🎴 Your Shards: <strong>{user?.shards || 0}</strong>
        </div>
      </div>

      {error && <div className="shop-alert error">{error}</div>}
      {success && <div className="shop-alert success">{success}</div>}

      {/* ===== TABS ===== */}
      <div className="shop-tabs">
        <button
          className={`shop-tab-btn ${activeTab === 'banners' ? 'active' : ''}`}
          onClick={() => setActiveTab('banners')}
        >
          🎨 Banners <span className="tab-count">{bannerItems.length}</span>
        </button>
        <button
          className={`shop-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          📸 Photos <span className="tab-count">{photoItems.length}</span>
        </button>
      </div>

      {currentItems.length === 0 ? (
        <div className="shop-empty">
          <span className="empty-icon">
            {activeTab === 'banners' ? '🎨' : '📸'}
          </span>
          <h3>No {activeTab === 'banners' ? 'banners' : 'photos'} available</h3>
          <p>Check back later for new exclusive {activeTab === 'banners' ? 'banners' : 'photos'}!</p>
        </div>
      ) : (
        <div className="shop-grid">
          {currentItems.map((item) => {
            const isOwned = item.isPurchased;
            const canAfford = (user?.shards || 0) >= item.price;
            const isLimited = item.isLimited;
            const isExpired = isLimited && item.endDate && new Date(item.endDate) < new Date();
            const isNotStarted = isLimited && item.startDate && new Date(item.startDate) > new Date();

            return (
              <div key={item._id} className={`shop-item-card ${isOwned ? 'owned' : ''}`}>
                <div className="shop-item-preview">
                  {item.itemType === 'banner' ? (
                    <div className="shop-banner-preview">
                      <img 
                        src={item.item?.gifUrl} 
                        alt={item.item?.name || 'Banner'} 
                        className="shop-banner-img"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"%3E%3Crect width="400" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" font-size="20" font-family="Arial" fill="%23999" text-anchor="middle" dy=".3em"%3EGIF Not Found%3C/text%3E%3C/svg%3E';
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  ) : (
                    <img 
                      src={getProxiedUrl(item.item?.imageUrl)} 
                      alt={item.item?.name} 
                      className="shop-photo-preview"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%236c63ff"/%3E%3Ctext x="50%25" y="50%25" font-size="24" font-family="Arial" fill="%23ffffff" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div className="shop-item-badge exclusive">🛒 EXCLUSIVE</div>
                  {isLimited && (
                    <div className="shop-item-badge limited">⏳ Limited</div>
                  )}
                  {isOwned && (
                    <div className="shop-item-badge owned">✅ Owned</div>
                  )}
                  {isExpired && (
                    <div className="shop-item-badge expired">⛔ Expired</div>
                  )}
                  {isNotStarted && (
                    <div className="shop-item-badge coming">📅 Coming Soon</div>
                  )}
                </div>

                <div className="shop-item-info">
                  <h3 className="shop-item-name">{item.item?.name || 'Unknown'}</h3>
                  {item.item?.rarity && (
                    <span 
                      className="shop-item-rarity" 
                      style={{ color: getRarityColor(item.item.rarity) }}
                    >
                      {getRarityEmoji(item.item.rarity)} {item.item.rarity}
                    </span>
                  )}
                  <div className="shop-item-price">
                    <span className="price-icon">🎴</span> {item.price} Shards
                  </div>
                  {isLimited && item.endDate && (
                    <div className="shop-item-timer">
                      <span className="timer-icon">⏳</span> Available until: {new Date(item.endDate).toLocaleDateString()}
                    </div>
                  )}
                  {isLimited && item.startDate && new Date(item.startDate) > new Date() && (
                    <div className="shop-item-timer">
                      <span className="timer-icon">📅</span> Available from: {new Date(item.startDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <button
                  className={`shop-buy-btn ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'cant-afford' : ''}`}
                  onClick={() => handlePurchase(item._id)}
                  disabled={isOwned || isExpired || isNotStarted || purchasing === item._id || !canAfford}
                >
                  {purchasing === item._id ? (
                    <span className="btn-loader"></span>
                  ) : isOwned ? (
                    '✅ Owned'
                  ) : isExpired ? (
                    '⛔ Expired'
                  ) : isNotStarted ? (
                    '⏳ Coming Soon'
                  ) : !canAfford ? (
                    `Need ${item.price - (user?.shards || 0)} more 🎴`
                  ) : (
                    `Buy for ${item.price} 🎴`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Shop;
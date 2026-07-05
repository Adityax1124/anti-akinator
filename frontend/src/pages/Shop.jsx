import React, { useState, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState('banners');
  
  // ===== REFS FOR INTERSECTION OBSERVER =====
  const itemRefs = useRef([]);

  useEffect(() => {
    fetchShopItems();
  }, []);

  // ===== INTERSECTION OBSERVER FOR STAGGERED ANIMATIONS =====
  useEffect(() => {
    if (!loading && items.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      );

      itemRefs.current.forEach((item) => {
        if (item) observer.observe(item);
      });

      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [loading, items, activeTab]);

  const fetchShopItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/shop/items?_t=' + Date.now());
      console.log('📦 Shop items response:', response.data);
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
    if (url.includes('pinimg.com')) {
      return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }
    return url;
  };

  // ===== FORMAT TIME REMAINING =====
  const getTimeRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // ===== FILTER ITEMS BY TYPE =====
  const bannerItems = items.filter(item => item.itemType === 'banner');
  const photoItems = items.filter(item => item.itemType === 'profilePhoto');

  // Get current items based on active tab
  const currentItems = activeTab === 'banners' ? bannerItems : photoItems;

  // Debug logging
  console.log('📊 Total items:', items.length);
  console.log('📊 Banner items:', bannerItems.length);
  console.log('📊 Photo items:', photoItems.length);
  console.log('📊 Active tab:', activeTab);
  console.log('📊 Current items:', currentItems.length);

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
        <h1>🛒 Premium Shop</h1>
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
          onClick={() => {
            console.log('🔄 Switching to Banners tab');
            setActiveTab('banners');
            // Reset refs for new items
            itemRefs.current = [];
          }}
        >
          🎨 Banners <span className="tab-count">{bannerItems.length}</span>
        </button>
        <button
          className={`shop-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => {
            console.log('🔄 Switching to Photos tab');
            setActiveTab('photos');
            // Reset refs for new items
            itemRefs.current = [];
          }}
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
          {currentItems.map((item, index) => {
            const isOwned = item.isPurchased;
            const canAfford = (user?.shards || 0) >= item.price;
            const isLimited = item.isLimited;
            const isExpired = isLimited && item.endDate && new Date(item.endDate) < new Date();
            const isNotStarted = isLimited && item.startDate && new Date(item.startDate) > new Date();
            const timeRemaining = isLimited && item.endDate ? getTimeRemaining(item.endDate) : null;
            const isUrgent = isLimited && timeRemaining && timeRemaining.includes('h') && !timeRemaining.includes('d');

            return (
              <div 
                key={item._id || index} 
                ref={el => {
                  if (el) {
                    itemRefs.current[index] = el;
                  }
                }}
                className={`shop-item-card ${isOwned ? 'owned' : ''}`}
              >
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
                    />
                  )}
                  
                  {/* Badges */}
                  <div className="shop-item-badge exclusive">✨ EXCLUSIVE</div>
                  
                  {isLimited && !isExpired && !isNotStarted && (
                    <div className="shop-item-badge limited">⏳ LIMITED</div>
                  )}
                  {isOwned && (
                    <div className="shop-item-badge owned">✅ OWNED</div>
                  )}
                  {isExpired && (
                    <div className="shop-item-badge expired">⛔ EXPIRED</div>
                  )}
                  {isNotStarted && (
                    <div className="shop-item-badge coming">📅 COMING SOON</div>
                  )}

                  {/* Timer Badge - Prominent */}
                  {isLimited && !isExpired && !isNotStarted && timeRemaining && (
                    <div className="shop-item-timer-badge">
                      <span className="timer-icon">⏳</span>
                      <span className={`timer-text ${isUrgent ? 'urgent' : ''}`}>
                        {timeRemaining} left
                      </span>
                    </div>
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
                    `Buy Now ${item.price} 🎴`
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
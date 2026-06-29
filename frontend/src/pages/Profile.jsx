import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [banners, setBanners] = useState([]);
  const [titles, setTitles] = useState([]);
  const [profilePhotos, setProfilePhotos] = useState([]);
  const [equipped, setEquipped] = useState({
    banner: null,
    title: null,
    profilePhoto: null
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [historyRes, bannersRes, titlesRes, photosRes, equippedRes] = await Promise.all([
        api.get('/game/history'),
        api.get('/profile/banners'),
        api.get('/profile/titles'),
        api.get('/profile/photos'),
        api.get('/profile/equipped')
      ]);

      setHistory(historyRes.data.games || []);
      setBanners(bannersRes.data.banners || []);
      setTitles(titlesRes.data.titles || []);
      setProfilePhotos(photosRes.data.photos || []);
      setEquipped(equippedRes.data || { banner: null, title: null, profilePhoto: null });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Failed to load profile data');
      setLoading(false);
    }
  };

  const equipBanner = async (bannerId) => {
    try {
      await api.post('/profile/equip-banner', { bannerId });
      setEquipped(prev => ({ ...prev, banner: bannerId }));
      setShowBannerModal(false);
      fetchProfileData();
    } catch (error) {
      setError('Failed to equip banner');
    }
  };

  const equipTitle = async (titleId) => {
    try {
      await api.post('/profile/equip-title', { titleId });
      setEquipped(prev => ({ ...prev, title: titleId }));
      setShowTitleModal(false);
      fetchProfileData();
    } catch (error) {
      setError('Failed to equip title');
    }
  };

  const equipPhoto = async (photoId) => {
    try {
      await api.post('/profile/equip-photo', { photoId });
      setEquipped(prev => ({ ...prev, profilePhoto: photoId }));
      setShowPhotoModal(false);
      fetchProfileData();
    } catch (error) {
      setError('Failed to equip photo');
    }
  };

  const getStatusEmoji = (status) => {
    switch(status) {
      case 'won': return '🎉';
      case 'lost': return '😔';
      case 'abandoned': return '🏳️';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'won': return 'status-won';
      case 'lost': return 'status-lost';
      case 'abandoned': return 'status-abandoned';
      default: return 'status-unknown';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'won': return 'WON';
      case 'lost': return 'LOST';
      case 'abandoned': return 'ABANDONED';
      default: return 'ACTIVE';
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

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const equippedBanner = banners.find(b => b._id === equipped.banner);
  const equippedTitle = titles.find(t => t._id === equipped.title);
  const equippedPhoto = profilePhotos.find(p => p._id === equipped.profilePhoto);

  const unlockedBanners = banners.filter(b => b.isUnlocked);
  const unlockedTitles = titles.filter(t => t.isUnlocked);
  const unlockedPhotos = profilePhotos.filter(p => p.isUnlocked);

  return (
    <div className="profile-container fade-in">
      {/* ===== PROFILE BANNER ===== */}
      <div 
        className="profile-banner"
        style={equippedBanner?.gifUrl ? { backgroundImage: `url(${equippedBanner.gifUrl})` } : {}}
      >
        <div className="banner-overlay"></div>
        
        <button 
          className="banner-edit-btn"
          onClick={() => setShowBannerModal(true)}
          title="Change Banner"
        >
          ✏️
        </button>

        <div className="banner-user-row">
          <div 
            className="profile-photo-large"
            onClick={() => setShowPhotoModal(true)}
            style={equippedPhoto?.imageUrl ? { backgroundImage: `url(${equippedPhoto.imageUrl})` } : {}}
          >
            {!equippedPhoto && (
              <div className="profile-photo-placeholder">
                <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
            )}
            <div className="photo-edit-badge">📷</div>
          </div>

          <div className="banner-user-info">
            <h1 className="banner-username">{user?.username}</h1>
            
            <div 
              className="title-display"
              onClick={() => setShowTitleModal(true)}
              style={{ color: equippedTitle ? getRarityColor(equippedTitle.rarity) : 'rgba(255,255,255,0.4)' }}
            >
              {equippedTitle ? (
                <>
                  <span className="title-name">{equippedTitle.displayName}</span>
                  <span className="title-rarity-badge" style={{ color: getRarityColor(equippedTitle.rarity) }}>
                    {getRarityEmoji(equippedTitle.rarity)}
                  </span>
                </>
              ) : (
                <span className="title-placeholder">✏️ Set Title</span>
              )}
            </div>
          </div>
        </div>

        <div className="banner-stats">
          <div className="banner-stat">
            <span className="banner-stat-value">{user?.stats?.gamesWon || 0}</span>
            <span className="banner-stat-label">Wins</span>
          </div>
          <div className="banner-stat">
            <span className="banner-stat-value">🔥 {user?.stats?.winStreak || 0}</span>
            <span className="banner-stat-label">Streak</span>
          </div>
          <div className="banner-stat">
            <span className="banner-stat-value">{user?.totalGuesses || 0}</span>
            <span className="banner-stat-label">Guesses</span>
          </div>
        </div>
      </div>

      {/* ===== ACHIEVEMENT STATS ===== */}
      <div className="profile-stats-grid">
        <div className="stat-card">
          <div className="stat-number">{unlockedBanners.length}</div>
          <div className="stat-label">🎨 Banners</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{unlockedTitles.length}</div>
          <div className="stat-label">🏷️ Titles</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{unlockedPhotos.length}</div>
          <div className="stat-label">📸 Photos</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{user?.stats?.gamesPlayed || 0}</div>
          <div className="stat-label">🎮 Games</div>
        </div>
      </div>

      {/* ===== TOP 10 PROFILE PHOTOS ===== */}
      <div className="profile-photos-section">
        <div className="photos-section-header">
          <h2>📸 Top Profile Photos</h2>
          <span className="photos-count">{unlockedPhotos.length} / 10</span>
        </div>
        
        <div className="top-photos-grid">
          {[...Array(10)].map((_, index) => {
            const photo = profilePhotos[index];
            const isUnlocked = photo?.isUnlocked || false;
            const isEquipped = photo?._id === equipped.profilePhoto;
            
            return (
              <div 
                key={index}
                className={`top-photo-item ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`}
                onClick={() => {
                  if (isUnlocked && photo) {
                    equipPhoto(photo._id);
                  }
                }}
                title={isUnlocked ? photo?.name || 'Click to equip' : 'Locked'}
              >
                {isUnlocked ? (
                  <>
                    <div 
                      className="top-photo-preview" 
                      style={photo?.imageUrl ? { backgroundImage: `url(${photo.imageUrl})` } : {}}
                    >
                      {isEquipped && (
                        <div className="photo-equipped-badge">✅</div>
                      )}
                      {photo?.rarity && (
                        <div className="photo-rarity-badge" style={{ color: getRarityColor(photo.rarity) }}>
                          {getRarityEmoji(photo.rarity)}
                        </div>
                      )}
                    </div>
                    <div className="top-photo-name">{photo?.name || 'Unknown'}</div>
                  </>
                ) : (
                  <>
                    <div className="top-photo-preview locked-preview">
                      <div className="lock-icon-small">🔒</div>
                    </div>
                    <div className="top-photo-name">Locked</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== GAME HISTORY ===== */}
      <div className="profile-history">
        <h2>📜 Game History</h2>
        {history.length === 0 ? (
          <div className="history-empty">
            <p>No games played yet. Start your first game! 🎯</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((game) => (
              <div key={game.id} className="history-item">
                <div className="history-status">
                  <span className="status-emoji">{getStatusEmoji(game.status)}</span>
                  <span className={`status-text ${getStatusColor(game.status)}`}>
                    {getStatusText(game.status)}
                  </span>
                </div>
                <div className="history-details">
                  <div className="history-character">
                    <strong>{game.character}</strong>
                    <span className="history-anime">from {game.anime}</span>
                  </div>
                  <div className="history-meta">
                    <span>Questions: {game.questions}</span>
                    <span className="history-date">
                      {new Date(game.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {showBannerModal && (
        <div className="modal-overlay" onClick={() => setShowBannerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎨 Select Your Banner</h2>
              <button className="modal-close" onClick={() => setShowBannerModal(false)}>✕</button>
            </div>
            <div className="banner-grid">
              {banners.map((banner) => (
                <div 
                  key={banner._id} 
                  className={`banner-item ${banner.isUnlocked ? '' : 'locked'} ${equipped.banner === banner._id ? 'equipped' : ''}`}
                  onClick={() => banner.isUnlocked && equipBanner(banner._id)}
                >
                  {banner.isUnlocked ? (
                    <>
                      <div className="banner-preview" style={{ backgroundImage: `url(${banner.gifUrl})` }}>
                        <div className="banner-rarity" style={{ color: getRarityColor(banner.rarity) }}>
                          {getRarityEmoji(banner.rarity)} {banner.rarity}
                        </div>
                        {equipped.banner === banner._id && (
                          <div className="banner-equipped-badge">✅ Equipped</div>
                        )}
                      </div>
                      <div className="banner-info">
                        <h4>{banner.name}</h4>
                        <p>{banner.description}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="banner-preview locked-banner">
                        <div className="lock-icon">🔒</div>
                        <div className="banner-rarity" style={{ color: getRarityColor(banner.rarity) }}>
                          {getRarityEmoji(banner.rarity)} {banner.rarity}
                        </div>
                      </div>
                      <div className="banner-info">
                        <h4>???</h4>
                        <p>Keep playing to unlock!</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTitleModal && (
        <div className="modal-overlay" onClick={() => setShowTitleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏷️ Select Your Title</h2>
              <button className="modal-close" onClick={() => setShowTitleModal(false)}>✕</button>
            </div>
            <div className="title-grid">
              {titles.map((title) => (
                <div 
                  key={title._id} 
                  className={`title-item ${title.isUnlocked ? '' : 'locked'} ${equipped.title === title._id ? 'equipped' : ''}`}
                  onClick={() => title.isUnlocked && equipTitle(title._id)}
                >
                  <div className="title-card">
                    <div className="title-rarity" style={{ color: getRarityColor(title.rarity) }}>
                      {getRarityEmoji(title.rarity)} {title.rarity}
                    </div>
                    <div className="title-preview" style={{ color: getRarityColor(title.rarity) }}>
                      {title.displayName}
                    </div>
                    <h4>{title.isUnlocked ? title.name : '???'}</h4>
                    <p>{title.isUnlocked ? title.description : 'Locked'}</p>
                    {equipped.title === title._id && (
                      <div className="equipped-badge">✅ Equipped</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📸 Profile Photos</h2>
              <button className="modal-close" onClick={() => setShowPhotoModal(false)}>✕</button>
            </div>
            <div className="photo-grid">
              {profilePhotos.map((photo) => (
                <div 
                  key={photo._id} 
                  className={`photo-item ${photo.isUnlocked ? '' : 'locked'} ${equipped.profilePhoto === photo._id ? 'equipped' : ''}`}
                  onClick={() => photo.isUnlocked && equipPhoto(photo._id)}
                >
                  <div className="photo-preview" style={photo.isUnlocked && photo.imageUrl ? { backgroundImage: `url(${photo.imageUrl})` } : {}}>
                    {!photo.isUnlocked && (
                      <div className="lock-icon">🔒</div>
                    )}
                    {equipped.profilePhoto === photo._id && (
                      <div className="photo-equipped-badge">✅</div>
                    )}
                  </div>
                  <div className="photo-info">
                    <h4>{photo.isUnlocked ? photo.name : '???'}</h4>
                    <p className="photo-anime">{photo.isUnlocked ? photo.anime : 'Locked'}</p>
                    <span className="photo-rarity" style={{ color: getRarityColor(photo.rarity) }}>
                      {getRarityEmoji(photo.rarity)} {photo.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
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
  const [showcasePhotos, setShowcasePhotos] = useState([]); // Array of 10 photos
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [photoSearchTerm, setPhotoSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [profileRes, historyRes, bannersRes, titlesRes, photosRes] = await Promise.all([
        api.get('/profile/me'),
        api.get('/game/history'),
        api.get('/profile/banners'),
        api.get('/profile/titles'),
        api.get('/profile/photos')
      ]);

      const userData = profileRes.data.user;
      setProfileUser(userData);
      
      setEquipped({
        banner: userData.equipped?.banner || null,
        title: userData.equipped?.title || null,
        profilePhoto: userData.equipped?.profilePhoto || null
      });

      setHistory(historyRes.data.games || []);
      setBanners(bannersRes.data.banners || []);
      setTitles(titlesRes.data.titles || []);
      
      const photos = photosRes.data.photos || [];
      setProfilePhotos(photos);

      // ===== LOAD SHOWCASE PHOTOS from localStorage or default =====
      const savedShowcase = localStorage.getItem(`showcase_${userData.username}`);
      if (savedShowcase) {
        try {
          const parsed = JSON.parse(savedShowcase);
          // Verify the photos still exist and are unlocked
          const validShowcase = parsed.map(id => {
            const photo = photos.find(p => p._id === id && p.isUnlocked);
            return photo || null;
          });
          // Fill empty slots with null
          while (validShowcase.length < 10) {
            validShowcase.push(null);
          }
          setShowcasePhotos(validShowcase.slice(0, 10));
        } catch {
          setShowcasePhotos(Array(10).fill(null));
        }
      } else {
        // Default: fill with first 10 unlocked photos
        const unlockedPhotos = photos.filter(p => p.isUnlocked);
        const defaultShowcase = [];
        for (let i = 0; i < 10; i++) {
          defaultShowcase.push(unlockedPhotos[i] || null);
        }
        setShowcasePhotos(defaultShowcase);
        // Save default
        localStorage.setItem(
          `showcase_${userData.username}`, 
          JSON.stringify(defaultShowcase.map(p => p?._id || null))
        );
      }
      
      console.log('✅ Profile loaded successfully');
      
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // ===== SAVE SHOWCASE =====
  const saveShowcase = (newShowcase) => {
    setShowcasePhotos(newShowcase);
    const ids = newShowcase.map(p => p?._id || null);
    localStorage.setItem(`showcase_${profileUser?.username || user?.username}`, JSON.stringify(ids));
  };

  // ===== SET PHOTO IN SLOT =====
  const setShowcasePhoto = (slotIndex, photoId) => {
    const photo = profilePhotos.find(p => p._id === photoId && p.isUnlocked);
    if (!photo) return;

    // Check if photo is already used in another slot
    const existingSlot = showcasePhotos.findIndex(p => p?._id === photoId);
    if (existingSlot !== -1 && existingSlot !== slotIndex) {
      // Remove from existing slot
      const newShowcase = [...showcasePhotos];
      newShowcase[existingSlot] = null;
      newShowcase[slotIndex] = photo;
      saveShowcase(newShowcase);
    } else {
      const newShowcase = [...showcasePhotos];
      newShowcase[slotIndex] = photo;
      saveShowcase(newShowcase);
    }
    
    setSelectedSlotIndex(null);
    setShowPhotoModal(false);
  };

  // ===== REMOVE PHOTO FROM SLOT =====
  const removeShowcasePhoto = (slotIndex) => {
    const newShowcase = [...showcasePhotos];
    newShowcase[slotIndex] = null;
    saveShowcase(newShowcase);
  };

  // ===== EQUIP FUNCTIONS =====
  const equipBanner = async (bannerId) => {
    try {
      await api.post('/profile/equip-banner', { bannerId });
      setShowBannerModal(false);
      await fetchProfileData();
    } catch (error) {
      setError('Failed to equip banner');
    }
  };

  const equipTitle = async (titleId) => {
    try {
      await api.post('/profile/equip-title', { titleId });
      setShowTitleModal(false);
      await fetchProfileData();
    } catch (error) {
      setError('Failed to equip title');
    }
  };

  const equipPhoto = async (photoId) => {
    try {
      await api.post('/profile/equip-photo', { photoId });
      setShowPhotoModal(false);
      await fetchProfileData();
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

  // ===== FILTER PHOTOS FOR MODAL =====
  // Show all unlocked photos that are NOT already in showcase (except the selected slot)
  const getAvailablePhotos = () => {
    const usedPhotoIds = showcasePhotos
      .filter(p => p !== null)
      .map(p => p._id);
    
    return profilePhotos.filter(p => 
      p.isUnlocked && !usedPhotoIds.includes(p._id)
    );
  };

  const filteredAvailablePhotos = getAvailablePhotos().filter(photo => 
    photo.name.toLowerCase().includes(photoSearchTerm.toLowerCase())
  );

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

  const displayUser = profileUser || user;
  const username = displayUser?.username || 'User';
  const userStats = displayUser?.stats || { gamesWon: 0, winStreak: 0, gamesPlayed: 0 };
  const userShards = displayUser?.shards || 0;
  const totalGuesses = displayUser?.totalGuesses || 0;

  const equippedBanner = equipped.banner || null;
  const equippedTitle = equipped.title || null;
  const equippedPhoto = equipped.profilePhoto || null;

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

        <div className="banner-bottom-row">
          <div className="banner-left">
            <div 
              className="profile-photo-large"
              onClick={() => setShowPhotoModal(true)}
              style={equippedPhoto?.imageUrl ? { backgroundImage: `url(${equippedPhoto.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!equippedPhoto?.imageUrl && (
                <div className="profile-photo-placeholder">
                  <span>{username?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
              )}
              <div className="photo-edit-badge">📷</div>
            </div>

            <div className="banner-user-info">
              <h1 className="banner-username">{username}</h1>
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
              <span className="banner-stat-value">{userStats?.gamesWon || 0}</span>
              <span className="banner-stat-label">WINS</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-value">🔥 {userStats?.winStreak || 0}</span>
              <span className="banner-stat-label">STREAK</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-value">{totalGuesses || 0}</span>
              <span className="banner-stat-label">GUESSES</span>
            </div>
            <div className="banner-stat">
              <span className="banner-stat-value">{userStats?.gamesPlayed || 0}</span>
              <span className="banner-stat-label">GAMES</span>
            </div>
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
          <div className="stat-number">{userShards}</div>
          <div className="stat-label">💎 Shards</div>
        </div>
      </div>

      {/* ===== TOP 10 PROFILE PHOTOS (SHOWCASE) ===== */}
      <div className="profile-photos-section">
        <div className="photos-section-header">
          <h2>📸 Top Profile Photos</h2>
          <span className="photos-count">{showcasePhotos.filter(p => p !== null).length} / 10</span>
        </div>
        
        <div className="top-photos-grid">
          {showcasePhotos.map((photo, index) => (
            <div 
              key={index}
              className={`top-photo-item ${photo ? 'unlocked' : 'empty'} ${photo?.isEquipped ? 'equipped' : ''}`}
              onClick={() => {
                if (photo) {
                  // If photo exists, click to remove or change
                  if (window.confirm(`Remove "${photo.name}" from this slot?`)) {
                    removeShowcasePhoto(index);
                  }
                } else {
                  // If empty, open photo picker for this slot
                  setSelectedSlotIndex(index);
                  setShowPhotoModal(true);
                }
              }}
              title={photo ? `Click to remove ${photo.name}` : 'Click to add photo'}
            >
              {photo ? (
                <>
                  <div 
                    className="top-photo-preview" 
                    style={photo.imageUrl ? { backgroundImage: `url(${photo.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    <div className="photo-equipped-badge">📷</div>
                    {photo.rarity && (
                      <div className="photo-rarity-badge" style={{ color: getRarityColor(photo.rarity) }}>
                        {getRarityEmoji(photo.rarity)}
                      </div>
                    )}
                    <div className="photo-remove-hint">✕</div>
                  </div>
                  <div className="top-photo-name">{photo.name} {photo.rarity && `(${photo.rarity})`}</div>
                </>
              ) : (
                <>
                  <div className="top-photo-preview empty-preview">
                    <div className="add-icon">➕</div>
                  </div>
                  <div className="top-photo-name">Empty Slot</div>
                </>
              )}
            </div>
          ))}
        </div>
        <p className="showcase-hint">💡 Click an empty slot to add a photo • Click a filled slot to remove it</p>
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

      {/* ===== BANNER MODAL ===== */}
      {showBannerModal && (
        <div className="modal-overlay" onClick={() => setShowBannerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎨 Select Your Banner</h2>
              <button className="modal-close" onClick={() => setShowBannerModal(false)}>✕</button>
            </div>
            <div className="banner-grid">
              {banners.map((banner) => {
                const isEquipped = equippedBanner?._id === banner._id || equipped.banner === banner._id;
                return (
                  <div 
                    key={banner._id} 
                    className={`banner-item ${banner.isUnlocked ? '' : 'locked'} ${isEquipped ? 'equipped' : ''}`}
                    onClick={() => banner.isUnlocked && equipBanner(banner._id)}
                  >
                    {banner.isUnlocked ? (
                      <>
                        <div className="banner-preview" style={{ backgroundImage: `url(${banner.gifUrl})` }}>
                          <div className="banner-rarity" style={{ color: getRarityColor(banner.rarity) }}>
                            {getRarityEmoji(banner.rarity)} {banner.rarity}
                          </div>
                          {isEquipped && (
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== TITLE MODAL ===== */}
      {showTitleModal && (
        <div className="modal-overlay" onClick={() => setShowTitleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏷️ Select Your Title</h2>
              <button className="modal-close" onClick={() => setShowTitleModal(false)}>✕</button>
            </div>
            <div className="title-grid">
              {titles.map((title) => {
                const isEquipped = equippedTitle?._id === title._id || equipped.title === title._id;
                return (
                  <div 
                    key={title._id} 
                    className={`title-item ${title.isUnlocked ? '' : 'locked'} ${isEquipped ? 'equipped' : ''}`}
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
                      {isEquipped && (
                        <div className="equipped-badge">✅ Equipped</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== PHOTO MODAL (for both main photo and showcase) ===== */}
      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => {
          setShowPhotoModal(false);
          setSelectedSlotIndex(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedSlotIndex !== null 
                  ? `Select Photo for Slot ${selectedSlotIndex + 1}` 
                  : '📸 Profile Photos'}
              </h2>
              <button className="modal-close" onClick={() => {
                setShowPhotoModal(false);
                setSelectedSlotIndex(null);
              }}>✕</button>
            </div>
            
            {selectedSlotIndex !== null && (
              <p className="modal-hint">
                Choose a photo to add to slot {selectedSlotIndex + 1}
              </p>
            )}
            
            <div className="photo-search-container">
              <input
                type="text"
                className="photo-search-input"
                placeholder="🔍 Search photos..."
                value={photoSearchTerm}
                onChange={(e) => setPhotoSearchTerm(e.target.value)}
              />
              {photoSearchTerm && (
                <button 
                  className="photo-search-clear"
                  onClick={() => setPhotoSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="photo-grid">
              {/* If selecting for showcase, show available photos */}
              {selectedSlotIndex !== null ? (
                filteredAvailablePhotos.length === 0 ? (
                  <div className="photo-search-empty">
                    No available photos. All your unlocked photos are already in your showcase.
                  </div>
                ) : (
                  filteredAvailablePhotos.map((photo) => (
                    <div 
                      key={photo._id} 
                      className={`photo-item unlocked`}
                      onClick={() => setShowcasePhoto(selectedSlotIndex, photo._id)}
                    >
                      <div className="photo-preview" style={photo.imageUrl ? { backgroundImage: `url(${photo.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        <div className="photo-select-hint">➕</div>
                      </div>
                      <div className="photo-info">
                        <h4>{photo.name}</h4>
                        <p className="photo-anime">{photo.anime}</p>
                        <span className="photo-rarity" style={{ color: getRarityColor(photo.rarity) }}>
                          {getRarityEmoji(photo.rarity)} {photo.rarity}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Show all unlocked photos for main profile photo
                profilePhotos.filter(p => p.isUnlocked).map((photo) => {
                  const isEquipped = equippedPhoto?._id === photo._id || equipped.profilePhoto === photo._id;
                  return (
                    <div 
                      key={photo._id} 
                      className={`photo-item ${isEquipped ? 'equipped' : ''}`}
                      onClick={() => equipPhoto(photo._id)}
                    >
                      <div className="photo-preview" style={photo.imageUrl ? { backgroundImage: `url(${photo.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        {isEquipped && (
                          <div className="photo-equipped-badge">✅</div>
                        )}
                      </div>
                      <div className="photo-info">
                        <h4>{photo.name}</h4>
                        <p className="photo-anime">{photo.anime}</p>
                        <span className="photo-rarity" style={{ color: getRarityColor(photo.rarity) }}>
                          {getRarityEmoji(photo.rarity)} {photo.rarity}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
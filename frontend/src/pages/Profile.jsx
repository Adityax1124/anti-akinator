import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Profile.css';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [banners, setBanners] = useState([]);
  const [titles, setTitles] = useState([]);
  const [profilePhotos, setProfilePhotos] = useState([]);
  const [profileBackgrounds, setProfileBackgrounds] = useState([]);
  const [equipped, setEquipped] = useState({
    banner: null,
    title: null,
    profilePhoto: null,
    profileBackground: null
  });
  const [photoSearchTerm, setPhotoSearchTerm] = useState('');
  const [backgroundSearchTerm, setBackgroundSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [profileUser, setProfileUser] = useState(null);
  const [bannersLoaded, setBannersLoaded] = useState(false);
  const [titlesLoaded, setTitlesLoaded] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [backgroundsLoaded, setBackgroundsLoaded] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showcasePhotos, setShowcasePhotos] = useState(Array(10).fill(null));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    fetchProfileData();
  }, []);

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Common': return '#a0a0a0';
      case 'Uncommon': return '#4ecdc4';
      case 'Rare': return '#4a9eff';
      case 'Epic': return '#a855f7';
      case 'Legendary': return '#f59e0b';
      default: return '#a0a0a0';
    }
  };

  const getRarityEmoji = (rarity) => {
    switch (rarity) {
      case 'Common': return '⬜';
      case 'Uncommon': return '🟩';
      case 'Rare': return '🟦';
      case 'Epic': return '🟪';
      case 'Legendary': return '⭐';
      default: return '⬜';
    }
  };

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const timestamp = Date.now();

      const [profileRes, historyRes] = await Promise.all([
        api.get('/profile/me', { params: { _t: timestamp } }),
        api.get('/game/history', { params: { _t: timestamp } })
      ]);

      const userData = profileRes.data.user;
      setProfileUser(userData);

      setEquipped({
        banner: userData.equipped?.banner || null,
        title: userData.equipped?.title || null,
        profilePhoto: userData.equipped?.profilePhoto || null,
        profileBackground: userData.equipped?.profileBackground || null
      });

      setHistory(historyRes.data.games || []);

      await loadPhotos();
      await loadBackgrounds();
    } catch (error) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadBanners = async () => {
    if (bannersLoaded) return;
    try {
      const res = await api.get('/profile/banners', { params: { _t: Date.now() } });
      setBanners(res.data.banners || []);
      setBannersLoaded(true);
    } catch (error) {
    }
  };

  const loadTitles = async () => {
    if (titlesLoaded) return;
    try {
      const res = await api.get('/profile/titles', { params: { _t: Date.now() } });
      setTitles(res.data.titles || []);
      setTitlesLoaded(true);
    } catch (error) {
    }
  };

  const loadPhotos = async (forceRefresh = false) => {
    if (photosLoaded && !forceRefresh) return;
    try {
      const res = await api.get('/profile/photos', { params: { _t: Date.now() } });
      const photos = res.data.photos || [];
      setProfilePhotos(photos);
      setPhotosLoaded(true);

      const savedShowcase = localStorage.getItem(`showcase_${user?.username}`);
      if (savedShowcase) {
        try {
          const parsed = JSON.parse(savedShowcase);
          const validShowcase = parsed.map(id => {
            const photo = photos.find(p => p._id === id && p.isUnlocked);
            return photo || null;
          });
          while (validShowcase.length < 10) {
            validShowcase.push(null);
          }
          setShowcasePhotos(validShowcase.slice(0, 10));
        } catch {
          setShowcasePhotos(Array(10).fill(null));
        }
      } else {
        const unlockedPhotos = photos.filter(p => p.isUnlocked);
        const defaultShowcase = [];
        for (let i = 0; i < 10; i++) {
          defaultShowcase.push(unlockedPhotos[i] || null);
        }
        setShowcasePhotos(defaultShowcase);
        localStorage.setItem(
          `showcase_${user?.username}`,
          JSON.stringify(defaultShowcase.map(p => p?._id || null))
        );
      }
    } catch (error) {
    }
  };

  // ✅ NEW: Load profile backgrounds
  const loadBackgrounds = async (forceRefresh = false) => {
    if (backgroundsLoaded && !forceRefresh) return;
    try {
      const res = await api.get('/profile/backgrounds', { params: { _t: Date.now() } });
      setProfileBackgrounds(res.data.backgrounds || []);
      setBackgroundsLoaded(true);
    } catch (error) {
    }
  };

  const saveShowcase = (newShowcase) => {
    setShowcasePhotos(newShowcase);
    const ids = newShowcase.map(p => p?._id || null);
    localStorage.setItem(`showcase_${user?.username}`, JSON.stringify(ids));
  };

  const setShowcasePhoto = (slotIndex, photoId) => {
    const photo = profilePhotos.find(p => p._id === photoId && p.isUnlocked);
    if (!photo) return;

    const existingSlot = showcasePhotos.findIndex(p => p?._id === photoId);
    if (existingSlot !== -1 && existingSlot !== slotIndex) {
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

  const removeShowcasePhoto = (slotIndex) => {
    const newShowcase = [...showcasePhotos];
    newShowcase[slotIndex] = null;
    saveShowcase(newShowcase);
  };

  const handleShowcaseClick = async (index, photo) => {
    if (photo) {
      if (window.confirm(`Remove "${photo.name}" from this slot?`)) {
        removeShowcasePhoto(index);
      }
    } else {
      await loadPhotos(true);
      setSelectedSlotIndex(index);
      setShowPhotoModal(true);
    }
  };

  const equipBanner = async (bannerId) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/profile/equip-banner', { bannerId });

      if (response.data.success) {
        setShowBannerModal(false);
        setSuccessMessage('Banner equipped successfully');
        await fetchProfileData();
        await refreshUser();
        await loadBanners();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      setError('Failed to equip banner');
    } finally {
      setLoading(false);
    }
  };

  const equipTitle = async (titleId) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/profile/equip-title', { titleId });

      if (response.data.success) {
        setShowTitleModal(false);
        setSuccessMessage('Title equipped successfully');
        await fetchProfileData();
        await refreshUser();
        await loadTitles();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      setError('Failed to equip title');
    } finally {
      setLoading(false);
    }
  };

  const equipPhoto = async (photoId) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/profile/equip-photo', { photoId });

      if (response.data.success) {
        setShowPhotoModal(false);
        setSuccessMessage('Profile photo equipped successfully');
        await fetchProfileData();
        await refreshUser();
        await loadPhotos(true);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      setError('Failed to equip photo');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Equip profile background
  const equipBackground = async (backgroundId) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/profile/equip-background', { backgroundId });

      if (response.data.success) {
        setShowBackgroundModal(false);
        setSuccessMessage('Profile background equipped successfully');
        await fetchProfileData();
        await refreshUser();
        await loadBackgrounds(true);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      setError('Failed to equip background');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Unequip profile background
  const unequipBackground = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post('/profile/unequip-background');

      if (response.data.success) {
        setSuccessMessage('Profile background unequipped successfully');
        await fetchProfileData();
        await refreshUser();
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      setError('Failed to unequip background');
    } finally {
      setLoading(false);
    }
  };

  const openBannerModal = () => {
    loadBanners();
    setShowBannerModal(true);
  };

  const openTitleModal = () => {
    loadTitles();
    setShowTitleModal(true);
  };

  const openPhotoModal = () => {
    loadPhotos();
    setShowPhotoModal(true);
  };

  // ✅ NEW: Open background modal
  const openBackgroundModal = () => {
    loadBackgrounds();
    setShowBackgroundModal(true);
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'won': return '🎉';
      case 'lost': return '😔';
      case 'abandoned': return '🏳️';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'won': return 'status-won';
      case 'lost': return 'status-lost';
      case 'abandoned': return 'status-abandoned';
      default: return 'status-unknown';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'won': return 'WON';
      case 'lost': return 'LOST';
      case 'abandoned': return 'ABANDONED';
      default: return 'ACTIVE';
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

  const displayUser = profileUser || user;
  const username = displayUser?.username || 'User';
  const userStats = displayUser?.stats || { gamesWon: 0, winStreak: 0, gamesPlayed: 0 };
  const userShards = displayUser?.shards || 0;
  const totalGuesses = displayUser?.totalGuesses || 0;

  const equippedBanner = equipped.banner || null;
  const equippedTitle = equipped.title || null;
  const equippedPhoto = equipped.profilePhoto || null;
  const equippedBackground = equipped.profileBackground || null;

  const unlockedBanners = banners.filter(b => b.isUnlocked);
  const unlockedTitles = titles.filter(t => t.isUnlocked);
  const unlockedPhotos = profilePhotos.filter(p => p.isUnlocked);
  const unlockedBackgrounds = profileBackgrounds.filter(b => b.isUnlocked);

  const filteredPhotos = profilePhotos.filter(p =>
    p.isUnlocked && p.name?.toLowerCase().includes(photoSearchTerm.toLowerCase())
  );

  // ✅ NEW: Filter backgrounds
  const filteredBackgrounds = profileBackgrounds.filter(b =>
    b.isUnlocked && b.name?.toLowerCase().includes(backgroundSearchTerm.toLowerCase())
  );

  return (
    <div className={`profile-container ${isVisible ? 'visible' : ''}`}>
      <div className="bg-noise"></div>
      <div className="bg-grid"></div>

      {successMessage && (
        <div className="profile-alert profile-alert-success">{successMessage}</div>
      )}

      {error && (
        <div className="profile-alert profile-alert-error">{error}</div>
      )}

      <div
        className="profile-banner"
        style={equippedBanner?.gifUrl ? { backgroundImage: `url(${equippedBanner.gifUrl})` } : {}}
      >
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="banner-overlay"></div>

        <button
          className="banner-edit-btn"
          onClick={openBannerModal}
          title="Change Banner"
        >
          ✏️
        </button>

        <div className="banner-bottom-row">
          <div className="banner-left">
            <div
              className="profile-photo-large"
              onClick={openPhotoModal}
              style={equippedPhoto?.imageUrl ? {
                backgroundImage: `url(${equippedPhoto.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
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
                onClick={openTitleModal}
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

      {/* Profile Background */}
      <div className="profile-background-section">
        <div className="background-section-header">
          <h2>🖼️ Profile Background</h2>
          <button className="background-edit-btn" onClick={openBackgroundModal}>
            {equippedBackground ? 'Change Background' : 'Select Background'}
          </button>
        </div>
        <div 
          className="profile-background-preview"
          style={equippedBackground?.imageUrl ? {
            backgroundImage: `url(${equippedBackground.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '120px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)'
          } : {
            background: 'rgba(255,255,255,0.02)',
            minHeight: '120px',
            borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)'
          }}
        >
          {!equippedBackground && (
            <span>No background equipped</span>
          )}
          {equippedBackground && (
            <div className="background-equipped-info">
              <span className="bg-name">{equippedBackground.name}</span>
              {equippedBackground.rarity && (
                <span className="bg-rarity" style={{ color: getRarityColor(equippedBackground.rarity) }}>
                  {getRarityEmoji(equippedBackground.rarity)} {equippedBackground.rarity}
                </span>
              )}
              <button className="bg-unequip-btn" onClick={unequipBackground}>
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

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
          <div className="stat-number">{unlockedBackgrounds.length}</div>
          <div className="stat-label">🖼️ Backgrounds</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{userShards}</div>
          <div className="stat-label">🎴 Shards</div>
        </div>
      </div>

      <div className="profile-photos-section">
        <div className="photos-section-header">
          <h2>📸 Top Profile Photos</h2>
          <span className="photos-count">{showcasePhotos.filter(p => p !== null).length} / 10</span>
        </div>

        <div className="top-photos-grid">
          {showcasePhotos.map((photo, index) => (
            <div
              key={index}
              className={`top-photo-item ${photo ? 'unlocked' : 'empty'}`}
              onClick={() => handleShowcaseClick(index, photo)}
              title={photo ? `Click to remove ${photo.name}` : 'Click to add photo'}
            >
              {photo ? (
                <>
                  <div
                    className="top-photo-preview"
                    style={photo.imageUrl ? {
                      backgroundImage: `url(${photo.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : {}}
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

      {/* Banner Modal */}
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

      {/* Title Modal */}
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

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="modal-overlay" onClick={() => {
          setShowPhotoModal(false);
          setSelectedSlotIndex(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSlotIndex !== null ? `Select Photo for Slot ${selectedSlotIndex + 1}` : '📸 Profile Photos'}</h2>
              <button className="modal-close" onClick={() => {
                setShowPhotoModal(false);
                setSelectedSlotIndex(null);
              }}>✕</button>
            </div>

            {selectedSlotIndex !== null && (
              <p className="modal-hint">Choose a photo to add to slot {selectedSlotIndex + 1}</p>
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
              {(photoSearchTerm ? filteredPhotos : profilePhotos.filter(p => p.isUnlocked)).map((photo) => {
                const isEquipped = equippedPhoto?._id === photo._id || equipped.profilePhoto === photo._id;
                return (
                  <div
                    key={photo._id}
                    className={`photo-item ${isEquipped ? 'equipped' : ''}`}
                    onClick={() => {
                      if (selectedSlotIndex !== null) {
                        setShowcasePhoto(selectedSlotIndex, photo._id);
                      } else {
                        equipPhoto(photo._id);
                      }
                    }}
                  >
                    <div className="photo-preview" style={photo.imageUrl ? {
                      backgroundImage: `url(${photo.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    } : {}}>
                      {isEquipped && (
                        <div className="photo-equipped-badge">✅</div>
                      )}
                      {selectedSlotIndex !== null && !isEquipped && (
                        <div className="photo-select-hint">➕</div>
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
              })}
            </div>

            {photoSearchTerm && filteredPhotos.length === 0 && (
              <div className="photo-search-empty">No photos found matching "{photoSearchTerm}"</div>
            )}
          </div>
        </div>
      )}

      {/* ✅ NEW: Profile Background Modal */}
      {showBackgroundModal && (
        <div className="modal-overlay" onClick={() => setShowBackgroundModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🖼️ Select Profile Background</h2>
              <button className="modal-close" onClick={() => setShowBackgroundModal(false)}>✕</button>
            </div>

            <div className="background-search-container">
              <input
                type="text"
                className="background-search-input"
                placeholder="🔍 Search backgrounds..."
                value={backgroundSearchTerm}
                onChange={(e) => setBackgroundSearchTerm(e.target.value)}
              />
              {backgroundSearchTerm && (
                <button
                  className="background-search-clear"
                  onClick={() => setBackgroundSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="background-grid">
              {(backgroundSearchTerm ? filteredBackgrounds : profileBackgrounds.filter(b => b.isUnlocked)).map((bg) => {
                const isEquipped = equippedBackground?._id === bg._id || equipped.profileBackground === bg._id;
                return (
                  <div
                    key={bg._id}
                    className={`background-item ${isEquipped ? 'equipped' : ''}`}
                    onClick={() => equipBackground(bg._id)}
                  >
                    <div 
                      className="background-preview"
                      style={{
                        backgroundImage: `url(${bg.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        minHeight: '100px',
                        borderRadius: '8px'
                      }}
                    >
                      {isEquipped && (
                        <div className="background-equipped-badge">✅ Equipped</div>
                      )}
                      {bg.rarity && (
                        <div className="background-rarity-badge" style={{ color: getRarityColor(bg.rarity) }}>
                          {getRarityEmoji(bg.rarity)} {bg.rarity}
                        </div>
                      )}
                    </div>
                    <div className="background-info">
                      <h4>{bg.name}</h4>
                      {bg.category && <span className="bg-category">{bg.category}</span>}
                      {bg.description && <p>{bg.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {backgroundSearchTerm && filteredBackgrounds.length === 0 && (
              <div className="background-search-empty">No backgrounds found matching "{backgroundSearchTerm}"</div>
            )}

            {equippedBackground && (
              <div className="background-unequip-section">
                <button className="background-unequip-btn" onClick={unequipBackground}>
                  Remove Current Background
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
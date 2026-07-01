import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './PublicProfile.css';

const PublicProfile = () => {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/profile/public/${username}`, {
        params: { _t: Date.now() }
      });
      console.log('📥 Profile data:', response.data.user);
      setProfile(response.data.user);
      setError('');
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.response?.data?.message || 'User not found');
      setProfile(null);
    } finally {
      setLoading(false);
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

  const isOwnProfile = currentUser?.username === username;

  if (loading) {
    return (
      <div className="public-profile-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="public-profile-container">
        <div className="error-container">
          <h2>😕 User Not Found</h2>
          <p>{error || 'The user you are looking for does not exist.'}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isOwnProfile) {
    navigate('/profile');
    return null;
  }

  // ===== FIX: Extract photos properly =====
  const unlockedPhotos = profile.achievements?.profilePhotos || [];
  
  // Build display array (up to 10)
  const displayPhotos = [];
  for (let i = 0; i < 10; i++) {
    if (i < unlockedPhotos.length) {
      const photoData = unlockedPhotos[i];
      
      // Check if photoId is populated (object) or just an ID
      if (photoData.photoId && typeof photoData.photoId === 'object') {
        displayPhotos.push({
          ...photoData.photoId,
          isEquipped: photoData.isEquipped || false,
          unlockedAt: photoData.unlockedAt
        });
      } else {
        // If photoId is not populated, push null (show as locked)
        displayPhotos.push(null);
      }
    } else {
      displayPhotos.push(null);
    }
  }

  return (
    <div className="public-profile-container fade-in">
      {/* ===== PUBLIC BANNER ===== */}
      <div 
        className="public-profile-banner"
        style={profile.equipped?.banner?.gifUrl ? { backgroundImage: `url(${profile.equipped.banner.gifUrl})` } : {}}
      >
        <div className="public-banner-overlay"></div>

        <div className="public-banner-user-row">
          <div 
            className="public-profile-photo"
            style={profile.equipped?.profilePhoto?.imageUrl ? { 
              backgroundImage: `url(${profile.equipped.profilePhoto.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
          >
            {!profile.equipped?.profilePhoto?.imageUrl && (
              <div className="public-profile-photo-placeholder">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="public-banner-user-info">
            <h1 className="public-banner-username">{profile.username}</h1>
            
            {profile.equipped?.title && (
              <div className="public-banner-title" style={{ color: getRarityColor(profile.equipped.title.rarity) }}>
                {profile.equipped.title.displayName}
                <span className="public-title-rarity">
                  {' '}{getRarityEmoji(profile.equipped.title.rarity)} {profile.equipped.title.rarity}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="public-banner-stats">
          <div className="public-banner-stat">
            <span className="public-banner-stat-value">{profile.stats?.gamesWon || 0}</span>
            <span className="public-banner-stat-label">Wins</span>
          </div>
          <div className="public-banner-stat">
            <span className="public-banner-stat-value">🔥 {profile.stats?.winStreak || 0}</span>
            <span className="public-banner-stat-label">Streak</span>
          </div>
          <div className="public-banner-stat">
            <span className="public-banner-stat-value">{profile.totalGuesses || 0}</span>
            <span className="public-banner-stat-label">Guesses</span>
          </div>
        </div>
      </div>

      {/* ===== ACHIEVEMENT STATS ===== */}
      <div className="public-stats-grid">
        <div className="public-stat-card">
          <div className="public-stat-number">{profile.stats?.gamesPlayed || 0}</div>
          <div className="public-stat-label">🎮 Games</div>
        </div>
        <div className="public-stat-card">
          <div className="public-stat-number">{profile.achievements?.banners?.length || 0}</div>
          <div className="public-stat-label">🎨 Banners</div>
        </div>
        <div className="public-stat-card">
          <div className="public-stat-number">{profile.achievements?.titles?.length || 0}</div>
          <div className="public-stat-label">🏷️ Titles</div>
        </div>
        <div className="public-stat-card">
          <div className="public-stat-number">{profile.achievements?.profilePhotos?.length || 0}</div>
          <div className="public-stat-label">📸 Photos</div>
        </div>
      </div>

      {/* ===== TOP 10 PROFILE PHOTOS ===== */}
      <div className="public-photos-section">
        <div className="public-photos-section-header">
          <h2>📸 Profile Photos</h2>
          <span className="public-photos-count">{unlockedPhotos.length} / 10</span>
        </div>
        
        <div className="public-top-photos-grid">
          {displayPhotos.map((photo, index) => {
            const isUnlocked = photo !== null && photo.imageUrl;
            const isEquipped = isUnlocked && photo.isEquipped === true;
            
            return (
              <div 
                key={index}
                className={`public-top-photo-item ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`}
                title={isUnlocked ? photo.name || 'Unknown' : 'Locked'}
              >
                {isUnlocked ? (
                  <>
                    <div 
                      className="public-top-photo-preview" 
                      style={{ 
                        backgroundImage: `url(${photo.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {isEquipped && (
                        <div className="public-photo-equipped-badge">✅ Equipped</div>
                      )}
                      {photo.rarity && (
                        <div className="public-photo-rarity-badge" style={{ color: getRarityColor(photo.rarity) }}>
                          {getRarityEmoji(photo.rarity)}
                        </div>
                      )}
                    </div>
                    <div className="public-top-photo-name">
                      {photo.name || 'Unknown'}
                      {photo.rarity && ` (${photo.rarity})`}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="public-top-photo-preview locked-preview">
                      <div className="lock-icon-small">🔒</div>
                    </div>
                    <div className="public-top-photo-name">Locked</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn btn-secondary public-back-btn" onClick={() => navigate(-1)}>
        ← Go Back
      </button>
    </div>
  );
};

export default PublicProfile;
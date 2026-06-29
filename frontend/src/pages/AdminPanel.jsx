import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('characters');

  // Character state
  const [characters, setCharacters] = useState([]);
  const [charForm, setCharForm] = useState({
    name: '',
    anime: '',
    image: '',
    description: '',
    traits: {
      gender: 'Unknown',
      species: 'Human',
      age: '',
      occupation: '',
      powers: [],
      personality: [],
      affiliations: [],
      relationships: [],
      keyEvents: []
    },
    attributes: {
      isMainCharacter: false,
      isVillain: false,
      isFemale: false,
      hasPowers: false,
      isFromAnime: true
    }
  });
  const [editingCharId, setEditingCharId] = useState(null);

  // Banner state
  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState({
    name: '',
    gifUrl: '',
    description: '',
    unlockType: 'total_guesses',
    unlockCondition: { totalGuesses: '' },
    category: 'bronze',
    rarity: 'Common',
    isActive: true
  });
  const [editingBannerId, setEditingBannerId] = useState(null);

  // Title state
  const [titles, setTitles] = useState([]);
  const [titleForm, setTitleForm] = useState({
    name: '',
    displayName: '',
    description: '',
    displayType: 'prefix',
    unlockType: 'total_guesses',
    unlockCondition: { totalGuesses: '' },
    rarity: 'Common',
    isActive: true
  });
  const [editingTitleId, setEditingTitleId] = useState(null);

  // Profile Photo state
  const [photos, setPhotos] = useState([]);
  const [photoForm, setPhotoForm] = useState({
    name: '',
    characterName: '',
    imageUrl: '',
    anime: '',
    description: '',
    characterId: '',
    rarity: 'Common',
    isActive: true
  });
  const [editingPhotoId, setEditingPhotoId] = useState(null);

  // Stats state
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setError('Access denied. Admin only.');
      setLoading(false);
      return;
    }
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        charsRes, bannersRes, titlesRes, photosRes, statsRes, usersRes
      ] = await Promise.all([
        api.get('/admin/characters'),
        api.get('/admin/banners'),
        api.get('/admin/titles'),
        api.get('/admin/profile-photos'),
        api.get('/admin/stats'),
        api.get('/admin/users')
      ]);
      setCharacters(charsRes.data.characters);
      setBanners(bannersRes.data.banners);
      setTitles(titlesRes.data.titles);
      setPhotos(photosRes.data.photos);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setError('');
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // ===================== CHARACTER CRUD =====================
  const handleCharChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setCharForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (type === 'checkbox') {
      setCharForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setCharForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCharArray = (e, field) => {
    const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setCharForm(prev => ({
      ...prev,
      traits: {
        ...prev.traits,
        [field]: values
      }
    }));
  };

  const submitCharacter = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingCharId) {
        await api.put(`/admin/characters/${editingCharId}`, charForm);
        setSuccess('Character updated!');
      } else {
        await api.post('/admin/characters', charForm);
        setSuccess('Character added!');
      }
      resetCharForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save character');
    }
  };

  const resetCharForm = () => {
    setCharForm({
      name: '',
      anime: '',
      image: '',
      description: '',
      traits: {
        gender: 'Unknown',
        species: 'Human',
        age: '',
        occupation: '',
        powers: [],
        personality: [],
        affiliations: [],
        relationships: [],
        keyEvents: []
      },
      attributes: {
        isMainCharacter: false,
        isVillain: false,
        isFemale: false,
        hasPowers: false,
        isFromAnime: true
      }
    });
    setEditingCharId(null);
  };

  const editCharacter = (char) => {
    setCharForm({
      name: char.name,
      anime: char.anime,
      image: char.image || '',
      description: char.description,
      traits: {
        gender: char.traits.gender || 'Unknown',
        species: char.traits.species || 'Human',
        age: char.traits.age || '',
        occupation: char.traits.occupation || '',
        powers: char.traits.powers || [],
        personality: char.traits.personality || [],
        affiliations: char.traits.affiliations || [],
        relationships: char.traits.relationships || [],
        keyEvents: char.traits.keyEvents || []
      },
      attributes: {
        isMainCharacter: char.attributes.isMainCharacter || false,
        isVillain: char.attributes.isVillain || false,
        isFemale: char.attributes.isFemale || false,
        hasPowers: char.attributes.hasPowers || false,
        isFromAnime: char.attributes.isFromAnime !== undefined ? char.attributes.isFromAnime : true
      }
    });
    setEditingCharId(char._id);
    setActiveTab('characters');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteCharacter = async (id) => {
    if (!window.confirm('Delete this character?')) return;
    try {
      await api.delete(`/admin/characters/${id}`);
      setSuccess('Character deleted');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // ===================== BANNER CRUD =====================
  const handleBannerChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setBannerForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'unlockType') {
      // Reset condition when type changes
      let condition = {};
      if (value === 'total_guesses') condition = { totalGuesses: '' };
      else if (value === 'anime_guesses') condition = { anime: '', count: '' };
      else if (value === 'season_rank') condition = { seasonRank: '' };
      setBannerForm(prev => ({ ...prev, unlockType: value, unlockCondition: condition }));
    } else if (name.startsWith('cond.')) {
      const key = name.split('.')[1];
      setBannerForm(prev => ({
        ...prev,
        unlockCondition: { ...prev.unlockCondition, [key]: value }
      }));
    } else {
      setBannerForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitBanner = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // Convert numeric values
      const form = { ...bannerForm };
      if (form.unlockCondition.totalGuesses) form.unlockCondition.totalGuesses = Number(form.unlockCondition.totalGuesses);
      if (form.unlockCondition.count) form.unlockCondition.count = Number(form.unlockCondition.count);
      if (form.unlockCondition.seasonRank) form.unlockCondition.seasonRank = Number(form.unlockCondition.seasonRank);

      if (editingBannerId) {
        await api.put(`/admin/banners/${editingBannerId}`, form);
        setSuccess('Banner updated!');
      } else {
        await api.post('/admin/banners', form);
        setSuccess('Banner added!');
      }
      resetBannerForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save banner');
    }
  };

  const resetBannerForm = () => {
    setBannerForm({
      name: '',
      gifUrl: '',
      description: '',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: '' },
      category: 'bronze',
      rarity: 'Common',
      isActive: true
    });
    setEditingBannerId(null);
  };

  const editBanner = (banner) => {
    setBannerForm({
      name: banner.name,
      gifUrl: banner.gifUrl,
      description: banner.description || '',
      unlockType: banner.unlockType,
      unlockCondition: banner.unlockCondition || {},
      category: banner.category || 'bronze',
      rarity: banner.rarity || 'Common',
      isActive: banner.isActive !== undefined ? banner.isActive : true
    });
    setEditingBannerId(banner._id);
    setActiveTab('banners');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      setSuccess('Banner deleted');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // ===================== TITLE CRUD =====================
  const handleTitleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setTitleForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'unlockType') {
      let condition = {};
      if (value === 'total_guesses') condition = { totalGuesses: '' };
      else if (value === 'anime_guesses') condition = { anime: '', count: '' };
      else if (value === 'season_rank') condition = { seasonRank: '' };
      else if (value === 'win_streak') condition = { streak: '' };
      setTitleForm(prev => ({ ...prev, unlockType: value, unlockCondition: condition }));
    } else if (name.startsWith('cond.')) {
      const key = name.split('.')[1];
      setTitleForm(prev => ({
        ...prev,
        unlockCondition: { ...prev.unlockCondition, [key]: value }
      }));
    } else {
      setTitleForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitTitle = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const form = { ...titleForm };
      if (form.unlockCondition.totalGuesses) form.unlockCondition.totalGuesses = Number(form.unlockCondition.totalGuesses);
      if (form.unlockCondition.count) form.unlockCondition.count = Number(form.unlockCondition.count);
      if (form.unlockCondition.seasonRank) form.unlockCondition.seasonRank = Number(form.unlockCondition.seasonRank);
      if (form.unlockCondition.streak) form.unlockCondition.streak = Number(form.unlockCondition.streak);

      if (editingTitleId) {
        await api.put(`/admin/titles/${editingTitleId}`, form);
        setSuccess('Title updated!');
      } else {
        await api.post('/admin/titles', form);
        setSuccess('Title added!');
      }
      resetTitleForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save title');
    }
  };

  const resetTitleForm = () => {
    setTitleForm({
      name: '',
      displayName: '',
      description: '',
      displayType: 'prefix',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: '' },
      rarity: 'Common',
      isActive: true
    });
    setEditingTitleId(null);
  };

  const editTitle = (title) => {
    setTitleForm({
      name: title.name,
      displayName: title.displayName,
      description: title.description || '',
      displayType: title.displayType || 'prefix',
      unlockType: title.unlockType,
      unlockCondition: title.unlockCondition || {},
      rarity: title.rarity || 'Common',
      isActive: title.isActive !== undefined ? title.isActive : true
    });
    setEditingTitleId(title._id);
    setActiveTab('titles');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTitle = async (id) => {
    if (!window.confirm('Delete this title?')) return;
    try {
      await api.delete(`/admin/titles/${id}`);
      setSuccess('Title deleted');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // ===================== PROFILE PHOTO CRUD =====================
  const handlePhotoChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setPhotoForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setPhotoForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitPhoto = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingPhotoId) {
        await api.put(`/admin/profile-photos/${editingPhotoId}`, photoForm);
        setSuccess('Profile photo updated!');
      } else {
        await api.post('/admin/profile-photos', photoForm);
        setSuccess('Profile photo added!');
      }
      resetPhotoForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile photo');
    }
  };

  const resetPhotoForm = () => {
    setPhotoForm({
      name: '',
      characterName: '',
      imageUrl: '',
      anime: '',
      description: '',
      characterId: '',
      rarity: 'Common',
      isActive: true
    });
    setEditingPhotoId(null);
  };

  const editPhoto = (photo) => {
    setPhotoForm({
      name: photo.name,
      characterName: photo.characterName,
      imageUrl: photo.imageUrl,
      anime: photo.anime,
      description: photo.description || '',
      characterId: photo.characterId || '',
      rarity: photo.rarity || 'Common',
      isActive: photo.isActive !== undefined ? photo.isActive : true
    });
    setEditingPhotoId(photo._id);
    setActiveTab('photos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePhoto = async (id) => {
    if (!window.confirm('Delete this profile photo?')) return;
    try {
      await api.delete(`/admin/profile-photos/${id}`);
      setSuccess('Profile photo deleted');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // ===================== RENDER =====================
  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <h2>⛔ Access Denied</h2>
          <p>This page is for administrators only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container fade-in">
      <div className="admin-header">
        <h1 className="admin-title">👑 Admin Panel</h1>
        <div className="admin-tabs">
          <button 
            className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            <span className="tab-icon">📚</span> Characters
            <span className="tab-badge">{characters.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'banners' ? 'active' : ''}`}
            onClick={() => setActiveTab('banners')}
          >
            <span className="tab-icon">🎨</span> Banners
            <span className="tab-badge">{banners.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'titles' ? 'active' : ''}`}
            onClick={() => setActiveTab('titles')}
          >
            <span className="tab-icon">🏷️</span> Titles
            <span className="tab-badge">{titles.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            <span className="tab-icon">📸</span> Photos
            <span className="tab-badge">{photos.length}</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="tab-icon">👥</span> Users
          </button>
          <button 
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <span className="tab-icon">📊</span> Stats
          </button>
        </div>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success">{success}</div>}

      {/* ==================== CHARACTER TAB ==================== */}
      {activeTab === 'characters' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingCharId ? '✏️ Edit Character' : '➕ Add New Character'}</h2>
            <form onSubmit={submitCharacter} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input type="text" name="name" className="form-control" value={charForm.name} onChange={handleCharChange} required />
                </div>
                <div className="form-group">
                  <label>Anime *</label>
                  <input type="text" name="anime" className="form-control" value={charForm.anime} onChange={handleCharChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input type="text" name="image" className="form-control" value={charForm.image} onChange={handleCharChange} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea name="description" className="form-control" rows="3" value={charForm.description} onChange={handleCharChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select name="traits.gender" className="form-control" value={charForm.traits.gender} onChange={handleCharChange}>
                    <option value="Unknown">Unknown</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Species</label>
                  <input type="text" name="traits.species" className="form-control" value={charForm.traits.species} onChange={handleCharChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" name="traits.age" className="form-control" value={charForm.traits.age} onChange={handleCharChange} />
                </div>
                <div className="form-group">
                  <label>Occupation</label>
                  <input type="text" name="traits.occupation" className="form-control" value={charForm.traits.occupation} onChange={handleCharChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Powers (comma separated)</label>
                <input type="text" className="form-control" value={charForm.traits.powers.join(', ')} onChange={(e) => handleCharArray(e, 'powers')} />
              </div>
              <div className="form-group">
                <label>Personality (comma separated)</label>
                <input type="text" className="form-control" value={charForm.traits.personality.join(', ')} onChange={(e) => handleCharArray(e, 'personality')} />
              </div>
              <div className="form-group">
                <label>Affiliations (comma separated)</label>
                <input type="text" className="form-control" value={charForm.traits.affiliations.join(', ')} onChange={(e) => handleCharArray(e, 'affiliations')} />
              </div>
              <div className="form-group">
                <label>Key Events (comma separated)</label>
                <input type="text" className="form-control" value={charForm.traits.keyEvents.join(', ')} onChange={(e) => handleCharArray(e, 'keyEvents')} />
              </div>
              <div className="form-row checkboxes">
                <label className="checkbox-label"><input type="checkbox" name="attributes.isMainCharacter" checked={charForm.attributes.isMainCharacter} onChange={handleCharChange} /> Main</label>
                <label className="checkbox-label"><input type="checkbox" name="attributes.isVillain" checked={charForm.attributes.isVillain} onChange={handleCharChange} /> Villain</label>
                <label className="checkbox-label"><input type="checkbox" name="attributes.isFemale" checked={charForm.attributes.isFemale} onChange={handleCharChange} /> Female</label>
                <label className="checkbox-label"><input type="checkbox" name="attributes.hasPowers" checked={charForm.attributes.hasPowers} onChange={handleCharChange} /> Powers</label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editingCharId ? 'Update' : 'Add'} Character</button>
                {editingCharId && <button type="button" className="btn btn-secondary" onClick={resetCharForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>📚 All Characters ({characters.length})</h2>
            {characters.length === 0 ? <p className="empty-message">No characters added.</p> : (
              <div className="character-grid">
                {characters.map(char => (
                  <div key={char._id} className="character-card">
                    {char.image && <img src={char.image} alt={char.name} className="char-image" />}
                    <div className="char-info">
                      <h3>{char.name}</h3>
                      <p className="char-anime">{char.anime}</p>
                      <p className="char-desc">{char.description.substring(0, 80)}...</p>
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editCharacter(char)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCharacter(char._id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== BANNER TAB ==================== */}
      {activeTab === 'banners' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingBannerId ? '✏️ Edit Banner' : '➕ Add New Banner'}</h2>
            <form onSubmit={submitBanner} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Banner Name *</label>
                  <input type="text" name="name" className="form-control" value={bannerForm.name} onChange={handleBannerChange} required />
                </div>
                <div className="form-group">
                  <label>GIF URL *</label>
                  <input type="text" name="gifUrl" className="form-control" value={bannerForm.gifUrl} onChange={handleBannerChange} placeholder="https://..." required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={bannerForm.description} onChange={handleBannerChange} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unlock Type</label>
                  <select name="unlockType" className="form-control" value={bannerForm.unlockType} onChange={handleBannerChange}>
                    <option value="total_guesses">Total Guesses</option>
                    <option value="anime_guesses">Anime‑specific Guesses</option>
                    <option value="season_rank">Season Rank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select name="rarity" className="form-control" value={bannerForm.rarity} onChange={handleBannerChange}>
                    <option value="Common">Common</option><option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option><option value="Epic">Epic</option><option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" className="form-control" value={bannerForm.category} onChange={handleBannerChange}>
                    <option value="bronze">Bronze</option><option value="silver">Silver</option>
                    <option value="gold">Gold</option><option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option><option value="anime">Anime</option><option value="season">Season</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  {bannerForm.unlockType === 'total_guesses' && (
                    <input type="number" name="cond.totalGuesses" className="form-control" value={bannerForm.unlockCondition.totalGuesses || ''} onChange={handleBannerChange} placeholder="Number of guesses" />
                  )}
                  {bannerForm.unlockType === 'anime_guesses' && (
                    <>
                      <input type="text" name="cond.anime" className="form-control" value={bannerForm.unlockCondition.anime || ''} onChange={handleBannerChange} placeholder="Anime name" />
                      <input type="number" name="cond.count" className="form-control" value={bannerForm.unlockCondition.count || ''} onChange={handleBannerChange} placeholder="Count" style={{ marginTop: 6 }} />
                    </>
                  )}
                  {bannerForm.unlockType === 'season_rank' && (
                    <input type="number" name="cond.seasonRank" className="form-control" value={bannerForm.unlockCondition.seasonRank || ''} onChange={handleBannerChange} placeholder="Rank (e.g. 1)" />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="isActive" checked={bannerForm.isActive} onChange={handleBannerChange} /> Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editingBannerId ? 'Update' : 'Add'} Banner</button>
                {editingBannerId && <button type="button" className="btn btn-secondary" onClick={resetBannerForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>🎨 All Banners ({banners.length})</h2>
            {banners.length === 0 ? <p className="empty-message">No banners added.</p> : (
              <div className="banner-admin-grid">
                {banners.map(b => (
                  <div key={b._id} className="banner-admin-card">
                    {b.gifUrl && <div className="banner-preview" style={{ backgroundImage: `url(${b.gifUrl})` }} />}
                    <div className="banner-info">
                      <h4>{b.name}</h4>
                      <p>{b.description}</p>
                      <div className="banner-meta">
                        <span className={`rarity-${b.rarity?.toLowerCase()}`}>{b.rarity}</span>
                        <span>{b.unlockType}</span>
                      </div>
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editBanner(b)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteBanner(b._id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TITLE TAB ==================== */}
      {activeTab === 'titles' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingTitleId ? '✏️ Edit Title' : '➕ Add New Title'}</h2>
            <form onSubmit={submitTitle} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title ID (internal) *</label>
                  <input type="text" name="name" className="form-control" value={titleForm.name} onChange={handleTitleChange} required />
                </div>
                <div className="form-group">
                  <label>Display Name *</label>
                  <input type="text" name="displayName" className="form-control" value={titleForm.displayName} onChange={handleTitleChange} placeholder="e.g. The Rookie" required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={titleForm.description} onChange={handleTitleChange} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Display Type</label>
                  <select name="displayType" className="form-control" value={titleForm.displayType} onChange={handleTitleChange}>
                    <option value="prefix">Prefix (before name)</option>
                    <option value="suffix">Suffix (after name)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select name="rarity" className="form-control" value={titleForm.rarity} onChange={handleTitleChange}>
                    <option value="Common">Common</option><option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option><option value="Epic">Epic</option><option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unlock Type</label>
                  <select name="unlockType" className="form-control" value={titleForm.unlockType} onChange={handleTitleChange}>
                    <option value="total_guesses">Total Guesses</option>
                    <option value="anime_guesses">Anime‑specific Guesses</option>
                    <option value="season_rank">Season Rank</option>
                    <option value="win_streak">Win Streak</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  {titleForm.unlockType === 'total_guesses' && (
                    <input type="number" name="cond.totalGuesses" className="form-control" value={titleForm.unlockCondition.totalGuesses || ''} onChange={handleTitleChange} placeholder="Number of guesses" />
                  )}
                  {titleForm.unlockType === 'anime_guesses' && (
                    <>
                      <input type="text" name="cond.anime" className="form-control" value={titleForm.unlockCondition.anime || ''} onChange={handleTitleChange} placeholder="Anime name" />
                      <input type="number" name="cond.count" className="form-control" value={titleForm.unlockCondition.count || ''} onChange={handleTitleChange} placeholder="Count" style={{ marginTop: 6 }} />
                    </>
                  )}
                  {titleForm.unlockType === 'season_rank' && (
                    <input type="number" name="cond.seasonRank" className="form-control" value={titleForm.unlockCondition.seasonRank || ''} onChange={handleTitleChange} placeholder="Rank (e.g. 1)" />
                  )}
                  {titleForm.unlockType === 'win_streak' && (
                    <input type="number" name="cond.streak" className="form-control" value={titleForm.unlockCondition.streak || ''} onChange={handleTitleChange} placeholder="Streak length" />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="isActive" checked={titleForm.isActive} onChange={handleTitleChange} /> Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editingTitleId ? 'Update' : 'Add'} Title</button>
                {editingTitleId && <button type="button" className="btn btn-secondary" onClick={resetTitleForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>🏷️ All Titles ({titles.length})</h2>
            {titles.length === 0 ? <p className="empty-message">No titles added.</p> : (
              <div className="title-admin-grid">
                {titles.map(t => (
                  <div key={t._id} className="title-admin-card">
                    <div className="title-preview" style={{ color: t.rarity === 'Legendary' ? '#f59e0b' : t.rarity === 'Epic' ? '#a855f7' : t.rarity === 'Rare' ? '#4a9eff' : t.rarity === 'Uncommon' ? '#4ecdc4' : '#a0a0a0' }}>
                      {t.displayType === 'prefix' ? `[${t.displayName}] Username` : `Username [${t.displayName}]`}
                    </div>
                    <div className="title-meta">
                      <span className={`rarity-${t.rarity?.toLowerCase()}`}>{t.rarity}</span>
                      <span>{t.unlockType}</span>
                    </div>
                    <div className="char-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => editTitle(t)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteTitle(t._id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== PROFILE PHOTO TAB ==================== */}
      {activeTab === 'photos' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingPhotoId ? '✏️ Edit Profile Photo' : '➕ Add Profile Photo'}</h2>
            <form onSubmit={submitPhoto} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Photo Name *</label>
                  <input type="text" name="name" className="form-control" value={photoForm.name} onChange={handlePhotoChange} required />
                </div>
                <div className="form-group">
                  <label>Character Name *</label>
                  <input type="text" name="characterName" className="form-control" value={photoForm.characterName} onChange={handlePhotoChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Image URL *</label>
                  <input type="text" name="imageUrl" className="form-control" value={photoForm.imageUrl} onChange={handlePhotoChange} placeholder="https://..." required />
                </div>
                <div className="form-group">
                  <label>Anime *</label>
                  <input type="text" name="anime" className="form-control" value={photoForm.anime} onChange={handlePhotoChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={photoForm.description} onChange={handlePhotoChange} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Character ID (optional – if you want to link to existing character)</label>
                  <input type="text" name="characterId" className="form-control" value={photoForm.characterId} onChange={handlePhotoChange} placeholder="Character _id" />
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select name="rarity" className="form-control" value={photoForm.rarity} onChange={handlePhotoChange}>
                    <option value="Common">Common</option><option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option><option value="Epic">Epic</option><option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="isActive" checked={photoForm.isActive} onChange={handlePhotoChange} /> Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editingPhotoId ? 'Update' : 'Add'} Photo</button>
                {editingPhotoId && <button type="button" className="btn btn-secondary" onClick={resetPhotoForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>📸 All Profile Photos ({photos.length})</h2>
            {photos.length === 0 ? <p className="empty-message">No profile photos added.</p> : (
              <div className="photo-admin-grid">
                {photos.map(p => (
                  <div key={p._id} className="photo-admin-card">
                    <div className="photo-preview" style={{ backgroundImage: `url(${p.imageUrl})` }} />
                    <div className="photo-info">
                      <h4>{p.name}</h4>
                      <p>{p.characterName} • {p.anime}</p>
                      <span className={`rarity-${p.rarity?.toLowerCase()}`}>{p.rarity}</span>
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editPhoto(p)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePhoto(p._id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== USERS TAB ==================== */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="admin-list-card">
            <h2>👥 Registered Users ({users.length})</h2>
            {users.length === 0 ? <p className="empty-message">No users yet.</p> : (
              <div className="user-table-wrapper">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Username</th><th>Email</th><th>Role</th>
                      <th>Games</th><th>Wins</th><th>Streak</th><th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                        <td>{u.stats.gamesPlayed || 0}</td>
                        <td>{u.stats.gamesWon || 0}</td>
                        <td>{u.stats.winStreak || 0}</td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== STATS TAB ==================== */}
      {activeTab === 'stats' && stats && (
        <div className="admin-section">
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-number">{stats.totalGames}</div><div className="stat-label">Total Games</div></div>
            <div className="stat-card"><div className="stat-number">{stats.wonGames}</div><div className="stat-label">Won Games</div></div>
            <div className="stat-card"><div className="stat-number">{stats.winRate}%</div><div className="stat-label">Win Rate</div></div>
            <div className="stat-card"><div className="stat-number">{stats.totalCharacters}</div><div className="stat-label">Characters</div></div>
            <div className="stat-card"><div className="stat-number">{stats.totalUsers}</div><div className="stat-label">Users</div></div>
          </div>

          <div className="admin-list-card">
            <h2>🏆 Top Players</h2>
            {stats.topPlayers?.length === 0 ? <p className="empty-message">No players yet.</p> : (
              <div className="top-players-list">
                {stats.topPlayers?.map((player, index) => (
                  <div key={player._id} className="top-player-item">
                    <span className="rank">{index + 1}</span>
                    <span className="name">{player.username}</span>
                    <span className="wins">{player.stats.gamesWon} wins</span>
                    <span className="best">Streak: {player.stats.winStreak || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
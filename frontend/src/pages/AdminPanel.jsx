// /frontend/src/pages/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Transactions from './Admin/Transactions';
import './AdminPanel.css';

const AdminPanel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('characters');

  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetSuccess, setResetSuccess] = useState(null);

  const [characters, setCharacters] = useState([]);
  const [charForm, setCharForm] = useState({
    name: '',
    anime: '',
    image: '',
    description: '',
    crucialHint: '',
    powerLevel: 25,
    element: 'Fire',
    rarity: 'Common',
    basePower: 25,
    appearance: {
      hairColor: 'Unknown',
      eyeColor: 'Unknown',
      skinColor: 'Unknown',
      height: 'Unknown',
      build: 'Unknown',
      distinctiveFeatures: 'Unknown',
      clothing: 'Unknown',
      accessories: 'Unknown'
    },
    identity: {
      gender: 'Unknown',
      age: 'Unknown',
      birthday: 'Unknown',
      species: 'Unknown',
      nationality: 'Unknown',
      occupation: 'Unknown'
    },
    status: {
      isAlive: true,
      isDeceased: false,
      deathDetails: 'Unknown',
      currentStatus: 'Alive'
    },
    personality: {
      traits: [],
      likes: [],
      dislikes: [],
      goals: 'Unknown',
      fears: 'Unknown'
    },
    abilities: {
      powers: [],
      techniques: [],
      weapons: [],
      fightingStyle: 'Unknown',
      specialAbilities: 'Unknown'
    },
    relationships: {
      family: 'Unknown',
      friends: [],
      rivals: [],
      mentors: [],
      students: [],
      master: 'Unknown',
      affiliatedGroups: []
    },
    background: {
      origin: 'Unknown',
      backstory: 'Unknown',
      keyEvents: [],
      achievements: [],
      notableFights: []
    },
    attributes: {
      isMainCharacter: false,
      isVillain: false,
      isHero: false,
      isFemale: false,
      isChild: false,
      isElder: false,
      hasSpecialPower: false,
      hasWeapon: false,
      hasFamily: false,
      isFromAnime: true
    },
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
    }
  });
  const [editingCharId, setEditingCharId] = useState(null);

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

  // ===== PROFILE BACKGROUNDS =====
  const [profileBackgrounds, setProfileBackgrounds] = useState([]);
  const [bgForm, setBgForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    thumbnailUrl: '',
    category: 'anime',
    rarity: 'Common',
    unlockType: 'admin_gift',
    unlockData: null,
    isActive: true,
    isDefault: false
  });
  const [editingBgId, setEditingBgId] = useState(null);

  const [shopItems, setShopItems] = useState([]);
  const [shopForm, setShopForm] = useState({
    itemType: 'banner',
    itemId: '',
    price: '',
    isActive: true,
    isLimited: false,
    startDate: '',
    endDate: '',
    newBannerName: '',
    newBannerGifUrl: '',
    newPhotoName: '',
    newPhotoImageUrl: ''
  });
  const [editingShopId, setEditingShopId] = useState(null);

  // Gift System States
  const [giftForm, setGiftForm] = useState({
    userId: '',
    giftType: 'card',
    itemId: '',
    itemName: '',
    amount: '',
    message: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [giftItems, setGiftItems] = useState([]);
  const [loadingGiftItems, setLoadingGiftItems] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);

  // Season Pass States
  const [seasons, setSeasons] = useState([]);
  const [seasonForm, setSeasonForm] = useState({
    seasonNumber: '',
    seasonName: '',
    startDate: '',
    endDate: '',
    totalTiers: 100,
    correctGuessesPerTier: 2,
    description: ''
  });
  const [editingSeasonId, setEditingSeasonId] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonTiers, setSeasonTiers] = useState([]);
  const [tierRewardForm, setTierRewardForm] = useState({
    tier: '',
    type: 'shards',
    itemId: '',
    itemName: '',
    amount: '',
    message: ''
  });

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
        charsRes, bannersRes, titlesRes, photosRes, bgRes, shopRes, statsRes, usersRes, seasonsRes
      ] = await Promise.all([
        api.get('/admin/characters'),
        api.get('/admin/banners'),
        api.get('/admin/titles'),
        api.get('/admin/profile-photos'),
        api.get('/admin/profile-backgrounds'),
        api.get('/admin/shop-items'),
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/seasons')
      ]);
      setCharacters(charsRes.data.characters);
      setBanners(bannersRes.data.banners);
      setTitles(titlesRes.data.titles);
      setPhotos(photosRes.data.photos);
      setProfileBackgrounds(bgRes.data.backgrounds || []);
      setShopItems(shopRes.data.items || []);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setFilteredUsers(usersRes.data.users);
      setSeasons(seasonsRes.data.seasons || []);
      setError('');
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // ===== GIFT FUNCTIONS =====
  const fetchGiftItems = async (type) => {
    setLoadingGiftItems(true);
    try {
      let endpoint = '';
      if (type === 'card') endpoint = '/admin/characters';
      else if (type === 'banner') endpoint = '/admin/banners';
      else if (type === 'title') endpoint = '/admin/titles';
      else if (type === 'profilePhoto') endpoint = '/admin/profile-photos';
      else if (type === 'profileBackground') endpoint = '/admin/profile-backgrounds';
      else {
        setGiftItems([]);
        setLoadingGiftItems(false);
        return;
      }
      
      const response = await api.get(endpoint);
      const items = response.data.characters || response.data.banners || response.data.titles || response.data.photos || response.data.backgrounds || [];
      setGiftItems(items);
    } catch (err) {
      setGiftItems([]);
    } finally {
      setLoadingGiftItems(false);
    }
  };

  const handleGiftChange = (e) => {
    const { name, value } = e.target;
    setGiftForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'giftType') {
      fetchGiftItems(value);
      setGiftForm(prev => ({ ...prev, itemId: '', itemName: '', amount: '' }));
    }
  };

  const handleUserSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setGiftForm(prev => ({ ...prev, userId: '' }));
    
    if (term.length > 0) {
      const filtered = users.filter(u => 
        u.username.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term)
      );
      setFilteredUsers(filtered);
      setShowUserDropdown(true);
    } else {
      setFilteredUsers(users);
      setShowUserDropdown(false);
    }
  };

  const selectUser = (user) => {
    setGiftForm(prev => ({ ...prev, userId: user._id }));
    setSearchTerm(user.username);
    setShowUserDropdown(false);
  };

  const selectGiftItem = (item) => {
    setGiftForm(prev => ({
      ...prev,
      itemId: item._id,
      itemName: item.name || item.displayName || item.characterName
    }));
  };

  const sendGift = async (e) => {
    e.preventDefault();
    if (!giftForm.userId) {
      setError('Please select a user');
      return;
    }
    if (!giftForm.giftType) {
      setError('Please select a gift type');
      return;
    }

    setSendingGift(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        userId: giftForm.userId,
        giftType: giftForm.giftType,
        itemId: giftForm.itemId || null,
        itemName: giftForm.itemName || null,
        amount: giftForm.amount ? parseInt(giftForm.amount) : null,
        message: giftForm.message || `You received a ${giftForm.giftType} from Admin!`
      };

      const response = await api.post('/admin/gift', payload);
      
      if (response.data.success) {
        setSuccess(`✅ Gift sent successfully to ${searchTerm}!`);
        setGiftForm({
          userId: '',
          giftType: 'card',
          itemId: '',
          itemName: '',
          amount: '',
          message: ''
        });
        setSearchTerm('');
        setGiftItems([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send gift');
    } finally {
      setSendingGift(false);
    }
  };

  // ===== SEASON PASS FUNCTIONS =====
  const fetchSeasonDetails = async (seasonId) => {
    try {
      const response = await api.get(`/admin/seasons/${seasonId}`);
      if (response.data.success) {
        setSelectedSeason(response.data.season);
        setSeasonTiers(response.data.tiers || []);
      }
    } catch (err) {
      setError('Failed to load season details');
    }
  };

  const handleSeasonChange = (e) => {
    const { name, value } = e.target;
    setSeasonForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTierRewardChange = (e) => {
    const { name, value } = e.target;
    setTierRewardForm(prev => ({ ...prev, [name]: value }));
  };

  const submitSeason = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingSeasonId) {
        await api.put(`/admin/seasons/${editingSeasonId}`, seasonForm);
        setSuccess('Season updated successfully!');
      } else {
        await api.post('/admin/seasons', seasonForm);
        setSuccess('Season created successfully!');
      }
      resetSeasonForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save season');
    }
  };

  const resetSeasonForm = () => {
    setSeasonForm({
      seasonNumber: '',
      seasonName: '',
      startDate: '',
      endDate: '',
      totalTiers: 100,
      correctGuessesPerTier: 2,
      description: ''
    });
    setEditingSeasonId(null);
    setSelectedSeason(null);
    setSeasonTiers([]);
  };

  const editSeason = (season) => {
    setSeasonForm({
      seasonNumber: season.seasonNumber,
      seasonName: season.seasonName,
      startDate: season.startDate ? new Date(season.startDate).toISOString().split('T')[0] : '',
      endDate: season.endDate ? new Date(season.endDate).toISOString().split('T')[0] : '',
      totalTiers: season.totalTiers || 100,
      correctGuessesPerTier: season.correctGuessesPerTier || 2,
      description: season.description || ''
    });
    setEditingSeasonId(season._id);
    setActiveTab('seasons');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchSeasonDetails(season._id);
  };

  const deleteSeason = async (id) => {
    if (!window.confirm('Delete this season? This will also delete all tiers!')) return;
    try {
      await api.delete(`/admin/seasons/${id}`);
      setSuccess('Season deleted');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete season');
    }
  };

  const activateSeason = async (id) => {
    try {
      const response = await api.post(`/admin/seasons/${id}/activate`);
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchAllData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate season');
    }
  };

  const deactivateSeason = async (id) => {
    try {
      const response = await api.post(`/admin/seasons/${id}/deactivate`);
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchAllData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate season');
    }
  };

  const submitTierReward = async (e) => {
    e.preventDefault();
    if (!selectedSeason) {
      setError('Please select a season first');
      return;
    }
    if (!tierRewardForm.tier) {
      setError('Please enter a tier number');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const tier = parseInt(tierRewardForm.tier);
      
      const existingTier = seasonTiers.find(t => t.tier === tier);
      let existingRewards = existingTier ? existingTier.rewards : [];
      
      const newReward = {
        type: tierRewardForm.type,
        itemId: tierRewardForm.itemId || null,
        itemName: tierRewardForm.itemName || null,
        amount: tierRewardForm.amount ? parseInt(tierRewardForm.amount) : null,
        message: tierRewardForm.message || null
      };
      
      existingRewards.push(newReward);

      await api.put(`/admin/seasons/${selectedSeason._id}/tiers/${tier}`, {
        rewards: existingRewards
      });

      setSuccess(`Reward added to Tier ${tier} successfully!`);
      setTierRewardForm({
        tier: '',
        type: 'shards',
        itemId: '',
        itemName: '',
        amount: '',
        message: ''
      });
      fetchSeasonDetails(selectedSeason._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add reward');
    }
  };

  const deleteTierReward = async (tier, rewardIndex) => {
    if (!window.confirm('Remove this reward?')) return;
    
    try {
      const existingTier = seasonTiers.find(t => t.tier === tier);
      if (!existingTier) return;
      
      const updatedRewards = existingTier.rewards.filter((_, i) => i !== rewardIndex);
      
      await api.put(`/admin/seasons/${selectedSeason._id}/tiers/${tier}`, {
        rewards: updatedRewards
      });

      setSuccess('Reward removed successfully!');
      fetchSeasonDetails(selectedSeason._id);
    } catch (err) {
      setError('Failed to remove reward');
    }
  };

  const handleResetSeason = async () => {
    if (!window.confirm('Are you sure you want to reset the season?\n\nThis will:\n- Save current season winner\n- Reset all players\' season stats to 0\n- Start a new season\n\nThis action CANNOT be undone!')) {
      return;
    }

    setResetting(true);
    setResetMessage('');
    setResetSuccess(null);

    try {
      const response = await api.post('/admin/reset-season');

      if (response.data.success) {
        setResetSuccess(true);
        setResetMessage(response.data.message);
        await fetchAllData();
      } else {
        setResetSuccess(false);
        setResetMessage(response.data.message || 'Reset failed');
      }
    } catch (err) {
      setResetSuccess(false);
      setResetMessage(err.response?.data?.message || 'Error resetting season');
    } finally {
      setResetting(false);
    }
  };

  // ===== CHARACTER HANDLERS =====
  const handleCharChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      
      if (parent === 'appearance' || parent === 'identity' || parent === 'status' || 
          parent === 'personality' || parent === 'abilities' || parent === 'relationships' || 
          parent === 'background' || parent === 'attributes' || parent === 'traits') {
        setCharForm(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: type === 'checkbox' ? checked : value
          }
        }));
        return;
      }
    }

    if (type === 'checkbox') {
      setCharForm(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'powerLevel' || name === 'basePower') {
      setCharForm(prev => ({ ...prev, [name]: parseFloat(value) || 25 }));
      return;
    }

    setCharForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCharArray = (e, parent, field) => {
    const values = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setCharForm(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: values
      }
    }));
  };

  const submitCharacter = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...charForm,
        element: charForm.element || 'Fire',
        rarity: charForm.rarity || 'Common',
        basePower: charForm.basePower || charForm.powerLevel || 25
      };

      if (editingCharId) {
        await api.put(`/admin/characters/${editingCharId}`, payload);
        setSuccess('Character updated successfully!');
      } else {
        await api.post('/admin/characters', payload);
        setSuccess('Character added successfully!');
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
      crucialHint: '',
      powerLevel: 25,
      element: 'Fire',
      rarity: 'Common',
      basePower: 25,
      appearance: {
        hairColor: 'Unknown',
        eyeColor: 'Unknown',
        skinColor: 'Unknown',
        height: 'Unknown',
        build: 'Unknown',
        distinctiveFeatures: 'Unknown',
        clothing: 'Unknown',
        accessories: 'Unknown'
      },
      identity: {
        gender: 'Unknown',
        age: 'Unknown',
        birthday: 'Unknown',
        species: 'Unknown',
        nationality: 'Unknown',
        occupation: 'Unknown'
      },
      status: {
        isAlive: true,
        isDeceased: false,
        deathDetails: 'Unknown',
        currentStatus: 'Alive'
      },
      personality: {
        traits: [],
        likes: [],
        dislikes: [],
        goals: 'Unknown',
        fears: 'Unknown'
      },
      abilities: {
        powers: [],
        techniques: [],
        weapons: [],
        fightingStyle: 'Unknown',
        specialAbilities: 'Unknown'
      },
      relationships: {
        family: 'Unknown',
        friends: [],
        rivals: [],
        mentors: [],
        students: [],
        master: 'Unknown',
        affiliatedGroups: []
      },
      background: {
        origin: 'Unknown',
        backstory: 'Unknown',
        keyEvents: [],
        achievements: [],
        notableFights: []
      },
      attributes: {
        isMainCharacter: false,
        isVillain: false,
        isHero: false,
        isFemale: false,
        isChild: false,
        isElder: false,
        hasSpecialPower: false,
        hasWeapon: false,
        hasFamily: false,
        isFromAnime: true
      },
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
      }
    });
    setEditingCharId(null);
  };

  const editCharacter = (char) => {
    setCharForm({
      name: char.name,
      anime: char.anime,
      image: char.image || '',
      description: char.description || '',
      crucialHint: char.crucialHint || '',
      powerLevel: char.powerLevel || 25,
      element: char.element || 'Fire',
      rarity: char.rarity || 'Common',
      basePower: char.basePower || char.powerLevel || 25,
      appearance: {
        hairColor: char.appearance?.hairColor || 'Unknown',
        eyeColor: char.appearance?.eyeColor || 'Unknown',
        skinColor: char.appearance?.skinColor || 'Unknown',
        height: char.appearance?.height || 'Unknown',
        build: char.appearance?.build || 'Unknown',
        distinctiveFeatures: char.appearance?.distinctiveFeatures || 'Unknown',
        clothing: char.appearance?.clothing || 'Unknown',
        accessories: char.appearance?.accessories || 'Unknown'
      },
      identity: {
        gender: char.identity?.gender || 'Unknown',
        age: char.identity?.age || 'Unknown',
        birthday: char.identity?.birthday || 'Unknown',
        species: char.identity?.species || 'Unknown',
        nationality: char.identity?.nationality || 'Unknown',
        occupation: char.identity?.occupation || 'Unknown'
      },
      status: {
        isAlive: char.status?.isAlive !== undefined ? char.status.isAlive : true,
        isDeceased: char.status?.isDeceased || false,
        deathDetails: char.status?.deathDetails || 'Unknown',
        currentStatus: char.status?.currentStatus || 'Alive'
      },
      personality: {
        traits: char.personality?.traits || [],
        likes: char.personality?.likes || [],
        dislikes: char.personality?.dislikes || [],
        goals: char.personality?.goals || 'Unknown',
        fears: char.personality?.fears || 'Unknown'
      },
      abilities: {
        powers: char.abilities?.powers || [],
        techniques: char.abilities?.techniques || [],
        weapons: char.abilities?.weapons || [],
        fightingStyle: char.abilities?.fightingStyle || 'Unknown',
        specialAbilities: char.abilities?.specialAbilities || 'Unknown'
      },
      relationships: {
        family: char.relationships?.family || 'Unknown',
        friends: char.relationships?.friends || [],
        rivals: char.relationships?.rivals || [],
        mentors: char.relationships?.mentors || [],
        students: char.relationships?.students || [],
        master: char.relationships?.master || 'Unknown',
        affiliatedGroups: char.relationships?.affiliatedGroups || []
      },
      background: {
        origin: char.background?.origin || 'Unknown',
        backstory: char.background?.backstory || 'Unknown',
        keyEvents: char.background?.keyEvents || [],
        achievements: char.background?.achievements || [],
        notableFights: char.background?.notableFights || []
      },
      attributes: {
        isMainCharacter: char.attributes?.isMainCharacter || false,
        isVillain: char.attributes?.isVillain || false,
        isHero: char.attributes?.isHero || false,
        isFemale: char.attributes?.isFemale || false,
        isChild: char.attributes?.isChild || false,
        isElder: char.attributes?.isElder || false,
        hasSpecialPower: char.attributes?.hasSpecialPower || false,
        hasWeapon: char.attributes?.hasWeapon || false,
        hasFamily: char.attributes?.hasFamily || false,
        isFromAnime: char.attributes?.isFromAnime !== undefined ? char.attributes.isFromAnime : true
      },
      traits: {
        gender: char.traits?.gender || 'Unknown',
        species: char.traits?.species || 'Human',
        age: char.traits?.age || '',
        occupation: char.traits?.occupation || '',
        powers: char.traits?.powers || [],
        personality: char.traits?.personality || [],
        affiliations: char.traits?.affiliations || [],
        relationships: char.traits?.relationships || [],
        keyEvents: char.traits?.keyEvents || []
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

  // ===== BANNER HANDLERS =====
  const handleBannerChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setBannerForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'unlockType') {
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
      const form = { ...bannerForm };

      if (form.unlockCondition.totalGuesses) {
        form.unlockCondition.totalGuesses = Number(form.unlockCondition.totalGuesses);
      }
      if (form.unlockCondition.count) {
        form.unlockCondition.count = Number(form.unlockCondition.count);
      }
      if (form.unlockCondition.seasonRank) {
        form.unlockCondition.seasonRank = Number(form.unlockCondition.seasonRank);
      }

      if (editingBannerId) {
        await api.put(`/admin/banners/${editingBannerId}`, form);
        setSuccess('Banner updated successfully!');
      } else {
        await api.post('/admin/banners', form);
        setSuccess('Banner added successfully!');
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

  // ===== TITLE HANDLERS =====
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
        setSuccess('Title updated successfully!');
      } else {
        await api.post('/admin/titles', form);
        setSuccess('Title added successfully!');
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

  // ===== PROFILE PHOTO HANDLERS =====
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
        setSuccess('Profile photo updated successfully!');
      } else {
        await api.post('/admin/profile-photos', photoForm);
        setSuccess('Profile photo added successfully!');
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

  // ===== PROFILE BACKGROUND HANDLERS =====
  const handleBgChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setBgForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'unlockType') {
      let data = null;
      if (value === 'total_guesses') data = { totalGuesses: '' };
      else if (value === 'anime_guesses') data = { anime: '', count: '' };
      else if (value === 'season_rank') data = { seasonRank: '' };
      setBgForm(prev => ({ ...prev, unlockType: value, unlockData: data }));
    } else if (name.startsWith('unlockData.')) {
      const key = name.split('.')[1];
      setBgForm(prev => ({
        ...prev,
        unlockData: { ...prev.unlockData, [key]: value }
      }));
    } else {
      setBgForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitBg = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const form = { ...bgForm };
      
      // Process unlockData
      if (form.unlockData) {
        if (form.unlockData.totalGuesses) {
          form.unlockData.totalGuesses = Number(form.unlockData.totalGuesses);
        }
        if (form.unlockData.count) {
          form.unlockData.count = Number(form.unlockData.count);
        }
        if (form.unlockData.seasonRank) {
          form.unlockData.seasonRank = Number(form.unlockData.seasonRank);
        }
      }

      if (editingBgId) {
        await api.put(`/admin/profile-backgrounds/${editingBgId}`, form);
        setSuccess('Profile background updated successfully!');
      } else {
        await api.post('/admin/profile-backgrounds', form);
        setSuccess('Profile background added successfully!');
      }
      resetBgForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile background');
    }
  };

  const resetBgForm = () => {
    setBgForm({
      name: '',
      description: '',
      imageUrl: '',
      thumbnailUrl: '',
      category: 'anime',
      rarity: 'Common',
      unlockType: 'admin_gift',
      unlockData: null,
      isActive: true,
      isDefault: false
    });
    setEditingBgId(null);
  };

  const editBg = (bg) => {
    setBgForm({
      name: bg.name,
      description: bg.description || '',
      imageUrl: bg.imageUrl,
      thumbnailUrl: bg.thumbnailUrl || '',
      category: bg.category || 'anime',
      rarity: bg.rarity || 'Common',
      unlockType: bg.unlockType || 'admin_gift',
      unlockData: bg.unlockData || null,
      isActive: bg.isActive !== undefined ? bg.isActive : true,
      isDefault: bg.isDefault || false
    });
    setEditingBgId(bg._id);
    setActiveTab('backgrounds');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBg = async (id) => {
    if (!window.confirm('Delete this profile background?')) return;
    try {
      await api.delete(`/admin/profile-backgrounds/${id}`);
      setSuccess('Profile background deleted');
      fetchAllData();
    } catch (err) {
      setError('Failed to delete');
    }
  };

  // ===== SHOP HANDLERS =====
  const handleShopChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setShopForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setShopForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitShopItem = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let itemId = shopForm.itemId;

      if (shopForm.itemType === 'banner' && shopForm.newBannerName && shopForm.newBannerGifUrl) {
        const bannerData = {
          name: shopForm.newBannerName.trim(),
          gifUrl: shopForm.newBannerGifUrl.trim(),
          description: `Shop item: ${shopForm.newBannerName}`,
          unlockType: 'shop',
          unlockCondition: { totalGuesses: 99999999 },
          category: 'shop',
          rarity: 'Rare',
          isActive: true
        };

        const bannerRes = await api.post('/admin/banners', bannerData);
        itemId = bannerRes.data.banner._id;
      }

      if (shopForm.itemType === 'profilePhoto' && shopForm.newPhotoName && shopForm.newPhotoImageUrl) {
        const photoRes = await api.post('/admin/profile-photos', {
          name: shopForm.newPhotoName,
          characterName: shopForm.newPhotoName,
          imageUrl: shopForm.newPhotoImageUrl,
          anime: 'Shop Exclusive',
          description: `Shop item: ${shopForm.newPhotoName}`,
          rarity: 'Rare',
          isActive: true
        });
        itemId = photoRes.data.photo._id;
      }

      if (!itemId) {
        setError('Please select an existing item or fill in the new item details');
        return;
      }

      const payload = {
        itemType: shopForm.itemType,
        itemId: itemId,
        price: shopForm.price,
        isActive: shopForm.isActive,
        isLimited: shopForm.isLimited,
        startDate: shopForm.startDate || null,
        endDate: shopForm.endDate || null
      };

      if (editingShopId) {
        await api.put(`/admin/shop-items/${editingShopId}`, payload);
        setSuccess('Shop item updated successfully!');
      } else {
        await api.post('/admin/shop-items', payload);
        setSuccess('Shop item added successfully!');
      }
      resetShopForm();
      fetchAllData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save shop item');
    }
  };

  const resetShopForm = () => {
    setShopForm({
      itemType: 'banner',
      itemId: '',
      price: '',
      isActive: true,
      isLimited: false,
      startDate: '',
      endDate: '',
      newBannerName: '',
      newBannerGifUrl: '',
      newPhotoName: '',
      newPhotoImageUrl: ''
    });
    setEditingShopId(null);
  };

  const editShopItem = (item) => {
    setShopForm({
      itemType: item.itemType,
      itemId: item.itemId?._id || item.itemId,
      price: item.price,
      isActive: item.isActive,
      isLimited: item.isLimited || false,
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      newBannerName: '',
      newBannerGifUrl: '',
      newPhotoName: '',
      newPhotoImageUrl: ''
    });
    setEditingShopId(item._id);
    setActiveTab('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteShopItem = async (id) => {
    if (!window.confirm('Remove this item from shop?')) return;
    try {
      await api.delete(`/admin/shop-items/${id}`);
      setSuccess('Shop item removed');
      fetchAllData();
    } catch (err) {
      setError('Failed to remove');
    }
  };

  // ===== RENDER GIFT TAB =====
  const renderGiftTab = () => (
    <div className="admin-section">
      <div className="admin-form-card">
        <h2>🎁 Send Gift to Player</h2>
        <form onSubmit={sendGift} className="admin-form">
          <div className="form-group">
            <label>Search Player *</label>
            <div className="user-search-container">
              <input
                type="text"
                className="form-control"
                placeholder="Type username or email..."
                value={searchTerm}
                onChange={handleUserSearch}
                onFocus={() => searchTerm.length > 0 && setShowUserDropdown(true)}
                required
              />
              {showUserDropdown && filteredUsers.length > 0 && (
                <div className="user-dropdown">
                  {filteredUsers.slice(0, 10).map(u => (
                    <div key={u._id} className="user-dropdown-item" onClick={() => selectUser(u)}>
                      <span className="user-name">{u.username}</span>
                      <span className="user-email">{u.email}</span>
                      <span className="user-id">ID: {u._id}</span>
                    </div>
                  ))}
                  {filteredUsers.length > 10 && (
                    <div className="user-dropdown-more">+ {filteredUsers.length - 10} more users</div>
                  )}
                </div>
              )}
              {showUserDropdown && filteredUsers.length === 0 && searchTerm.length > 0 && (
                <div className="user-dropdown-empty">No users found</div>
              )}
            </div>
            {giftForm.userId && (
              <small className="form-hint success">✅ User selected: {searchTerm}</small>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gift Type *</label>
              <select name="giftType" className="form-control" value={giftForm.giftType} onChange={handleGiftChange} required>
                <option value="card">🃏 Card</option>
                <option value="title">🏆 Title</option>
                <option value="banner">🎨 Banner</option>
                <option value="profilePhoto">📸 Profile Photo</option>
                <option value="profileBackground">🖼️ Profile Background</option>
                <option value="shards">🎴 Shards</option>
                <option value="gems">💎 Gems</option>
              </select>
            </div>

            {giftForm.giftType === 'shards' || giftForm.giftType === 'gems' ? (
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  name="amount"
                  className="form-control"
                  value={giftForm.amount}
                  onChange={handleGiftChange}
                  placeholder="e.g., 100"
                  min="1"
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  name="itemName"
                  className="form-control"
                  value={giftForm.itemName}
                  onChange={handleGiftChange}
                  placeholder="e.g., Red Hair Shanks"
                  required
                />
                <small className="form-hint">Enter the name of the item</small>
              </div>
            )}
          </div>

          {(giftForm.giftType === 'card' || giftForm.giftType === 'title' || 
            giftForm.giftType === 'banner' || giftForm.giftType === 'profilePhoto' ||
            giftForm.giftType === 'profileBackground') && (
            <div className="form-group">
              <label>Select Item (Optional - Auto-fill Name)</label>
              <select 
                className="form-control" 
                onChange={(e) => {
                  const item = giftItems.find(i => i._id === e.target.value);
                  if (item) selectGiftItem(item);
                }}
                value=""
              >
                <option value="">-- Select from existing --</option>
                {loadingGiftItems ? (
                  <option disabled>Loading...</option>
                ) : (
                  giftItems.map(item => (
                    <option key={item._id} value={item._id}>
                      {item.name || item.displayName || item.characterName || 'Unknown'}
                    </option>
                  ))
                )}
              </select>
              <small className="form-hint">Selecting an item auto-fills the name above</small>
            </div>
          )}

          <div className="form-group">
            <label>Custom Message (Optional)</label>
            <input
              type="text"
              name="message"
              className="form-control"
              value={giftForm.message}
              onChange={handleGiftChange}
              placeholder="e.g., Congrats on your achievement!"
            />
            <small className="form-hint">This message will appear in the notification</small>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={sendingGift}>
              {sendingGift ? 'Sending...' : '🎁 Send Gift'}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-list-card">
        <h2>📋 Gift Instructions</h2>
        <div className="gift-instructions">
          <p><strong>How to send a gift:</strong></p>
          <ol>
            <li>Search and select a player by username or email</li>
            <li>Choose the gift type (Card, Title, Banner, Profile Photo, Profile Background, Shards, Gems)</li>
            <li>Enter the item name or select from existing items</li>
            <li>For shards/gems, enter the amount</li>
            <li>Add a custom message (optional)</li>
            <li>Click "Send Gift"</li>
          </ol>
          <p className="gift-note">💡 The player will receive a notification with the gift and can claim it from their notifications page.</p>
        </div>
      </div>
    </div>
  );

  // ===== RENDER SEASON PASS TAB =====
  const renderSeasonPassTab = () => (
    <div className="admin-section">
      <div className="admin-form-card">
        <h2>{editingSeasonId ? 'Edit Season' : 'Create New Season'}</h2>
        <form onSubmit={submitSeason} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Season Number *</label>
              <input
                type="number"
                name="seasonNumber"
                className="form-control"
                value={seasonForm.seasonNumber}
                onChange={handleSeasonChange}
                placeholder="e.g., 1"
                min="1"
                required
                disabled={!!editingSeasonId}
              />
            </div>
            <div className="form-group">
              <label>Season Name *</label>
              <input
                type="text"
                name="seasonName"
                className="form-control"
                value={seasonForm.seasonName}
                onChange={handleSeasonChange}
                placeholder="e.g., Summer 2026"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                name="startDate"
                className="form-control"
                value={seasonForm.startDate}
                onChange={handleSeasonChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                name="endDate"
                className="form-control"
                value={seasonForm.endDate}
                onChange={handleSeasonChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Tiers</label>
              <input
                type="number"
                name="totalTiers"
                className="form-control"
                value={seasonForm.totalTiers}
                onChange={handleSeasonChange}
                min="1"
                max="100"
              />
              <small className="form-hint">Default: 100</small>
            </div>
            <div className="form-group">
              <label>Correct Guesses Per Tier</label>
              <input
                type="number"
                name="correctGuessesPerTier"
                className="form-control"
                value={seasonForm.correctGuessesPerTier}
                onChange={handleSeasonChange}
                min="1"
              />
              <small className="form-hint">Default: 2</small>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              className="form-control"
              rows="2"
              value={seasonForm.description}
              onChange={handleSeasonChange}
              placeholder="Season description..."
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingSeasonId ? 'Update Season' : 'Create Season'}
            </button>
            {editingSeasonId && (
              <button type="button" className="btn btn-secondary" onClick={resetSeasonForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Season List */}
      <div className="admin-list-card">
        <h2>All Seasons</h2>
        {seasons.length === 0 ? (
          <p className="empty-message">No seasons created yet.</p>
        ) : (
          <div className="season-list">
            {seasons.map(season => (
              <div key={season._id} className={`season-item ${season.isActive ? 'active' : ''}`}>
                <div className="season-info">
                  <span className="season-number">Season {season.seasonNumber}</span>
                  <span className="season-name">{season.seasonName}</span>
                  <span className={`season-status ${season.isActive ? 'active' : 'inactive'}`}>
                    {season.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                  <span className="season-dates">
                    {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="season-actions">
                  {!season.isActive && (
                    <button className="btn btn-success btn-sm" onClick={() => activateSeason(season._id)}>
                      Activate
                    </button>
                  )}
                  {season.isActive && (
                    <button className="btn btn-warning btn-sm" onClick={() => deactivateSeason(season._id)}>
                      Deactivate
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => editSeason(season)}>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteSeason(season._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tier Management */}
      {selectedSeason && (
        <div className="admin-list-card">
          <h2>Season {selectedSeason.seasonNumber} - Tier Rewards</h2>
          
          <div className="tier-reward-form">
            <h3>Add Reward to Tier</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Tier Number *</label>
                <input
                  type="number"
                  name="tier"
                  className="form-control"
                  value={tierRewardForm.tier}
                  onChange={handleTierRewardChange}
                  placeholder="e.g., 1"
                  min="1"
                  max={selectedSeason.totalTiers || 100}
                  required
                />
              </div>
              <div className="form-group">
                <label>Reward Type *</label>
                <select name="type" className="form-control" value={tierRewardForm.type} onChange={handleTierRewardChange}>
                  <option value="shards">🎴 Shards</option>
                  <option value="gems">💎 Gems</option>
                  <option value="card">🃏 Card</option>
                  <option value="title">🏆 Title</option>
                  <option value="banner">🎨 Banner</option>
                  <option value="profilePhoto">📸 Profile Photo</option>
                  <option value="profileBackground">🖼️ Profile Background</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Item Name</label>
                <input
                  type="text"
                  name="itemName"
                  className="form-control"
                  value={tierRewardForm.itemName}
                  onChange={handleTierRewardChange}
                  placeholder="e.g., Red Hair Shanks"
                />
                <small className="form-hint">For cards/titles/banners/photos</small>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  name="amount"
                  className="form-control"
                  value={tierRewardForm.amount}
                  onChange={handleTierRewardChange}
                  placeholder="e.g., 100"
                  min="1"
                />
                <small className="form-hint">For shards/gems</small>
              </div>
            </div>

            <div className="form-group">
              <label>Item ID (for cards/titles/banners/photos/backgrounds)</label>
              <input
                type="text"
                name="itemId"
                className="form-control"
                value={tierRewardForm.itemId}
                onChange={handleTierRewardChange}
                placeholder="MongoDB ObjectId"
              />
              <small className="form-hint">Required for cards, titles, banners, profile photos, profile backgrounds</small>
            </div>

            <div className="form-group">
              <label>Custom Message</label>
              <input
                type="text"
                name="message"
                className="form-control"
                value={tierRewardForm.message}
                onChange={handleTierRewardChange}
                placeholder="e.g., Legendary card unlocked!"
              />
            </div>

            <button type="button" className="btn btn-primary" onClick={submitTierReward}>
              Add Reward
            </button>
          </div>

          {/* Tier List */}
          <div className="tier-list">
            {seasonTiers.map(tier => (
              <div key={tier.tier} className="tier-item">
                <h4>Tier {tier.tier}</h4>
                {tier.rewards.length === 0 ? (
                  <p className="no-rewards-text">No rewards</p>
                ) : (
                  <div className="tier-rewards-list">
                    {tier.rewards.map((reward, index) => (
                      <div key={index} className="tier-reward-item">
                        <span className="reward-type">{reward.type}</span>
                        <span className="reward-name">{reward.itemName || reward.type}</span>
                        {reward.amount && <span className="reward-amount">x{reward.amount}</span>}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteTierReward(tier.tier, index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-error">
          <h2>Access Denied</h2>
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
        <h1 className="admin-title">Admin Panel</h1>
        <div className="admin-tabs">
          <button className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>
            Characters <span className="tab-badge">{characters.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'banners' ? 'active' : ''}`} onClick={() => setActiveTab('banners')}>
            Banners <span className="tab-badge">{banners.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'titles' ? 'active' : ''}`} onClick={() => setActiveTab('titles')}>
            Titles <span className="tab-badge">{titles.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>
            Photos <span className="tab-badge">{photos.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'backgrounds' ? 'active' : ''}`} onClick={() => setActiveTab('backgrounds')}>
            Backgrounds <span className="tab-badge">{profileBackgrounds.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>
            Shop <span className="tab-badge">{shopItems.length}</span>
          </button>
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            Users
          </button>
          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            Stats
          </button>
          <button className={`tab-btn ${activeTab === 'gift' ? 'active' : ''}`} onClick={() => setActiveTab('gift')}>
            🎁 Gift
          </button>
          <button className={`tab-btn ${activeTab === 'seasons' ? 'active' : ''}`} onClick={() => setActiveTab('seasons')}>
            🎫 Seasons
          </button>
          <button className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            💳 Transactions
          </button>
        </div>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success">{success}</div>}

      <div className="season-reset-wrapper">
        <button onClick={handleResetSeason} disabled={resetting} className="season-reset-btn">
          {resetting ? 'Resetting...' : 'Reset Season'}
        </button>
        {resetMessage && (
          <div className={`reset-toast ${resetSuccess ? 'success' : 'error'}`}>
            {resetMessage}
          </div>
        )}
      </div>

      {activeTab === 'characters' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingCharId ? 'Edit Character' : 'Add New Character'}</h2>
            <form onSubmit={submitCharacter} className="admin-form">
              {/* Basic Info */}
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={charForm.name}
                    onChange={handleCharChange}
                    required
                    placeholder="e.g., Luffy"
                  />
                </div>
                <div className="form-group">
                  <label>Anime *</label>
                  <input
                    type="text"
                    name="anime"
                    className="form-control"
                    value={charForm.anime}
                    onChange={handleCharChange}
                    required
                    placeholder="e.g., One Piece"
                  />
                </div>
              </div>

              {/* Battle Stats */}
              <div className="form-group">
                <label>Power Level (1-50) *</label>
                <div className="power-level-input">
                  <input
                    type="range"
                    name="powerLevel"
                    className="power-slider"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={charForm.powerLevel}
                    onChange={handleCharChange}
                  />
                  <span className="power-value">{charForm.powerLevel}</span>
                </div>
                <small className="form-hint">Higher power = more valuable card in battles</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Element</label>
                  <select
                    name="element"
                    className="form-control"
                    value={charForm.element}
                    onChange={handleCharChange}
                    required
                  >
                    <option value="Fire">Fire</option>
                    <option value="Water">Water</option>
                    <option value="Wind">Wind</option>
                    <option value="Earth">Earth</option>
                  </select>
                  <small className="form-hint">Determines battle advantage</small>
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select
                    name="rarity"
                    className="form-control"
                    value={charForm.rarity}
                    onChange={handleCharChange}
                    required
                  >
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                  <small className="form-hint">Higher rarity = better base stats</small>
                </div>
              </div>

              <div className="form-group">
                <label>Base Power (for upgrades)</label>
                <input
                  type="number"
                  name="basePower"
                  className="form-control"
                  value={charForm.basePower}
                  onChange={handleCharChange}
                  min="0.5"
                  max="50"
                  step="0.5"
                  placeholder="Same as Power Level by default"
                />
                <small className="form-hint">Base power for card upgrades (starts same as power level)</small>
              </div>

              {/* Appearance */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Appearance</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Hair Color</label>
                  <input
                    type="text"
                    name="appearance.hairColor"
                    className="form-control"
                    value={charForm.appearance.hairColor}
                    onChange={handleCharChange}
                    placeholder="e.g., Black, Blonde, White"
                  />
                </div>
                <div className="form-group">
                  <label>Eye Color</label>
                  <input
                    type="text"
                    name="appearance.eyeColor"
                    className="form-control"
                    value={charForm.appearance.eyeColor}
                    onChange={handleCharChange}
                    placeholder="e.g., Blue, Red, Green"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Skin Color</label>
                  <input
                    type="text"
                    name="appearance.skinColor"
                    className="form-control"
                    value={charForm.appearance.skinColor}
                    onChange={handleCharChange}
                    placeholder="e.g., Fair, Tan, Dark"
                  />
                </div>
                <div className="form-group">
                  <label>Height</label>
                  <input
                    type="text"
                    name="appearance.height"
                    className="form-control"
                    value={charForm.appearance.height}
                    onChange={handleCharChange}
                    placeholder="e.g., Tall, Short"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Build</label>
                  <input
                    type="text"
                    name="appearance.build"
                    className="form-control"
                    value={charForm.appearance.build}
                    onChange={handleCharChange}
                    placeholder="e.g., Muscular, Slim, Athletic"
                  />
                </div>
                <div className="form-group">
                  <label>Distinctive Features</label>
                  <input
                    type="text"
                    name="appearance.distinctiveFeatures"
                    className="form-control"
                    value={charForm.appearance.distinctiveFeatures}
                    onChange={handleCharChange}
                    placeholder="e.g., Scar on eye, Tattoo, etc."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Clothing</label>
                  <input
                    type="text"
                    name="appearance.clothing"
                    className="form-control"
                    value={charForm.appearance.clothing}
                    onChange={handleCharChange}
                    placeholder="e.g., Red coat, Straw hat"
                  />
                </div>
                <div className="form-group">
                  <label>Accessories</label>
                  <input
                    type="text"
                    name="appearance.accessories"
                    className="form-control"
                    value={charForm.appearance.accessories}
                    onChange={handleCharChange}
                    placeholder="e.g., Glasses, Necklace, Sword"
                  />
                </div>
              </div>

              {/* Identity */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Identity</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select name="identity.gender" className="form-control" value={charForm.identity.gender} onChange={handleCharChange}>
                    <option value="Unknown">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="text"
                    name="identity.age"
                    className="form-control"
                    value={charForm.identity.age}
                    onChange={handleCharChange}
                    placeholder="e.g., 19, 30s, Unknown"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Birthday</label>
                  <input
                    type="text"
                    name="identity.birthday"
                    className="form-control"
                    value={charForm.identity.birthday}
                    onChange={handleCharChange}
                    placeholder="e.g., May 5, Unknown"
                  />
                </div>
                <div className="form-group">
                  <label>Species</label>
                  <input
                    type="text"
                    name="identity.species"
                    className="form-control"
                    value={charForm.identity.species}
                    onChange={handleCharChange}
                    placeholder="e.g., Human, Saiyan, Demon"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nationality</label>
                  <input
                    type="text"
                    name="identity.nationality"
                    className="form-control"
                    value={charForm.identity.nationality}
                    onChange={handleCharChange}
                    placeholder="e.g., Japanese, American, Unknown"
                  />
                </div>
                <div className="form-group">
                  <label>Occupation</label>
                  <input
                    type="text"
                    name="identity.occupation"
                    className="form-control"
                    value={charForm.identity.occupation}
                    onChange={handleCharChange}
                    placeholder="e.g., Pirate, Ninja, Hero"
                  />
                </div>
              </div>

              {/* Status */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Status</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="status.isAlive" checked={charForm.status.isAlive} onChange={handleCharChange} /> Alive
                  </label>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="status.isDeceased" checked={charForm.status.isDeceased} onChange={handleCharChange} /> Deceased
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Death Details</label>
                  <input
                    type="text"
                    name="status.deathDetails"
                    className="form-control"
                    value={charForm.status.deathDetails}
                    onChange={handleCharChange}
                    placeholder="e.g., Killed in battle, Died of old age"
                  />
                </div>
                <div className="form-group">
                  <label>Current Status</label>
                  <select name="status.currentStatus" className="form-control" value={charForm.status.currentStatus} onChange={handleCharChange}>
                    <option value="Alive">Alive</option>
                    <option value="Dead">Dead</option>
                    <option value="Missing">Missing</option>
                    <option value="Imprisoned">Imprisoned</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Personality */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Personality</h3>
              <div className="form-group">
                <label>Traits (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.personality.traits.join(', ')}
                  onChange={(e) => handleCharArray(e, 'personality', 'traits')}
                  placeholder="e.g., Brave, Kind, Ruthless"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Likes (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.personality.likes.join(', ')}
                    onChange={(e) => handleCharArray(e, 'personality', 'likes')}
                    placeholder="e.g., Meat, Fighting"
                  />
                </div>
                <div className="form-group">
                  <label>Dislikes (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.personality.dislikes.join(', ')}
                    onChange={(e) => handleCharArray(e, 'personality', 'dislikes')}
                    placeholder="e.g., Cowards, Bullies"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Goals</label>
                  <input
                    type="text"
                    name="personality.goals"
                    className="form-control"
                    value={charForm.personality.goals}
                    onChange={handleCharChange}
                    placeholder="e.g., Become Pirate King"
                  />
                </div>
                <div className="form-group">
                  <label>Fears</label>
                  <input
                    type="text"
                    name="personality.fears"
                    className="form-control"
                    value={charForm.personality.fears}
                    onChange={handleCharChange}
                    placeholder="e.g., Losing friends, Heights"
                  />
                </div>
              </div>

              {/* Abilities */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Abilities & Powers</h3>
              <div className="form-group">
                <label>Powers (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.abilities.powers.join(', ')}
                  onChange={(e) => handleCharArray(e, 'abilities', 'powers')}
                  placeholder="e.g., Gum-Gum Fruit, Haki"
                />
              </div>
              <div className="form-group">
                <label>Techniques (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.abilities.techniques.join(', ')}
                  onChange={(e) => handleCharArray(e, 'abilities', 'techniques')}
                  placeholder="e.g., Rasengan, Chidori"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Weapons (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.abilities.weapons.join(', ')}
                    onChange={(e) => handleCharArray(e, 'abilities', 'weapons')}
                    placeholder="e.g., Sword, Kunai"
                  />
                </div>
                <div className="form-group">
                  <label>Fighting Style</label>
                  <input
                    type="text"
                    name="abilities.fightingStyle"
                    className="form-control"
                    value={charForm.abilities.fightingStyle}
                    onChange={handleCharChange}
                    placeholder="e.g., Swordsmanship, Taijutsu"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Special Abilities</label>
                <input
                  type="text"
                  name="abilities.specialAbilities"
                  className="form-control"
                  value={charForm.abilities.specialAbilities}
                  onChange={handleCharChange}
                  placeholder="e.g., Can shrink objects, Time manipulation"
                />
              </div>

              {/* Relationships */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Relationships</h3>
              <div className="form-group">
                <label>Family</label>
                <input
                  type="text"
                  name="relationships.family"
                  className="form-control"
                  value={charForm.relationships.family}
                  onChange={handleCharChange}
                  placeholder="e.g., Son of Dragon, Brother of Ace"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Friends (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.relationships.friends.join(', ')}
                    onChange={(e) => handleCharArray(e, 'relationships', 'friends')}
                    placeholder="e.g., Zoro, Nami"
                  />
                </div>
                <div className="form-group">
                  <label>Rivals (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.relationships.rivals.join(', ')}
                    onChange={(e) => handleCharArray(e, 'relationships', 'rivals')}
                    placeholder="e.g., Sasuke, Vegeta"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Mentors (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.relationships.mentors.join(', ')}
                    onChange={(e) => handleCharArray(e, 'relationships', 'mentors')}
                    placeholder="e.g., Rayleigh, Jiraiya"
                  />
                </div>
                <div className="form-group">
                  <label>Students (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.relationships.students.join(', ')}
                    onChange={(e) => handleCharArray(e, 'relationships', 'students')}
                    placeholder="e.g., Naruto, Konohamaru"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Master</label>
                  <input
                    type="text"
                    name="relationships.master"
                    className="form-control"
                    value={charForm.relationships.master}
                    onChange={handleCharChange}
                    placeholder="e.g., Mihawk, Kakashi"
                  />
                </div>
                <div className="form-group">
                  <label>Affiliated Groups (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.relationships.affiliatedGroups.join(', ')}
                    onChange={(e) => handleCharArray(e, 'relationships', 'affiliatedGroups')}
                    placeholder="e.g., Straw Hat Pirates, Akatsuki"
                  />
                </div>
              </div>

              {/* Background */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Background</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Origin</label>
                  <input
                    type="text"
                    name="background.origin"
                    className="form-control"
                    value={charForm.background.origin}
                    onChange={handleCharChange}
                    placeholder="e.g., East Blue, Konoha"
                  />
                </div>
                <div className="form-group">
                  <label>Backstory</label>
                  <input
                    type="text"
                    name="background.backstory"
                    className="form-control"
                    value={charForm.background.backstory}
                    onChange={handleCharChange}
                    placeholder="Brief backstory of the character"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Key Events (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.background.keyEvents.join(', ')}
                  onChange={(e) => handleCharArray(e, 'background', 'keyEvents')}
                  placeholder="e.g., Ate Gum-Gum Fruit, Defeated Kaido"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Achievements (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.background.achievements.join(', ')}
                    onChange={(e) => handleCharArray(e, 'background', 'achievements')}
                    placeholder="e.g., Became Pirate King, Defeated Akatsuki"
                  />
                </div>
                <div className="form-group">
                  <label>Notable Fights (comma separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={charForm.background.notableFights.join(', ')}
                    onChange={(e) => handleCharArray(e, 'background', 'notableFights')}
                    placeholder="e.g., vs Kaido, vs Sasuke"
                  />
                </div>
              </div>

              {/* Attributes */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Attributes</h3>
              <div className="form-row checkboxes">
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.isMainCharacter" checked={charForm.attributes.isMainCharacter} onChange={handleCharChange} /> Main Character
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.isVillain" checked={charForm.attributes.isVillain} onChange={handleCharChange} /> Villain
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.isHero" checked={charForm.attributes.isHero} onChange={handleCharChange} /> Hero
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.isFemale" checked={charForm.attributes.isFemale} onChange={handleCharChange} /> Female
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.isChild" checked={charForm.attributes.isChild} onChange={handleCharChange} /> Child
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.isElder" checked={charForm.attributes.isElder} onChange={handleCharChange} /> Elder
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.hasSpecialPower" checked={charForm.attributes.hasSpecialPower} onChange={handleCharChange} /> Has Special Power
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.hasWeapon" checked={charForm.attributes.hasWeapon} onChange={handleCharChange} /> Has Weapon
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="attributes.hasFamily" checked={charForm.attributes.hasFamily} onChange={handleCharChange} /> Has Family
                </label>
              </div>

              {/* Image & Description */}
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="text"
                  name="image"
                  className="form-control"
                  value={charForm.image}
                  onChange={handleCharChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="form-group">
                <label>Crucial Hint</label>
                <input
                  type="text"
                  name="crucialHint"
                  className="form-control"
                  value={charForm.crucialHint || ''}
                  onChange={handleCharChange}
                  placeholder="e.g., This character ate a Devil Fruit"
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  className="form-control"
                  rows="4"
                  value={charForm.description}
                  onChange={handleCharChange}
                  required
                  placeholder="Full description of the character (will be sent to AI)"
                />
              </div>

              {/* Legacy Traits */}
              <h3 style={{ color: '#a89bff', marginTop: 20 }}>Legacy Traits</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Traits Gender</label>
                  <select name="traits.gender" className="form-control" value={charForm.traits.gender} onChange={handleCharChange}>
                    <option value="Unknown">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Traits Species</label>
                  <input
                    type="text"
                    name="traits.species"
                    className="form-control"
                    value={charForm.traits.species}
                    onChange={handleCharChange}
                    placeholder="e.g., Human, Saiyan"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Traits Age</label>
                  <input
                    type="number"
                    name="traits.age"
                    className="form-control"
                    value={charForm.traits.age}
                    onChange={handleCharChange}
                    placeholder="e.g., 19"
                  />
                </div>
                <div className="form-group">
                  <label>Traits Occupation</label>
                  <input
                    type="text"
                    name="traits.occupation"
                    className="form-control"
                    value={charForm.traits.occupation}
                    onChange={handleCharChange}
                    placeholder="e.g., Pirate, Ninja"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Traits Powers (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.traits.powers.join(', ')}
                  onChange={(e) => handleCharArray(e, 'traits', 'powers')}
                  placeholder="e.g., Gum-Gum Fruit, Haki"
                />
              </div>
              <div className="form-group">
                <label>Traits Personality (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.traits.personality.join(', ')}
                  onChange={(e) => handleCharArray(e, 'traits', 'personality')}
                  placeholder="e.g., Carefree, Determined"
                />
              </div>
              <div className="form-group">
                <label>Traits Affiliations (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.traits.affiliations.join(', ')}
                  onChange={(e) => handleCharArray(e, 'traits', 'affiliations')}
                  placeholder="e.g., Straw Hat Pirates"
                />
              </div>
              <div className="form-group">
                <label>Traits Relationships (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.traits.relationships.join(', ')}
                  onChange={(e) => handleCharArray(e, 'traits', 'relationships')}
                  placeholder="e.g., Brother of Ace"
                />
              </div>
              <div className="form-group">
                <label>Traits Key Events (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={charForm.traits.keyEvents.join(', ')}
                  onChange={(e) => handleCharArray(e, 'traits', 'keyEvents')}
                  placeholder="e.g., Ate Gum-Gum Fruit"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editingCharId ? 'Update' : 'Add'} Character</button>
                {editingCharId && <button type="button" className="btn btn-secondary" onClick={resetCharForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>All Characters ({characters.length})</h2>
            {characters.length === 0 ? <p className="empty-message">No characters added.</p> : (
              <div className="character-grid">
                {characters.map(char => (
                  <div key={char._id} className="character-card">
                    {char.image && <img src={char.image} alt={char.name} className="char-image" />}
                    <div className="char-info">
                      <h3>{char.name}</h3>
                      <p className="char-anime">{char.anime}</p>
                      <p className="char-power">Power: {char.powerLevel || 25}</p>
                      <div className="char-badges">
                        <span className={`element-badge ${char.element?.toLowerCase()}`}>{char.element || 'Fire'}</span>
                        <span className={`rarity-badge ${char.rarity?.toLowerCase()}`}>{char.rarity || 'Common'}</span>
                      </div>
                      <p className="char-desc">{char.description?.substring(0, 80)}...</p>
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editCharacter(char)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCharacter(char._id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingBannerId ? 'Edit Banner' : 'Add New Banner'}</h2>
            <form onSubmit={submitBanner} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Banner Name *</label>
                  <input type="text" name="name" className="form-control" value={bannerForm.name} onChange={handleBannerChange} required placeholder="e.g., Legendary Pirate" />
                </div>
                <div className="form-group">
                  <label>GIF URL *</label>
                  <input type="text" name="gifUrl" className="form-control" value={bannerForm.gifUrl} onChange={handleBannerChange} placeholder="https://example.com/banner.gif" required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={bannerForm.description} onChange={handleBannerChange} placeholder="Brief description of this banner" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unlock Type</label>
                  <select name="unlockType" className="form-control" value={bannerForm.unlockType} onChange={handleBannerChange}>
                    <option value="total_guesses">Total Guesses</option>
                    <option value="anime_guesses">Anime-specific Guesses</option>
                    <option value="season_rank">Season Rank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select name="rarity" className="form-control" value={bannerForm.rarity} onChange={handleBannerChange}>
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" className="form-control" value={bannerForm.category} onChange={handleBannerChange}>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option>
                    <option value="anime">Anime</option>
                    <option value="season">Season</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  {bannerForm.unlockType === 'total_guesses' && (
                    <input type="number" name="cond.totalGuesses" className="form-control" value={bannerForm.unlockCondition.totalGuesses || ''} onChange={handleBannerChange} placeholder="e.g., 100" min="1" />
                  )}
                  {bannerForm.unlockType === 'anime_guesses' && (
                    <>
                      <input type="text" name="cond.anime" className="form-control" value={bannerForm.unlockCondition.anime || ''} onChange={handleBannerChange} placeholder="e.g., One Piece" />
                      <input type="number" name="cond.count" className="form-control" value={bannerForm.unlockCondition.count || ''} onChange={handleBannerChange} placeholder="e.g., 30" min="1" style={{ marginTop: 6 }} />
                    </>
                  )}
                  {bannerForm.unlockType === 'season_rank' && (
                    <input type="number" name="cond.seasonRank" className="form-control" value={bannerForm.unlockCondition.seasonRank || ''} onChange={handleBannerChange} placeholder="e.g., 1" min="1" />
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
            <h2>All Banners ({banners.length})</h2>
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
                        <button className="btn btn-secondary btn-sm" onClick={() => editBanner(b)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteBanner(b._id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'titles' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingTitleId ? 'Edit Title' : 'Add New Title'}</h2>
            <form onSubmit={submitTitle} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Title ID (internal) *</label>
                  <input type="text" name="name" className="form-control" value={titleForm.name} onChange={handleTitleChange} required placeholder="e.g., the_rookie" />
                </div>
                <div className="form-group">
                  <label>Display Name *</label>
                  <input type="text" name="displayName" className="form-control" value={titleForm.displayName} onChange={handleTitleChange} placeholder="e.g., The Rookie" required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={titleForm.description} onChange={handleTitleChange} placeholder="Brief description of this title" />
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
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unlock Type</label>
                  <select name="unlockType" className="form-control" value={titleForm.unlockType} onChange={handleTitleChange}>
                    <option value="total_guesses">Total Guesses</option>
                    <option value="anime_guesses">Anime-specific Guesses</option>
                    <option value="season_rank">Season Rank</option>
                    <option value="win_streak">Win Streak</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  {titleForm.unlockType === 'total_guesses' && (
                    <input type="number" name="cond.totalGuesses" className="form-control" value={titleForm.unlockCondition.totalGuesses || ''} onChange={handleTitleChange} placeholder="e.g., 100" min="1" />
                  )}
                  {titleForm.unlockType === 'anime_guesses' && (
                    <>
                      <input type="text" name="cond.anime" className="form-control" value={titleForm.unlockCondition.anime || ''} onChange={handleTitleChange} placeholder="e.g., One Piece" />
                      <input type="number" name="cond.count" className="form-control" value={titleForm.unlockCondition.count || ''} onChange={handleTitleChange} placeholder="e.g., 50" min="1" style={{ marginTop: 6 }} />
                    </>
                  )}
                  {titleForm.unlockType === 'season_rank' && (
                    <input type="number" name="cond.seasonRank" className="form-control" value={titleForm.unlockCondition.seasonRank || ''} onChange={handleTitleChange} placeholder="e.g., 1" min="1" />
                  )}
                  {titleForm.unlockType === 'win_streak' && (
                    <input type="number" name="cond.streak" className="form-control" value={titleForm.unlockCondition.streak || ''} onChange={handleTitleChange} placeholder="e.g., 10" min="1" />
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
            <h2>All Titles ({titles.length})</h2>
            {titles.length === 0 ? <p className="empty-message">No titles added.</p> : (
              <div className="title-admin-grid">
                {titles.map(t => (
                  <div key={t._id} className="title-admin-card">
                    <div className="title-preview" style={{ color: t.rarity === 'Legendary' ? '#f5a623' : t.rarity === 'Epic' ? '#a89bff' : t.rarity === 'Rare' ? '#6cb1ff' : t.rarity === 'Uncommon' ? '#00d9c0' : '#b3b3b3' }}>
                      {t.displayType === 'prefix' ? `[${t.displayName}] Username` : `Username [${t.displayName}]`}
                    </div>
                    <div className="title-meta">
                      <span className={`rarity-${t.rarity?.toLowerCase()}`}>{t.rarity}</span>
                      <span>{t.unlockType}</span>
                    </div>
                    <div className="char-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => editTitle(t)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteTitle(t._id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingPhotoId ? 'Edit Profile Photo' : 'Add Profile Photo'}</h2>
            <form onSubmit={submitPhoto} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Photo Name *</label>
                  <input type="text" name="name" className="form-control" value={photoForm.name} onChange={handlePhotoChange} required placeholder="e.g., Shinobu Portrait" />
                </div>
                <div className="form-group">
                  <label>Character Name *</label>
                  <input type="text" name="characterName" className="form-control" value={photoForm.characterName} onChange={handlePhotoChange} required placeholder="e.g., Shinobu" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Image URL *</label>
                  <input type="text" name="imageUrl" className="form-control" value={photoForm.imageUrl} onChange={handlePhotoChange} placeholder="https://example.com/image.jpg" required />
                </div>
                <div className="form-group">
                  <label>Anime *</label>
                  <input type="text" name="anime" className="form-control" value={photoForm.anime} onChange={handlePhotoChange} required placeholder="e.g., One Piece" />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={photoForm.description} onChange={handlePhotoChange} placeholder="Brief description of the character" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Character ID (optional)</label>
                  <input type="text" name="characterId" className="form-control" value={photoForm.characterId} onChange={handlePhotoChange} placeholder="Character _id" />
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select name="rarity" className="form-control" value={photoForm.rarity} onChange={handlePhotoChange}>
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
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
            <h2>All Profile Photos ({photos.length})</h2>
            {photos.length === 0 ? <p className="empty-message">No profile photos added.</p> : (
              <div className="photo-admin-grid">
                {photos.map(p => (
                  <div key={p._id} className="photo-admin-card">
                    <div className="photo-preview" style={{ backgroundImage: `url(${p.imageUrl})` }} />
                    <div className="photo-info">
                      <h4>{p.name}</h4>
                      <p>{p.characterName} - {p.anime}</p>
                      <span className={`rarity-${p.rarity?.toLowerCase()}`}>{p.rarity}</span>
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editPhoto(p)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePhoto(p._id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'backgrounds' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingBgId ? 'Edit Profile Background' : 'Add New Profile Background'}</h2>
            <form onSubmit={submitBg} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Background Name *</label>
                  <input type="text" name="name" className="form-control" value={bgForm.name} onChange={handleBgChange} required placeholder="e.g., Cherry Blossom" />
                </div>
                <div className="form-group">
                  <label>Image URL *</label>
                  <input type="text" name="imageUrl" className="form-control" value={bgForm.imageUrl} onChange={handleBgChange} placeholder="https://example.com/background.jpg" required />
                </div>
              </div>

              <div className="form-group">
                <label>Thumbnail URL</label>
                <input type="text" name="thumbnailUrl" className="form-control" value={bgForm.thumbnailUrl} onChange={handleBgChange} placeholder="https://example.com/thumbnail.jpg" />
                <small className="form-hint">Optional - smaller preview image</small>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input type="text" name="description" className="form-control" value={bgForm.description} onChange={handleBgChange} placeholder="Brief description of this background" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select name="category" className="form-control" value={bgForm.category} onChange={handleBgChange}>
                    <option value="anime">Anime</option>
                    <option value="nature">Nature</option>
                    <option value="abstract">Abstract</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="premium">Premium</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Rarity</label>
                  <select name="rarity" className="form-control" value={bgForm.rarity} onChange={handleBgChange}>
                    <option value="Common">Common</option>
                    <option value="Uncommon">Uncommon</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unlock Type</label>
                  <select name="unlockType" className="form-control" value={bgForm.unlockType} onChange={handleBgChange}>
                    <option value="admin_gift">Admin Gift</option>
                    <option value="total_guesses">Total Guesses</option>
                    <option value="anime_guesses">Anime-specific Guesses</option>
                    <option value="season_rank">Season Rank</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  {bgForm.unlockType === 'total_guesses' && (
                    <input type="number" name="unlockData.totalGuesses" className="form-control" value={bgForm.unlockData?.totalGuesses || ''} onChange={handleBgChange} placeholder="e.g., 100" min="1" />
                  )}
                  {bgForm.unlockType === 'anime_guesses' && (
                    <>
                      <input type="text" name="unlockData.anime" className="form-control" value={bgForm.unlockData?.anime || ''} onChange={handleBgChange} placeholder="e.g., One Piece" />
                      <input type="number" name="unlockData.count" className="form-control" value={bgForm.unlockData?.count || ''} onChange={handleBgChange} placeholder="e.g., 30" min="1" style={{ marginTop: 6 }} />
                    </>
                  )}
                  {bgForm.unlockType === 'season_rank' && (
                    <input type="number" name="unlockData.seasonRank" className="form-control" value={bgForm.unlockData?.seasonRank || ''} onChange={handleBgChange} placeholder="e.g., 1" min="1" />
                  )}
                  {bgForm.unlockType === 'admin_gift' && (
                    <span className="form-hint">Admin gift - no condition required</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="isActive" checked={bgForm.isActive} onChange={handleBgChange} /> Active
                  </label>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="isDefault" checked={bgForm.isDefault} onChange={handleBgChange} /> Set as Default
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">{editingBgId ? 'Update' : 'Add'} Background</button>
                {editingBgId && <button type="button" className="btn btn-secondary" onClick={resetBgForm}>Cancel</button>}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>All Profile Backgrounds ({profileBackgrounds.length})</h2>
            {profileBackgrounds.length === 0 ? <p className="empty-message">No profile backgrounds added.</p> : (
              <div className="bg-admin-grid">
                {profileBackgrounds.map(bg => (
                  <div key={bg._id} className="bg-admin-card">
                    <div className="bg-preview" style={{ backgroundImage: `url(${bg.imageUrl})` }} />
                    <div className="bg-info">
                      <h4>{bg.name}</h4>
                      <p>{bg.description}</p>
                      <div className="bg-meta">
                        <span className={`rarity-${bg.rarity?.toLowerCase()}`}>{bg.rarity}</span>
                        <span>{bg.category}</span>
                        {bg.isDefault && <span className="default-badge">★ Default</span>}
                      </div>
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editBg(bg)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteBg(bg._id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <div className="admin-section">
          <div className="admin-form-card">
            <h2>{editingShopId ? 'Edit Shop Item' : 'Add Item to Shop'}</h2>
            <form onSubmit={submitShopItem} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Item Type *</label>
                  <select name="itemType" className="form-control" value={shopForm.itemType} onChange={handleShopChange} required>
                    <option value="banner">Banner</option>
                    <option value="profilePhoto">Profile Photo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (in Shards) *</label>
                  <input type="number" name="price" className="form-control" value={shopForm.price} onChange={handleShopChange} placeholder="e.g., 500" min="10" required />
                </div>
              </div>

              {shopForm.itemType === 'banner' ? (
                <>
                  <div className="form-group">
                    <label>Select Existing Banner (OR add new below)</label>
                    <select name="itemId" className="form-control" value={shopForm.itemId} onChange={handleShopChange}>
                      <option value="">Select an existing banner...</option>
                      {banners.map(b => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                    <small className="form-hint">Select an existing banner OR create a new one using the fields below</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>New Banner Name</label>
                      <input type="text" name="newBannerName" className="form-control" value={shopForm.newBannerName || ''} onChange={handleShopChange} placeholder="e.g., Gear 5 Luffy" />
                      <small className="form-hint">Leave empty if selecting existing banner</small>
                    </div>
                    <div className="form-group">
                      <label>Banner GIF URL *</label>
                      <input type="text" name="newBannerGifUrl" className="form-control" value={shopForm.newBannerGifUrl || ''} onChange={handleShopChange} placeholder="https://example.com/banner.gif" />
                      <small className="form-hint">Must end with .gif or .webp</small>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Select Existing Profile Photo (OR add new below)</label>
                    <select name="itemId" className="form-control" value={shopForm.itemId} onChange={handleShopChange}>
                      <option value="">Select an existing photo...</option>
                      {photos.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                    <small className="form-hint">Select an existing photo OR create a new one using the fields below</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>New Photo Name</label>
                      <input type="text" name="newPhotoName" className="form-control" value={shopForm.newPhotoName || ''} onChange={handleShopChange} placeholder="e.g., Luffy Portrait" />
                      <small className="form-hint">Leave empty if selecting existing photo</small>
                    </div>
                    <div className="form-group">
                      <label>Photo Image URL *</label>
                      <input type="text" name="newPhotoImageUrl" className="form-control" value={shopForm.newPhotoImageUrl || ''} onChange={handleShopChange} placeholder="https://example.com/image.jpg" />
                      <small className="form-hint">Must be a valid image URL</small>
                    </div>
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select name="isActive" className="form-control" value={shopForm.isActive} onChange={handleShopChange}>
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="isLimited" checked={shopForm.isLimited} onChange={handleShopChange} /> Time-Limited Item
                </label>
              </div>

              {shopForm.isLimited && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" name="startDate" className="form-control" value={shopForm.startDate} onChange={handleShopChange} />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" name="endDate" className="form-control" value={shopForm.endDate} onChange={handleShopChange} />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingShopId ? 'Update' : 'Add'} to Shop
                </button>
                {editingShopId && (
                  <button type="button" className="btn btn-secondary" onClick={resetShopForm}>Cancel</button>
                )}
              </div>
            </form>
          </div>

          <div className="admin-list-card">
            <h2>Shop Items ({shopItems.length})</h2>
            {shopItems.length === 0 ? <p className="empty-message">No items in shop.</p> : (
              <div className="shop-admin-grid">
                {shopItems.map(item => (
                  <div key={item._id} className="shop-admin-card">
                    <div className="shop-admin-preview">
                      {item.itemType === 'banner' && item.itemId?.gifUrl && (
                        <div className="shop-admin-banner" style={{ backgroundImage: `url(${item.itemId.gifUrl})` }} />
                      )}
                      {item.itemType === 'profilePhoto' && item.itemId?.imageUrl && (
                        <img src={item.itemId.imageUrl} alt={item.itemId.name} className="shop-admin-photo" />
                      )}
                      <div className="shop-admin-badges">
                        {item.isActive ? 'Active' : 'Inactive'}
                        {item.isLimited && ' - Limited'}
                      </div>
                    </div>
                    <div className="shop-admin-info">
                      <h4>{item.itemId?.name || 'Unknown'}</h4>
                      <p>{item.itemType}</p>
                      <p className="shop-admin-price">{item.price} Shards</p>
                      {item.isLimited && item.endDate && (
                        <p className="shop-admin-date">Until: {new Date(item.endDate).toLocaleDateString()}</p>
                      )}
                      <div className="char-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => editShopItem(item)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteShopItem(item._id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="admin-list-card">
            <h2>Registered Users ({users.length})</h2>
            {users.length === 0 ? <p className="empty-message">No users yet.</p> : (
              <div className="user-table-wrapper">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Games</th>
                      <th>Wins</th>
                      <th>Streak</th>
                      <th>Gems</th>
                      <th>Shards</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td><strong>{u.username}</strong></td>
                        <td>{u.email}</td>
                        <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                        <td>{u.stats?.gamesPlayed || 0}</td>
                        <td>{u.stats?.gamesWon || 0}</td>
                        <td>{u.stats?.winStreak || 0}</td>
                        <td><span className="gems-badge">{u.gems || 0}</span></td>
                        <td><span className="shards-badge">{u.shards || 0}</span></td>
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

      {activeTab === 'stats' && stats && (
        <div className="admin-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalGames}</div>
              <div className="stat-label">Total Games</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.wonGames}</div>
              <div className="stat-label">Won Games</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.winRate}%</div>
              <div className="stat-label">Win Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalCharacters}</div>
              <div className="stat-label">Characters</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-label">Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalTransactions || 0}</div>
              <div className="stat-label">Transactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.pendingTransactions || 0}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">₹{stats.totalRevenue || 0}</div>
              <div className="stat-label">Revenue</div>
            </div>
          </div>

          <div className="admin-list-card">
            <h2>Top Players</h2>
            {stats.topPlayers?.length === 0 ? <p className="empty-message">No players yet.</p> : (
              <div className="top-players-list">
                {stats.topPlayers?.map((player, index) => (
                  <div key={player._id} className="top-player-item">
                    <span className="rank">{index + 1}</span>
                    <span className="name">{player.username}</span>
                    <span className="wins">{player.stats?.gamesWon || 0} wins</span>
                    <span className="best">Streak: {player.stats?.winStreak || 0}</span>
                    {player.gems > 0 && <span className="gems">{player.gems}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gift' && renderGiftTab()}
      {activeTab === 'seasons' && renderSeasonPassTab()}
      {activeTab === 'transactions' && <Transactions />}
    </div>
  );
};

export default AdminPanel;
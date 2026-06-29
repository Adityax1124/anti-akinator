const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/auth');
const Character = require('../models/Character');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');

// ===== CHARACTER CRUD =====
router.get('/characters', adminMiddleware, async (req, res) => {
  try {
    const characters = await Character.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json({ success: true, characters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/characters', adminMiddleware, async (req, res) => {
  try {
    const characterData = req.body;
    characterData.createdBy = req.user._id;
    const character = new Character(characterData);
    await character.save();
    res.status(201).json({ success: true, character });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/characters/:id', adminMiddleware, async (req, res) => {
  try {
    const character = await Character.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!character) return res.status(404).json({ success: false, message: 'Character not found' });
    res.json({ success: true, character });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/characters/:id', adminMiddleware, async (req, res) => {
  try {
    const character = await Character.findByIdAndDelete(req.params.id);
    if (!character) return res.status(404).json({ success: false, message: 'Character not found' });
    res.json({ success: true, message: 'Character deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== BANNER CRUD =====
router.get('/banners', adminMiddleware, async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/banners', adminMiddleware, async (req, res) => {
  try {
    const banner = new Banner(req.body);
    await banner.save();
    res.status(201).json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/banners/:id', adminMiddleware, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true, banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/banners/:id', adminMiddleware, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== TITLE CRUD =====
router.get('/titles', adminMiddleware, async (req, res) => {
  try {
    const titles = await Title.find().sort({ createdAt: -1 });
    res.json({ success: true, titles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/titles', adminMiddleware, async (req, res) => {
  try {
    const title = new Title(req.body);
    await title.save();
    res.status(201).json({ success: true, title });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/titles/:id', adminMiddleware, async (req, res) => {
  try {
    const title = await Title.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!title) return res.status(404).json({ success: false, message: 'Title not found' });
    res.json({ success: true, title });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/titles/:id', adminMiddleware, async (req, res) => {
  try {
    const title = await Title.findByIdAndDelete(req.params.id);
    if (!title) return res.status(404).json({ success: false, message: 'Title not found' });
    res.json({ success: true, message: 'Title deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== PROFILE PHOTO CRUD =====
router.get('/profile-photos', adminMiddleware, async (req, res) => {
  try {
    const photos = await ProfilePhoto.find().sort({ createdAt: -1 });
    res.json({ success: true, photos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/profile-photos', adminMiddleware, async (req, res) => {
  try {
    const photo = new ProfilePhoto(req.body);
    await photo.save();
    res.status(201).json({ success: true, photo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/profile-photos/:id', adminMiddleware, async (req, res) => {
  try {
    const photo = await ProfilePhoto.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!photo) return res.status(404).json({ success: false, message: 'Profile photo not found' });
    res.json({ success: true, photo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/profile-photos/:id', adminMiddleware, async (req, res) => {
  try {
    const photo = await ProfilePhoto.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Profile photo not found' });
    res.json({ success: true, message: 'Profile photo deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== USERS & STATS =====
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const totalGames = await GameSession.countDocuments();
    const wonGames = await GameSession.countDocuments({ status: 'won' });
    const totalCharacters = await Character.countDocuments();
    const totalUsers = await User.countDocuments();

    const winRate = totalGames > 0 ? ((wonGames / totalGames) * 100).toFixed(1) : 0;

    // Top players by win streak, with populated avatar
    const topPlayers = await User.find()
      .select('username stats equipped.profilePhoto')
      .populate('equipped.profilePhoto', 'imageUrl')
      .sort({ 'stats.winStreak': -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalGames,
        wonGames,
        winRate,
        totalCharacters,
        totalUsers
      },
      topPlayers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');
const User = require('../models/User');

async function checkAndUnlockAchievements(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const unlocked = [];

  // ===== CHECK BANNERS =====
  const allBanners = await Banner.find({ isActive: true });
  for (const banner of allBanners) {
    // Skip if already unlocked
    const alreadyUnlocked = user.achievements?.banners?.some(
      b => b.bannerId.toString() === banner._id.toString()
    );
    if (alreadyUnlocked) continue;

    let isUnlocked = false;
    switch (banner.unlockType) {
      case 'total_guesses': {
        const required = banner.unlockCondition.totalGuesses;
        if (user.totalGuesses >= required) isUnlocked = true;
        break;
      }
      case 'anime_guesses': {
        const { anime, count } = banner.unlockCondition;
        const animeGuessCount = user.animeGuesses?.get(anime) || 0;
        if (animeGuessCount >= count) isUnlocked = true;
        break;
      }
      case 'season_rank': {
        // to be implemented with season system
        break;
      }
    }

    if (isUnlocked) {
      user.achievements.banners.push({
        bannerId: banner._id,
        unlockedAt: new Date(),
        isEquipped: false
      });
      unlocked.push({ type: 'banner', name: banner.name, data: banner });
    }
  }

  // ===== CHECK TITLES =====
  const allTitles = await Title.find({ isActive: true });
  for (const title of allTitles) {
    const alreadyUnlocked = user.achievements?.titles?.some(
      t => t.titleId.toString() === title._id.toString()
    );
    if (alreadyUnlocked) continue;

    let isUnlocked = false;
    switch (title.unlockType) {
      case 'total_guesses': {
        const required = title.unlockCondition.totalGuesses;
        if (user.totalGuesses >= required) isUnlocked = true;
        break;
      }
      case 'anime_guesses': {
        const { anime, count } = title.unlockCondition;
        const animeGuessCount = user.animeGuesses?.get(anime) || 0;
        if (animeGuessCount >= count) isUnlocked = true;
        break;
      }
      case 'win_streak': {
        const required = title.unlockCondition.streak;
        if (user.stats.winStreak >= required) isUnlocked = true;
        break;
      }
      case 'season_rank': {
        // to be implemented
        break;
      }
    }

    if (isUnlocked) {
      user.achievements.titles.push({
        titleId: title._id,
        unlockedAt: new Date(),
        isEquipped: false
      });
      unlocked.push({ type: 'title', name: title.name, data: title });
    }
  }

  if (unlocked.length > 0) {
    await user.save();
  }

  return unlocked;
}

async function unlockProfilePhoto(userId, characterId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const photo = await ProfilePhoto.findOne({
    characterId: characterId,
    isActive: true
  });
  if (!photo) return null;

  const alreadyUnlocked = user.achievements?.profilePhotos?.some(
    p => p.photoId.toString() === photo._id.toString()
  );
  if (alreadyUnlocked) return null;

  user.achievements.profilePhotos.push({
    photoId: photo._id,
    unlockedAt: new Date(),
    isEquipped: false
  });
  await user.save();

  return { type: 'profile_photo', name: photo.name, data: photo };
}

module.exports = { checkAndUnlockAchievements, unlockProfilePhoto };
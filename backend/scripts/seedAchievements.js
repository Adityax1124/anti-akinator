const Banner = require('../models/Banner');
const Title = require('../models/Title');
const ProfilePhoto = require('../models/ProfilePhoto');

async function seedAchievements() {
  // ===== BANNERS =====
  const banners = [
    // Bronze tier
    {
      name: 'Bronze Guesser',
      gifUrl: 'https://example.com/bronze-guesser.gif',
      description: 'Guessed 50 characters! The journey begins...',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 50 },
      category: 'bronze',
      rarity: 'Common'
    },
    {
      name: 'Silver Swordsman',
      gifUrl: 'https://example.com/silver-swordsman.gif',
      description: '100 characters guessed! You\'re on fire!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 100 },
      category: 'silver',
      rarity: 'Uncommon'
    },
    {
      name: 'Golden Legend',
      gifUrl: 'https://example.com/golden-legend.gif',
      description: '500 characters guessed! A true legend!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 500 },
      category: 'gold',
      rarity: 'Rare'
    },
    {
      name: 'One Piece King',
      gifUrl: 'https://example.com/onepiece-king.gif',
      description: 'Guessed 100 One Piece characters! King of the Pirates!',
      unlockType: 'anime_guesses',
      unlockCondition: { anime: 'One Piece', count: 100 },
      category: 'anime',
      rarity: 'Epic'
    },
    {
      name: 'Naruto Hokage',
      gifUrl: 'https://example.com/naruto-hokage.gif',
      description: 'Guessed 100 Naruto characters! The Hokage\'s legacy!',
      unlockType: 'anime_guesses',
      unlockCondition: { anime: 'Naruto', count: 100 },
      category: 'anime',
      rarity: 'Epic'
    },
    {
      name: 'Demon Slayer',
      gifUrl: 'https://example.com/demon-slayer.gif',
      description: 'Guessed 50 Demon Slayer characters! Hashira level!',
      unlockType: 'anime_guesses',
      unlockCondition: { anime: 'Demon Slayer', count: 50 },
      category: 'anime',
      rarity: 'Rare'
    },
    {
      name: 'Season 1 Champion',
      gifUrl: 'https://example.com/s1-champion.gif',
      description: 'Winner of Season 1! The first legend!',
      unlockType: 'season_rank',
      unlockCondition: { seasonRank: 1 },
      category: 'season',
      rarity: 'Legendary'
    },
    {
      name: 'Diamond Master',
      gifUrl: 'https://example.com/diamond-master.gif',
      description: '1000 characters guessed! Absolute mastery!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 1000 },
      category: 'diamond',
      rarity: 'Legendary'
    }
  ];

  // ===== TITLES =====
  const titles = [
    {
      name: 'Rookie',
      displayName: 'The Rookie',
      description: 'Just started your journey!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 10 },
      displayType: 'suffix',
      rarity: 'Common'
    },
    {
      name: 'Shadow Ninja',
      displayName: 'The Shadow Ninja',
      description: 'Guessed 50 characters silently!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 50 },
      displayType: 'prefix',
      rarity: 'Uncommon'
    },
    {
      name: 'Anime Sensei',
      displayName: 'Sensei',
      description: 'Guessed 200 characters! You\'re a master!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 200 },
      displayType: 'suffix',
      rarity: 'Rare'
    },
    {
      name: 'One Piece Fanatic',
      displayName: 'The Pirate King',
      description: 'Guessed 100 One Piece characters!',
      unlockType: 'anime_guesses',
      unlockCondition: { anime: 'One Piece', count: 100 },
      displayType: 'prefix',
      rarity: 'Epic'
    },
    {
      name: 'Hokage Dreamer',
      displayName: 'The Hokage',
      description: 'Guessed 100 Naruto characters!',
      unlockType: 'anime_guesses',
      unlockCondition: { anime: 'Naruto', count: 100 },
      displayType: 'prefix',
      rarity: 'Epic'
    },
    {
      name: 'Season 1 Champion',
      displayName: '🏆 S1 Champion',
      description: 'Won Season 1! The first champion!',
      unlockType: 'season_rank',
      unlockCondition: { seasonRank: 1 },
      displayType: 'prefix',
      rarity: 'Legendary'
    },
    {
      name: 'Immortal Legend',
      displayName: 'The Immortal',
      description: '500 characters guessed! You are legendary!',
      unlockType: 'total_guesses',
      unlockCondition: { totalGuesses: 500 },
      displayType: 'prefix',
      rarity: 'Legendary'
    },
    {
      name: 'Win Streak God',
      displayName: 'The Unstoppable',
      description: 'Won 10 games in a row!',
      unlockType: 'win_streak',
      unlockCondition: { streak: 10 },
      displayType: 'prefix',
      rarity: 'Epic'
    }
  ];

  // Clear existing data (optional)
  await Banner.deleteMany({});
  await Title.deleteMany({});

  // Insert banners and titles
  await Banner.insertMany(banners);
  await Title.insertMany(titles);

  console.log('✅ Banners and Titles seeded successfully!');
}

module.exports = seedAchievements;
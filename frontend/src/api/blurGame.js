// /frontend/src/api/blurGame.js
import api from './axios';

// ============================================================
// BLUR GAME API SERVICE
// ============================================================

/**
 * Start a new blur game session
 * @returns {Promise} Game session data with image URL
 */
export const startGame = async () => {
  try {
    const response = await api.post('/blur-game/start');
    return response.data;
  } catch (error) {
    console.error('Error starting blur game:', error);
    throw error;
  }
};

/**
 * Submit a guess for the current game
 * @param {string} gameId - The game session ID
 * @param {string} guess - The user's guess
 * @param {number} timeTaken - Time taken in seconds
 * @returns {Promise} Result of the guess
 */
export const submitGuess = async (gameId, guess, timeTaken) => {
  try {
    const response = await api.post('/blur-game/guess', {
      gameId,
      guess,
      timeTaken
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting guess:', error);
    throw error;
  }
};

/**
 * Get user's game history
 * @param {number} limit - Number of records to fetch
 * @param {number} page - Page number
 * @returns {Promise} Game history data
 */
export const getGameHistory = async (limit = 20, page = 1) => {
  try {
    const response = await api.get('/blur-game/history', {
      params: { limit, page }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching game history:', error);
    throw error;
  }
};

/**
 * Get today's daily challenge
 * @returns {Promise} Daily challenge data
 */
export const getDailyChallenge = async () => {
  try {
    const response = await api.get('/blur-game/daily');
    return response.data;
  } catch (error) {
    console.error('Error fetching daily challenge:', error);
    throw error;
  }
};

/**
 * Get user's blur game stats
 * @returns {Promise} Game stats
 */
export const getGameStats = async () => {
  try {
    const response = await api.get('/blur-game/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching game stats:', error);
    throw error;
  }
};

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================

/**
 * Save game state to localStorage (for resume later)
 * @param {Object} gameState - Game state object
 */
export const saveGameState = (gameState) => {
  try {
    localStorage.setItem('blurGameState', JSON.stringify(gameState));
  } catch (error) {
    console.error('Error saving game state:', error);
  }
};

/**
 * Get saved game state from localStorage
 * @returns {Object|null} Saved game state or null
 */
export const getSavedGameState = () => {
  try {
    const state = localStorage.getItem('blurGameState');
    return state ? JSON.parse(state) : null;
  } catch (error) {
    console.error('Error getting game state:', error);
    return null;
  }
};

/**
 * Clear saved game state from localStorage
 */
export const clearSavedGameState = () => {
  try {
    localStorage.removeItem('blurGameState');
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Calculate blur percentage based on time elapsed
 * @param {number} elapsedSeconds - Time elapsed in seconds
 * @param {number} totalSeconds - Total blur duration in seconds
 * @param {number} maxBlur - Maximum blur amount
 * @param {number} minBlur - Minimum blur amount
 * @returns {number} Blur amount
 */
export const calculateBlur = (
  elapsedSeconds,
  totalSeconds = 90,
  maxBlur = 99,
  minBlur = 0
) => {
  const progress = Math.min(elapsedSeconds / totalSeconds, 1);
  const blur = Math.max(minBlur, maxBlur - (maxBlur - minBlur) * progress);
  return Math.round(blur);
};

/**
 * Check if a guess is correct (with tolerance)
 * @param {string} guess - User's guess
 * @param {string} characterName - Actual character name
 * @returns {boolean} Whether the guess is correct
 */
export const checkGuess = (guess, characterName) => {
  if (!guess || !characterName) return false;

  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const normalizedGuess = normalize(guess);
  const normalizedName = normalize(characterName);

  // Exact match
  if (normalizedGuess === normalizedName) return true;

  // Check if guess is a substring of the name
  if (normalizedName.includes(normalizedGuess) && normalizedGuess.length >= 3) {
    return true;
  }

  // Check if all words in guess are in the name
  const guessWords = normalizedGuess.split(' ');
  const nameWords = normalizedName.split(' ');
  const allWordsMatch = guessWords.every(word => nameWords.includes(word));
  if (allWordsMatch && guessWords.length > 0) {
    return true;
  }

  return false;
};

/**
 * Check if user can win a card based on time
 * @param {number} timeTaken - Time taken in seconds
 * @param {number} timeLimit - Time limit in seconds (default: 30)
 * @returns {boolean} Whether the user wins a card
 */
export const canWinCard = (timeTaken, timeLimit = 30) => {
  return timeTaken <= timeLimit;
};

/**
 * Get reward emoji based on time taken
 * @param {number} timeTaken - Time taken in seconds
 * @returns {string} Reward emoji
 */
export const getRewardEmoji = (timeTaken) => {
  if (timeTaken <= 10) return '🏆';
  if (timeTaken <= 20) return '🥈';
  if (timeTaken <= 30) return '🥉';
  return '😅';
};

/**
 * Get reward message based on time taken
 * @param {number} timeTaken - Time taken in seconds
 * @param {boolean} isCorrect - Whether the guess was correct
 * @returns {string} Reward message
 */
export const getRewardMessage = (timeTaken, isCorrect) => {
  if (!isCorrect) return 'Better luck next time!';
  
  if (timeTaken <= 10) return '🏆 Amazing! Lightning fast guess!';
  if (timeTaken <= 20) return '🥈 Great job! Very quick!';
  if (timeTaken <= 30) return '🥉 Nice! You won the card!';
  return '✅ Correct! But try to guess within 30 seconds next time!';
};

// ============================================================
// DAILY CHALLENGE HELPERS
// ============================================================

/**
 * Check if today's daily challenge is still available
 * @param {string} lastPlayedDate - Last played date in YYYY-MM-DD format
 * @returns {boolean} Whether daily challenge is available
 */
export const isDailyChallengeAvailable = (lastPlayedDate) => {
  const today = new Date().toISOString().split('T')[0];
  return lastPlayedDate !== today;
};

/**
 * Get today's date string (YYYY-MM-DD)
 * @returns {string} Today's date
 */
export const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// ============================================================
// STATS HELPERS
// ============================================================

/**
 * Calculate win rate percentage
 * @param {number} gamesPlayed - Total games played
 * @param {number} gamesWon - Total games won
 * @returns {number} Win rate percentage
 */
export const calculateWinRate = (gamesPlayed, gamesWon) => {
  if (gamesPlayed === 0) return 0;
  return Math.round((gamesWon / gamesPlayed) * 100);
};

/**
 * Format time for display
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTimeDisplay = (seconds) => {
  if (!seconds) return '--';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};
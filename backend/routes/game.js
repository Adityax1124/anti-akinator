const express = require('express');
const { body, validationResult } = require('express-validator');
const Character = require('../models/Character');
const GameSession = require('../models/GameSession');
const User = require('../models/User');
const Referral = require('../models/Referral');
const ProfilePhoto = require('../models/ProfilePhoto');
const { checkAndUnlockAchievements, unlockProfilePhoto } = require('../utils/achievementUtils');
const { getCurrentSeason } = require('../utils/seasonUtils');
const { askAI } = require('../utils/aiRouter');
const router = express.Router();

// ===== HELPER: Normalize string for flexible matching =====
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== HELPER: Sanitize user input =====
function sanitizeInput(str) {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// ===== VALIDATION RULES =====
const validateGameId = [
  body('gameId')
    .notEmpty()
    .withMessage('Game ID is required')
    .isMongoId()
    .withMessage('Invalid game ID format')
];

const validateQuestion = [
  body('question')
    .trim()
    .escape()
    .isLength({ min: 1, max: 500 })
    .withMessage('Question must be between 1 and 500 characters')
];

const validateGuess = [
  body('guess')
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage('Guess must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'.,!?]+$/)
    .withMessage('Guess contains invalid characters')
];

// ============================================================
// GET ANIME OPTIONS (4 random anime)
// ============================================================
router.get('/anime-options', async (req, res) => {
  try {
    const allAnime = await Character.distinct('anime');
    
    if (!allAnime || allAnime.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No anime found in database.'
      });
    }

    if (allAnime.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Not enough anime in database. Need at least 4.',
        total: allAnime.length
      });
    }

    const shuffled = allAnime.sort(() => 0.5 - Math.random());
    const selectedAnime = shuffled.slice(0, 4);

    res.json({
      success: true,
      anime: selectedAnime,
      total: allAnime.length
    });

  } catch (error) {
    console.error('Get anime options error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get anime options'
    });
  }
});

// ============================================================
// START GAME WITH SELECTED ANIME
// ============================================================
router.post('/start', async (req, res) => {
  try {
    const { anime } = req.body;

    if (!anime) {
      return res.status(400).json({
        success: false,
        message: 'Please select an anime first!'
      });
    }

    const characters = await Character.find({ anime: anime });
    
    if (!characters || characters.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No characters found for "${anime}". Please try another anime.`
      });
    }

    const randomIndex = Math.floor(Math.random() * characters.length);
    const randomCharacter = characters[randomIndex];

    if (!randomCharacter) {
      return res.status(404).json({
        success: false,
        message: 'No character found. Please try again.'
      });
    }

    const activeGame = await GameSession.findOne({
      user: req.user._id,
      status: 'active'
    });

    if (activeGame) {
      activeGame.status = 'abandoned';
      activeGame.endedAt = new Date();
      await activeGame.save();
    }

    const game = new GameSession({
      user: req.user._id,
      character: randomCharacter._id,
      anime: anime,
      status: 'active',
      startedAt: new Date()
    });

    await game.save();

    console.log(`🎮 Game started: ${game._id} for user ${req.user.username} | Anime: ${anime} | Character: ${randomCharacter.name}`);

    res.json({
      success: true,
      gameId: game._id,
      anime: anime,
      characterCount: characters.length,
      message: `Game started! Guess the character from ${anime}.`
    });

  } catch (error) {
    console.error('Start game error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error starting game. Please try again.'
    });
  }
});

// ============================================================
// ASK QUESTION (COMPLETE DATA - NO RESTRICTION)
// ============================================================
router.post('/question', [...validateGameId, ...validateQuestion], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId, question } = req.body;
    const sanitizedQuestion = sanitizeInput(question);

    const game = await GameSession.findById(gameId).populate('character');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active. Start a new game.'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this game'
      });
    }

    if (game.totalQuestions >= 10) {
      return res.status(400).json({
        success: false,
        message: 'You have used all 10 questions. Please make a guess.',
        limitReached: true
      });
    }

    // ✅ DUPLICATE QUESTION CHECK
    const isDuplicate = game.questions.some(q => 
      q.question.toLowerCase().trim() === sanitizedQuestion.toLowerCase().trim()
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: '❌ You already asked this question! Try something else.',
        isDuplicate: true
      });
    }

    const character = game.character;

    // ✅ COMPLETE CONTEXT - NO RESTRICTION ON DATA
    const context = `
===== COMPLETE CHARACTER DATA (ONLY SOURCE OF TRUTH) =====
Name: ${character.name} (CONFIDENTIAL - DO NOT REVEAL)
Anime: ${character.anime}

===== APPEARANCE =====
Hair Color: ${character.appearance?.hairColor || character.traits?.hairColor || 'Not Mentioned'}
Eye Color: ${character.appearance?.eyeColor || character.traits?.eyeColor || 'Not Mentioned'}
Skin Color: ${character.appearance?.skinColor || 'Not Mentioned'}
Height: ${character.appearance?.height || 'Not Mentioned'}
Build: ${character.appearance?.build || 'Not Mentioned'}
Distinctive Features: ${character.appearance?.distinctiveFeatures || 'Not Mentioned'}
Clothing: ${character.appearance?.clothing || 'Not Mentioned'}
Accessories: ${character.appearance?.accessories || 'Not Mentioned'}

===== IDENTITY =====
Gender: ${character.identity?.gender || character.traits?.gender || 'Not Mentioned'}
Age: ${character.identity?.age || character.traits?.age || 'Not Mentioned'}
Birthday: ${character.identity?.birthday || 'Not Mentioned'}
Species: ${character.identity?.species || character.traits?.species || 'Not Mentioned'}
Nationality: ${character.identity?.nationality || 'Not Mentioned'}
Occupation: ${character.identity?.occupation || character.traits?.occupation || 'Not Mentioned'}

===== STATUS =====
Alive: ${character.status?.isAlive !== undefined ? (character.status.isAlive ? 'Yes' : 'No') : 'Not Mentioned'}
Dead: ${character.status?.isDeceased ? 'Yes' : 'No'}
Death Details: ${character.status?.deathDetails || 'Not Mentioned'}
Current Status: ${character.status?.currentStatus || 'Not Mentioned'}

===== PERSONALITY =====
Traits: ${character.personality?.traits?.join(', ') || character.traits?.personality?.join(', ') || 'Not Mentioned'}
Likes: ${character.personality?.likes?.join(', ') || 'Not Mentioned'}
Dislikes: ${character.personality?.dislikes?.join(', ') || 'Not Mentioned'}
Goals: ${character.personality?.goals || 'Not Mentioned'}
Fears: ${character.personality?.fears || 'Not Mentioned'}

===== ABILITIES & POWERS =====
Powers: ${character.abilities?.powers?.join(', ') || character.traits?.powers?.join(', ') || 'None Mentioned'}
Techniques: ${character.abilities?.techniques?.join(', ') || 'None Mentioned'}
Weapons: ${character.abilities?.weapons?.join(', ') || 'None Mentioned'}
Fighting Style: ${character.abilities?.fightingStyle || 'Not Mentioned'}
Special Abilities: ${character.abilities?.specialAbilities || 'Not Mentioned'}

===== RELATIONSHIPS =====
Family: ${character.relationships?.family || 'Not Mentioned'}
Friends: ${character.relationships?.friends?.join(', ') || 'None Mentioned'}
Rivals: ${character.relationships?.rivals?.join(', ') || 'None Mentioned'}
Mentors: ${character.relationships?.mentors?.join(', ') || 'None Mentioned'}
Students: ${character.relationships?.students?.join(', ') || 'None Mentioned'}
Master: ${character.relationships?.master || 'Not Mentioned'}
Groups: ${character.relationships?.affiliatedGroups?.join(', ') || character.traits?.affiliations?.join(', ') || 'None Mentioned'}

===== BACKGROUND =====
Origin: ${character.background?.origin || 'Not Mentioned'}
Backstory: ${character.background?.backstory || 'Not Mentioned'}
Key Events: ${character.background?.keyEvents?.join(', ') || character.traits?.keyEvents?.join(', ') || 'None Mentioned'}
Achievements: ${character.background?.achievements?.join(', ') || 'None Mentioned'}
Notable Fights: ${character.background?.notableFights?.join(', ') || 'None Mentioned'}

===== ATTRIBUTES =====
Main Character: ${character.attributes?.isMainCharacter ? 'Yes' : 'No'}
Villain: ${character.attributes?.isVillain ? 'Yes' : 'No'}
Hero: ${character.attributes?.isHero ? 'Yes' : 'No'}
Female: ${character.attributes?.isFemale ? 'Yes' : 'No'}
Child: ${character.attributes?.isChild ? 'Yes' : 'No'}
Elder: ${character.attributes?.isElder ? 'Yes' : 'No'}
Has Special Power: ${character.attributes?.hasSpecialPower ? 'Yes' : 'No'}
Has Weapon: ${character.attributes?.hasWeapon ? 'Yes' : 'No'}
Has Family: ${character.attributes?.hasFamily ? 'Yes' : 'No'}

===== FULL DESCRIPTION =====
${character.description || 'Not Mentioned'}

===== CRUCIAL HINT =====
${character.crucialHint || 'Not Mentioned'}

===== USER QUESTION =====
${sanitizedQuestion}

===== INSTRUCTIONS =====
1. Read the ENTIRE data above carefully
2. If the data has the answer → Reply "Yes" or "No"
3. If the data does NOT have the answer AT ALL → Reply "IDK"
4. If the question asks "Is it [name]?" or contains a character name → Reply "IDK"
5. Reply with ONLY one word: Yes, No, Maybe, or IDK
6. NEVER reveal the character's name`;

    const systemPrompt = `
You are a SECURITY-FIRST AI with ZERO tolerance for identity leaks. Your ONLY job is to answer ONE WORD: "Yes", "No", "Maybe", or "IDK".

===== YOUR BRAIN RULES =====

1. READ EVERYTHING - Check ALL fields. Check INSIDE brackets (). Check nested data. Check arrays. Check descriptions. If the answer is hidden ANYWHERE, find it.

2. BRACKETS ARE IMPORTANT - If data says "Human (Jinchuriki)" and user asks "Is he human?" → YES. If data says "Hair: Black (sometimes blonde)" and user asks "Is his hair blonde?" → YES because it's mentioned in brackets.

3. PARTIAL MATCH = YES - If ANY field mentions the topic, even once, even in brackets → YES. You don't need ALL fields to match. ONE match = YES.

4. MULTIPLE VALUES = YES FOR EACH - If data says "Hair: Black and Red" → "Is his hair black?" = YES. "Is his hair red?" = YES. "Is his hair blue?" = IDK (not mentioned).

5. SIBLING/RELATIONSHIP CONNECTION - If data says "Brother of Sasuke" and user asks "Is he related to Sasuke?" → YES. "Is he Sasuke?" → MAYBE (identity protection).

6. CONTEXT UNDERSTANDING - 
   - "Human (Jinchuriki)" → He is BOTH human AND jinchuriki
   - "Alive (but dying)" → Is he alive? YES. Is he dead? NO.
   - "Villain (turned hero)" → Is he villain? YES. Is he hero? YES. 
   - "Not a main character" → Is he main? NO.

===== YOUR RESPONSE RULES =====

YES → When ANY data matches the question
   - Direct match: "Human" → "Is he human?" = YES
   - Bracket match: "(Jinchuriki)" → "Is he jinchuriki?" = YES
   - Partial match: "Black and Red hair" → "Is his hair black?" = YES
   - Synonym match: "Ninja (Shinobi)" → "Is he a ninja?" = YES
   - Relationship: "Brother of X" → "Is he related to X?" = YES

NO → ONLY when data EXPLICITLY says the opposite
   - "Alive" → "Is he dead?" = NO
   - "Not a villain" → "Is he villain?" = NO
   - "Human" → "Is he a demon?" = NO (only if data says "not demon")

IDK → ONLY when topic is NOT mentioned ANYWHERE
   - Not in main text, not in brackets, not in nested fields
   - If data says "Unknown" → IDK for that topic
   - If question asks about something never mentioned → IDK

MAYBE → TWO situations ONLY:
   1. IDENTITY REVEAL QUESTIONS → "Is it Naruto?" = MAYBE
   2. NAME QUESTIONS → "Is his name Goku?" = MAYBE
   NEVER say Yes or No to name questions. ALWAYS Maybe.

===== IDENTITY PROTECTION (CRITICAL) =====

- ANY question with a name → ALWAYS "Maybe"
  Examples: "Is it Naruto?" "Is he Aizen?" "Is his name Goku?" "Is this character Luffy?" → ALL = Maybe

- ANY question trying to confirm identity → ALWAYS "Maybe"
  Examples: "Is this the main character?" "Is he the protagonist?" "Is he from Naruto?" → These are SAFE (answer normally). Only name-based questions get Maybe.

- PROTECT THE NAME AT ALL COSTS. Even if user says "Is it the guy who..." → read the description, answer the question, but NEVER say "Yes" to "Is it [name]?".

===== DEEP READING EXAMPLES =====

Data: "He is a Human (Jinchuriki) from Konoha. Has blonde hair and blue eyes."
Question: "Is he human?" → YES (matches Human)
Question: "Is he a jinchuriki?" → YES (matches bracket)
Question: "Is he from Konoha?" → YES (matches location)
Question: "Is his hair blonde?" → YES (matches hair)
Question: "Is his hair black?" → IDK (not mentioned)
Question: "Is it Naruto?" → MAYBE (identity protection)

Data: "He is a Shinobi (Ninja) and a member of Akatsuki"
Question: "Is he a ninja?" → YES (bracket match)
Question: "Is he in Akatsuki?" → YES (direct match)
Question: "Is he a samurai?" → IDK (not mentioned)
Question: "Is he a villain?" → IDK (not mentioned in data)

Data: "Human (Quincy) and Hollow"
Question: "Is he human?" → YES
Question: "Is he a Quincy?" → YES
Question: "Is he Hollow?" → YES
Question: "Is he a soul reaper?" → IDK (not mentioned)
Question: "Is he a soul?" → IDK (not mentioned)

Data: "Hair: Black (sometimes red in special form)"
Question: "Is his hair black?" → YES
Question: "Is his hair red?" → YES (mentioned in brackets)
Question: "Is his hair white?" → IDK (not mentioned)

===== FINAL REMINDERS =====

- If ANY part of data mentions the topic → YES
- If topic appears ANYWHERE (including brackets) → YES
- If topic has multiple values → YES for each mentioned value
- If topic has synonyms → YES (villain=antagonist=evil)
- If data has "Unknown" → IDK for that topic only
- If question asks name → ALWAYS MAYBE
- NEVER say the character's name. EVER.
- ONE WORD ONLY: Yes, No, Maybe, or IDK

YOU WILL BE TESTED. ANY MISTAKE = GAME OVER. THINK. READ EVERYTHING. PROTECT IDENTITY. ANSWER ACCURATELY.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context }
    ];

    let answer = "IDK";
    let usedProvider = 'none';

    try {
      const result = await askAI(messages);
      answer = result.answer || 'IDK';
      usedProvider = result.provider || 'none';
      console.log(`🤖 AI Raw Answer: "${answer}"`);
    } catch (error) {
      console.error('AI provider error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'AI service temporarily unavailable. Please try again.'
      });
    }

    // ✅ FORCE PARSE ANSWER
    let finalAnswer = 'IDK';
    const lowerAnswer = answer.toLowerCase().trim();

    // Check if this is an identity question
    const identityKeywords = ['is it', 'is he', 'is she', 'is this', 'are you', 'is that'];
    const isIdentityQuestion = identityKeywords.some(kw => lowerAnswer.includes(kw));

    if (isIdentityQuestion) {
      finalAnswer = 'IDK';
      console.log(`🔒 Identity question → "IDK"`);
    } else {
      // Check for Yes
      if (lowerAnswer === 'yes') {
        finalAnswer = 'Yes';
      } 
      // Check for No
      else if (lowerAnswer === 'no' || lowerAnswer.includes('not') || lowerAnswer.includes('isn\'t') || lowerAnswer.includes('doesn\'t')) {
        finalAnswer = 'No';
      } 
      // Check for Maybe
      else if (lowerAnswer === 'maybe') {
        finalAnswer = 'Maybe';
      } 
      // Check for IDK
      else if (lowerAnswer === 'idk' || lowerAnswer.includes('dont know') || lowerAnswer.includes("don't know") || lowerAnswer.includes('not sure') || lowerAnswer.includes('unknown')) {
        finalAnswer = 'IDK';
      } 
      // Default to IDK
      else {
        finalAnswer = 'IDK';
      }
    }

    console.log(`📝 Final answer: "${finalAnswer}" (from: "${answer}")`);

    game.questions.push({ 
      question: sanitizedQuestion, 
      answer: finalAnswer, 
      confidence: 1.0 
    });
    game.totalQuestions += 1;
    await game.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalQuestions': 1 }
    });

    res.json({
      success: true,
      answer: finalAnswer,
      questionCount: game.totalQuestions,
      maxQuestions: 10,
      provider: usedProvider
    });

  } catch (error) {
    console.error('Question error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error processing question. Please try again.'
    });
  }
});

// ============================================================
// USE HINT
// ============================================================
router.post('/hint', validateGameId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId } = req.body;

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const user = await User.findById(req.user._id);

    if (game.hintUsed) {
      return res.status(400).json({
        success: false,
        message: 'Hint already used for this game!'
      });
    }

    if (user.shards < 50) {
      return res.status(400).json({
        success: false,
        message: `Not enough Character Shards! You have ${user.shards}, need 50.`,
        shards: user.shards
      });
    }

    user.shards -= 50;
    game.hintUsed = true;

    await user.save();
    await game.save();

    const hint = game.character.crucialHint || 'No hint available for this character.';

    console.log(`💡 Hint used: ${gameId} by ${user.username}`);

    res.json({
      success: true,
      hint: hint,
      shards: user.shards,
      message: '💡 Hint used! -50 Shards'
    });

  } catch (error) {
    console.error('Hint error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error using hint. Please try again.'
    });
  }
});

// ============================================================
// MAKE GUESS
// ============================================================
router.post('/guess', [...validateGameId, ...validateGuess], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId, guess } = req.body;
    const sanitizedGuess = sanitizeInput(guess);

    console.log(`🔍 Guess attempt: gameId=${gameId}`);

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      console.log('❌ Game not found:', gameId);
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      console.log('❌ Game is not active:', game.status);
      return res.status(400).json({
        success: false,
        message: 'Game is not active. Start a new game.'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized for this game');
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const wrongGuesses = game.guesses ? game.guesses.filter(g => !g.isCorrect) : [];
    if (wrongGuesses.length >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Game already ended. Start a new game.'
      });
    }

    const normalizedGuess = normalize(sanitizedGuess);
    const normalizedCharName = normalize(game.character.name);

    let isCorrect = normalizedGuess === normalizedCharName;

    if (!isCorrect) {
      const guessWords = normalizedGuess.split(' ');
      const charWords = normalizedCharName.split(' ');
      const allWordsMatch = guessWords.every(word => charWords.includes(word));
      if (allWordsMatch && guessWords.length > 0) {
        isCorrect = true;
      }
    }

    if (!isCorrect && normalizedCharName.includes(normalizedGuess) && normalizedGuess.length >= 3) {
      isCorrect = true;
    }

    game.guesses.push({ guess: sanitizedGuess, isCorrect });

    if (isCorrect) {
      game.status = 'won';
      game.endedAt = new Date();
      game.totalQuestions = game.questions.length;
      await game.save();

      const user = await User.findById(req.user._id);
      
      user.stats.gamesPlayed += 1;
      user.stats.gamesWon += 1;
      user.stats.winStreak += 1;
      user.totalGuesses += 1;

      const currentSeason = getCurrentSeason();
      
      if (!user.seasonStats) {
        user.seasonStats = {
          currentSeason: currentSeason,
          seasonWins: 0,
          seasonPlayed: 0,
          seasonStreak: 0
        };
      }
      
      user.seasonStats.currentSeason = currentSeason;
      user.seasonStats.seasonWins += 1;
      user.seasonStats.seasonPlayed += 1;
      user.seasonStats.seasonStreak += 1;

      const anime = game.character.anime;
      const currentAnimeGuesses = user.animeGuesses?.get(anime) || 0;
      user.animeGuesses.set(anime, currentAnimeGuesses + 1);

      user.shards += 10;

      const character = game.character;
      const cardAdded = user.addCard(character);
      
      if (cardAdded) {
        console.log(`🃏 Card added to ${user.username}'s collection: ${character.name} (Power: ${character.powerLevel})`);
      } else {
        console.log(`ℹ️ Card already in collection: ${character.name}`);
      }

      const isFirstWin = user.stats.gamesWon === 1;

      if (user.referredBy && isFirstWin) {
        const referral = await Referral.findOne({
          referredUser: user._id,
          status: { $ne: 'completed' }
        });

        if (referral && !referral.referrerRewards.firstWin) {
          const referrer = await User.findById(referral.referrer);
          
          if (referrer) {
            referrer.shards += 50;
            referrer.referralStats.shardsEarned = (referrer.referralStats?.shardsEarned || 0) + 50;
            referrer.referralStats.completedReferrals = (referrer.referralStats?.completedReferrals || 0) + 1;
            await referrer.save();

            user.shards += 50;

            referral.referrerRewards.firstWin = true;
            referral.referredUserRewards.welcomeBonus = true;
            referral.status = 'completed';
            referral.firstWinAt = new Date();
            referral.completedAt = new Date();
            await referral.save();

            console.log(`🎉 Referral reward: ${referrer.username} and ${user.username} both got 50 Shards!`);
          }
        }
      }

      const unlockedAchievements = await checkAndUnlockAchievements(user._id);
      const photoUnlock = await unlockProfilePhoto(user._id, game.character._id);

      let allUnlocked = [];
      if (photoUnlock) allUnlocked.push(photoUnlock);
      if (unlockedAchievements.length > 0) allUnlocked = allUnlocked.concat(unlockedAchievements);

      await user.save();

      console.log(`🏆 ${user.username} won! Season stats:`, {
        wins: user.seasonStats.seasonWins,
        streak: user.seasonStats.seasonStreak,
        played: user.seasonStats.seasonPlayed,
        season: user.seasonStats.currentSeason
      });

      return res.json({
        success: true,
        isCorrect: true,
        character: game.character.name,
        anime: game.character.anime,
        image: game.character.image || '',
        powerLevel: game.character.powerLevel || 25,
        message: `🎉 Correct! It was ${game.character.name}!`,
        questionsUsed: game.totalQuestions,
        unlockedItems: allUnlocked,
        shards: user.shards,
        cardAdded: cardAdded,
        cardCount: user.cards.length
      });

    } else {
      const newWrongGuesses = game.guesses.filter(g => !g.isCorrect);
      
      if (newWrongGuesses.length >= 3) {
        game.status = 'lost';
        game.endedAt = new Date();
        game.totalQuestions = game.questions.length;
        await game.save();

        const currentSeason = getCurrentSeason();
        
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { 
            'stats.gamesPlayed': 1,
            'seasonStats.seasonPlayed': 1
          },
          $set: { 
            'stats.winStreak': 0,
            'seasonStats.seasonStreak': 0,
            'seasonStats.currentSeason': currentSeason
          }
        });

        console.log(`❌ ${req.user.username} lost! Character: ${game.character.name}`);

        return res.json({
          success: true,
          isCorrect: false,
          gameOver: true,
          character: game.character.name,
          anime: game.character.anime,
          image: game.character.image || '',
          powerLevel: game.character.powerLevel || 25,
          message: `❌ Game over! The character was ${game.character.name}.`
        });
      } else {
        await game.save();
        return res.json({
          success: true,
          isCorrect: false,
          message: `❌ Not ${sanitizedGuess}. Try again! (${3 - newWrongGuesses.length} guesses left)`,
          remainingGuesses: 3 - newWrongGuesses.length
        });
      }
    }

  } catch (error) {
    console.error('Guess error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error processing guess. Please try again.'
    });
  }
});

// ============================================================
// GIVE UP
// ============================================================
router.post('/giveup', validateGameId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => e.msg)
      });
    }

    const { gameId } = req.body;

    console.log(`🏳️ Giveup request: ${gameId} by ${req.user.username}`);

    const game = await GameSession.findById(gameId).populate('character');

    if (!game) {
      console.log('❌ Game not found:', gameId);
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      console.log('❌ Game not active:', game.status);
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    if (game.user.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized');
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    game.status = 'abandoned';
    game.endedAt = new Date();
    game.totalQuestions = game.questions.length;
    await game.save();

    const currentSeason = getCurrentSeason();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        'stats.gamesPlayed': 1,
        'seasonStats.seasonPlayed': 1
      },
      $set: { 
        'stats.winStreak': 0,
        'seasonStats.seasonStreak': 0,
        'seasonStats.currentSeason': currentSeason
      }
    });

    return res.json({
      success: true,
      character: game.character.name,
      anime: game.character.anime,
      image: game.character.image || '',
      powerLevel: game.character.powerLevel || 25,
      message: `You gave up! The character was ${game.character.name} from ${game.character.anime}.`
    });

  } catch (error) {
    console.error('Give up error:', {
      message: error.message,
      userId: req.user?._id,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error giving up. Please try again.'
    });
  }
});

// ============================================================
// GET HISTORY
// ============================================================
router.get('/history', async (req, res) => {
  try {
    const games = await GameSession.find({ user: req.user._id })
      .populate('character', 'name anime image powerLevel')
      .sort({ startedAt: -1 })
      .limit(20);

    const sanitizedGames = games.map(game => ({
      id: game._id,
      character: game.character?.name || 'Unknown',
      anime: game.character?.anime || 'Unknown',
      powerLevel: game.character?.powerLevel || 25,
      status: game.status,
      questions: game.totalQuestions || game.questions.length,
      startedAt: game.startedAt,
      endedAt: game.endedAt
    }));

    res.json({
      success: true,
      games: sanitizedGames
    });
  } catch (error) {
    console.error('History error:', {
      message: error.message,
      userId: req.user?._id
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching history. Please try again.'
    });
  }
});

module.exports = router;
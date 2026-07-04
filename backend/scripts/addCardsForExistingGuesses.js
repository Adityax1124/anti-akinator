const mongoose = require('mongoose');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const Character = require('../models/Character');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anti-akinator';

async function addCardsForExistingGuesses() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('🔄 Connected to MongoDB');
    console.log('🔄 Adding cards for existing guesses...\n');
    
    const users = await User.find();
    console.log(`👥 Found ${users.length} users\n`);
    
    let totalCardsAdded = 0;
    let totalUsersWithCards = 0;
    let totalCardsSkipped = 0;
    let errorCount = 0;
    
    for (const user of users) {
      console.log(`📊 Processing: ${user.username}`);
      
      const wonGames = await GameSession.find({
        user: user._id,
        status: 'won'
      }).populate('character');
      
      console.log(`  🎮 Won games: ${wonGames.length}`);
      
      let cardsAdded = 0;
      let cardsSkipped = 0;
      
      for (const game of wonGames) {
        const character = game.character;
        if (!character) {
          console.log(`  ⚠️ Character not found for game ${game._id}`);
          errorCount++;
          continue;
        }
        
        // ✅ Get actual power - NO FALLBACK TO 25
        const actualPower = character.powerLevel;
        if (!actualPower) {
          console.log(`  ⚠️ ${character.name} has no powerLevel! Skipping...`);
          errorCount++;
          continue;
        }
        
        const basePower = character.basePower || actualPower;
        
        // Check if card already exists
        const alreadyHas = user.cards.some(c => 
          c.characterId && c.characterId.toString() === character._id.toString()
        );
        
        if (!alreadyHas) {
          user.cards.push({
            characterId: character._id,
            characterName: character.name,
            basePower: basePower,
            currentPower: basePower, // Start with base power at Level 1
            level: 1,
            element: character.element || 'Fire',
            rarity: character.rarity || 'Common',
            image: character.image || '',
            unlockedAt: game.endedAt || new Date(),
            stolenFrom: null,
            stolenAt: null
          });
          cardsAdded++;
          
          console.log(`    ✅ Added: ${character.name} → Power: ${basePower} (Level 1)`);
        } else {
          cardsSkipped++;
        }
      }
      
      if (cardsAdded > 0) {
        await user.save();
        console.log(`  ✅ Added ${cardsAdded} cards to ${user.username}`);
        totalCardsAdded += cardsAdded;
        totalUsersWithCards++;
      } else {
        console.log(`  ℹ️ No new cards to add for ${user.username}`);
      }
      totalCardsSkipped += cardsSkipped;
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`👥 Users processed: ${users.length}`);
    console.log(`👤 Users with new cards: ${totalUsersWithCards}`);
    console.log(`🃏 Cards added: ${totalCardsAdded}`);
    console.log(`⏭️ Cards skipped: ${totalCardsSkipped}`);
    if (errorCount > 0) console.log(`⚠️ Errors/Warnings: ${errorCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Done!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addCardsForExistingGuesses();
const mongoose = require('mongoose');
const User = require('../models/User');
const Character = require('../models/Character');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anti-akinator';

async function fixCardPowers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('🔄 Connected to MongoDB');
    console.log('🔄 Fixing card powers...\n');
    
    const users = await User.find();
    console.log(`👥 Found ${users.length} users\n`);
    
    let totalUpdated = 0;
    let totalCards = 0;
    let errorCount = 0;
    
    for (const user of users) {
      console.log(`📊 Processing: ${user.username}`);
      let userUpdated = 0;
      
      for (const card of user.cards) {
        totalCards++;
        
        // Find the character to get real power
        const character = await Character.findById(card.characterId);
        if (!character) {
          console.log(`  ⚠️ Character not found: ${card.characterName}`);
          errorCount++;
          continue;
        }
        
        // ✅ Get actual power from character - NO FALLBACK TO 25
        const actualPower = character.powerLevel;
        const basePower = character.basePower || actualPower;
        const element = character.element || 'Fire';
        const rarity = character.rarity || 'Common';
        
        // ✅ Skip if character has no powerLevel (shouldn't happen)
        if (!actualPower) {
          console.log(`  ⚠️ ${card.characterName} has no powerLevel! Skipping...`);
          errorCount++;
          continue;
        }
        
        // Check if card needs update
        const needsUpdate = 
          card.basePower !== basePower ||
          card.currentPower !== basePower ||
          card.element !== element ||
          card.rarity !== rarity ||
          !card.level;
        
        if (needsUpdate) {
          card.basePower = basePower;
          card.currentPower = basePower;
          card.element = element;
          card.rarity = rarity;
          if (!card.level) card.level = 1;
          
          userUpdated++;
          console.log(`    ✅ Updated: ${card.characterName} → Power: ${basePower} (Level 1)`);
        }
      }
      
      if (userUpdated > 0) {
        await user.save();
        console.log(`  ✅ Updated ${userUpdated} cards for ${user.username}`);
        totalUpdated += userUpdated;
      } else {
        console.log(`  ℹ️ No updates needed for ${user.username}`);
      }
      console.log('');
    }
    
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`👥 Users processed: ${users.length}`);
    console.log(`🃏 Total cards checked: ${totalCards}`);
    console.log(`✅ Cards updated: ${totalUpdated}`);
    if (errorCount > 0) console.log(`⚠️ Errors/Warnings: ${errorCount}`);
    console.log('='.repeat(60));
    console.log('\n✅ Done!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    process.exit(1);
  }
}

fixCardPowers();
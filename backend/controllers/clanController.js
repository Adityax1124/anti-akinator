const Clan = require('../models/Clan');
const ClanMember = require('../models/ClanMember');
const ClanMessage = require('../models/ClanMessage');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create Clan
exports.createClan = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user already in a clan
    const existingMember = await ClanMember.findOne({ userId });
    if (existingMember) {
      return res.status(400).json({ message: 'You are already in a clan' });
    }

    // Check if clan name exists
    const existingClan = await Clan.findOne({ name });
    if (existingClan) {
      return res.status(400).json({ message: 'Clan name already exists' });
    }

    // Check if user has enough shards (200)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.shards < 200) {
      return res.status(400).json({ message: 'Not enough shards. Need 200 shards to create a clan' });
    }

    // Deduct shards
    user.shards -= 200;
    await user.save();

    // Create clan
    const clan = new Clan({
      name,
      description,
      ownerId: userId
    });
    await clan.save();

    // Add user as clan member (leader)
    const clanMember = new ClanMember({
      clanId: clan._id,
      userId: userId,
      role: 'leader'
    });
    await clanMember.save();

    // Update user's clanId
    user.clanId = clan._id;
    await user.save();

    res.status(201).json({
      message: 'Clan created successfully',
      clan: {
        id: clan._id,
        name: clan.name,
        description: clan.description
      }
    });
  } catch (error) {
    console.error('Create clan error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Join Clan
exports.joinClan = async (req, res) => {
  try {
    const { clanId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user already in a clan
    const existingMember = await ClanMember.findOne({ userId });
    if (existingMember) {
      return res.status(400).json({ message: 'You are already in a clan' });
    }

    // Check if clan exists
    const clan = await Clan.findById(clanId);
    if (!clan) {
      return res.status(404).json({ message: 'Clan not found' });
    }

    // Check if clan is full
    const memberCount = await ClanMember.countDocuments({ clanId });
    if (memberCount >= clan.maxMembers) {
      return res.status(400).json({ message: 'Clan is full (max 20 members)' });
    }

    // Add user to clan
    const clanMember = new ClanMember({
      clanId: clan._id,
      userId: userId,
      role: 'member'
    });
    await clanMember.save();

    // Update total members in clan
    clan.totalMembers = memberCount + 1;
    await clan.save();

    // Update user's clanId
    const user = await User.findById(userId);
    if (user) {
      user.clanId = clan._id;
      await user.save();
    }

    res.status(200).json({
      message: 'Joined clan successfully',
      clan: {
        id: clan._id,
        name: clan.name,
        description: clan.description
      }
    });
  } catch (error) {
    console.error('Join clan error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Leave Clan
exports.leaveClan = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { clanId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user is in clan
    const clanMember = await ClanMember.findOne({ userId, clanId });
    if (!clanMember) {
      return res.status(400).json({ message: 'You are not in this clan' });
    }

    // Check if user is leader
    if (clanMember.role === 'leader') {
      const memberCount = await ClanMember.countDocuments({ clanId });
      if (memberCount > 1) {
        return res.status(400).json({ 
          message: 'You must transfer leadership or disband clan first' 
        });
      }
      // If only member, delete clan
      await Clan.findByIdAndDelete(clanId);
      await ClanMember.deleteMany({ clanId });
      await ClanMessage.deleteMany({ clanId });
      
      // Update user's clanId
      const user = await User.findById(userId);
      if (user) {
        user.clanId = null;
        await user.save();
      }
      
      return res.status(200).json({ message: 'Clan disbanded successfully' });
    }

    // Remove user from clan
    await ClanMember.findByIdAndDelete(clanMember._id);

    // Update total members
    const clan = await Clan.findById(clanId);
    if (clan) {
      clan.totalMembers -= 1;
      await clan.save();
    }

    // Update user's clanId
    const user = await User.findById(userId);
    if (user) {
      user.clanId = null;
      await user.save();
    }

    res.status(200).json({ message: 'Left clan successfully' });
  } catch (error) {
    console.error('Leave clan error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Get All Clans (for joining)
exports.getAllClans = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user already in a clan
    const userClan = await ClanMember.findOne({ userId });
    if (userClan) {
      return res.status(400).json({ message: 'You are already in a clan' });
    }

    const clans = await Clan.aggregate([
      {
        $lookup: {
          from: 'clanmembers',
          localField: '_id',
          foreignField: 'clanId',
          as: 'members'
        }
      },
      {
        $addFields: {
          memberCount: { $size: '$members' }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          memberCount: 1,
          maxMembers: 1,
          ownerId: 1
        }
      },
      {
        $sort: { memberCount: -1 }
      }
    ]);

    res.status(200).json({ clans });
  } catch (error) {
    console.error('Get clans error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Get My Clan
exports.getMyClan = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User not authenticated' 
      });
    }

    const clanMember = await ClanMember.findOne({ userId });
    if (!clanMember) {
      return res.status(404).json({ 
        success: false,
        message: 'You are not in a clan' 
      });
    }

    const clan = await Clan.findById(clanMember.clanId);
    if (!clan) {
      return res.status(404).json({ 
        success: false,
        message: 'Clan not found' 
      });
    }

    const members = await ClanMember.find({ clanId: clan._id })
      .populate('userId', 'username shards gems')
      .lean();

    // ✅ FIX: Filter out null userIds
    const memberList = members
      .filter(m => m.userId !== null)
      .map(m => ({
        id: m.userId._id,
        username: m.userId.username || 'Unknown',
        role: m.role,
        gemsDonated: m.diamondsDonated || 0,
        gemsRequested: m.diamondsRequested || 0
      }));

    const memberCount = memberList.length;

    res.status(200).json({
      success: true,
      clan: {
        id: clan._id,
        name: clan.name,
        description: clan.description,
        ownerId: clan.ownerId,
        totalMembers: memberCount,
        maxMembers: clan.maxMembers
      },
      members: memberList,
      userRole: clanMember.role
    });
  } catch (error) {
    console.error('Get my clan error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message 
    });
  }
};

// Get Clan Members
exports.getClanMembers = async (req, res) => {
  try {
    const { clanId } = req.params;

    const members = await ClanMember.find({ clanId })
      .populate('userId', 'username shards gems')
      .lean();

    // ✅ FIX: Filter out null userIds
    const memberList = members
      .filter(m => m.userId !== null)
      .map(m => ({
        id: m.userId._id,
        username: m.userId.username || 'Unknown',
        role: m.role,
        gemsDonated: m.diamondsDonated || 0,
        gemsRequested: m.diamondsRequested || 0
      }));

    res.status(200).json({ 
      success: true,
      members: memberList 
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message 
    });
  }
};

// Get Chat Messages
exports.getChatMessages = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await ClanMessage.find({ clanId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Send Chat Message
exports.sendChatMessage = async (req, res) => {
  try {
    const { clanId } = req.params;
    const { message } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user is in clan
    const clanMember = await ClanMember.findOne({ userId, clanId });
    if (!clanMember) {
      return res.status(400).json({ message: 'You are not in this clan' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newMessage = new ClanMessage({
      clanId,
      userId,
      username: user.username,
      message,
      type: 'chat'
    });
    await newMessage.save();

    res.status(201).json({ 
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Donate GEMS ONLY - 1 Gem = 2 Shards, No Self Donation
exports.donateDiamonds = async (req, res) => {
  try {
    const { clanId, amount, targetUserId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (amount < 1) {
      return res.status(400).json({ message: 'Amount must be at least 1 gem' });
    }

    // Prevent donating to yourself
    const userIdStr = userId.toString();
    const targetUserIdStr = targetUserId.toString();
    
    if (targetUserIdStr === userIdStr) {
      return res.status(400).json({ 
        message: '❌ You cannot donate to yourself! Please select another clan member.' 
      });
    }

    // Check if donor is in clan
    const donorMember = await ClanMember.findOne({ userId, clanId });
    if (!donorMember) {
      return res.status(400).json({ message: 'You are not in this clan' });
    }

    // Check if target is in clan
    const targetMember = await ClanMember.findOne({ userId: targetUserId, clanId });
    if (!targetMember) {
      return res.status(400).json({ message: 'Target user is not in this clan' });
    }

    // Get donor user
    const donor = await User.findById(userId);
    if (!donor) {
      return res.status(404).json({ message: 'Donor not found' });
    }

    // 1 Gem = 2 Shards conversion rate
    const GEM_TO_SHARD_RATE = 2;
    const shardCost = amount * GEM_TO_SHARD_RATE;

    // Check if donor has enough shards to pay for gems
    if (donor.shards < shardCost) {
      return res.status(400).json({ 
        message: `Not enough shards. You have ${donor.shards} shards, need ${shardCost} shards for ${amount} gems (1 gem = 2 shards)` 
      });
    }

    // Get target user
    const target = await User.findById(targetUserId);
    if (!target) {
      return res.status(404).json({ message: 'Target not found' });
    }

    // DEDUCT shards from donor (payment for gems)
    donor.shards -= shardCost;
    await donor.save();
    console.log(`💰 Deducted ${shardCost} shards from ${donor.username} for ${amount} gems. Remaining shards: ${donor.shards}`);

    // ADD gems to target (NOT shards!)
    target.gems += amount;
    await target.save();
    console.log(`💎 Added ${amount} gems to ${target.username}. New gems total: ${target.gems}`);

    // Update clan member stats
    donorMember.diamondsDonated += amount;
    await donorMember.save();

    targetMember.diamondsRequested += amount;
    await targetMember.save();

    // Log donation in chat
    const donationMessage = new ClanMessage({
      clanId,
      userId: donor._id,
      username: donor.username,
      message: `🎁 Donated ${amount} 💎 gems to ${target.username} (Cost: ${shardCost} shards)`,
      type: 'donation',
      diamondAmount: amount
    });
    await donationMessage.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`clan_${clanId}`).emit('clan-donation', {
        from: donor.username,
        to: target.username,
        gems: amount,
        shardCost: shardCost,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({ 
      message: 'Gems donated successfully!',
      donatedGems: amount,
      shardCost: shardCost,
      donorRemainingShards: donor.shards,
      targetNewGems: target.gems
    });
  } catch (error) {
    console.error('Donate error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Request Gems
exports.requestDiamonds = async (req, res) => {
  try {
    const { clanId, amount } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (amount < 1) {
      return res.status(400).json({ message: 'Amount must be at least 1 gem' });
    }

    // Check if user is in clan
    const clanMember = await ClanMember.findOne({ userId, clanId });
    if (!clanMember) {
      return res.status(400).json({ message: 'You are not in this clan' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create request message
    const requestMessage = new ClanMessage({
      clanId,
      userId: user._id,
      username: user.username,
      message: `📢 Requesting ${amount} 💎 gems (Costs ${amount * 2} shards to donate)`,
      type: 'request',
      diamondAmount: amount
    });
    await requestMessage.save();

    clanMember.diamondsRequested += amount;
    await clanMember.save();

    res.status(200).json({ 
      message: 'Gem request sent',
      requestAmount: amount
    });
  } catch (error) {
    console.error('Request error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Transfer Clan Leadership
exports.transferLeadership = async (req, res) => {
  try {
    const { clanId, newLeaderId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user is leader
    const currentLeader = await ClanMember.findOne({ userId, clanId, role: 'leader' });
    if (!currentLeader) {
      return res.status(400).json({ message: 'Only the clan leader can transfer leadership' });
    }

    // Check if new leader is in clan
    const newLeader = await ClanMember.findOne({ userId: newLeaderId, clanId });
    if (!newLeader) {
      return res.status(400).json({ message: 'New leader is not in the clan' });
    }

    // Update roles
    currentLeader.role = 'member';
    await currentLeader.save();

    newLeader.role = 'leader';
    await newLeader.save();

    // Update clan owner
    await Clan.findByIdAndUpdate(clanId, { ownerId: newLeaderId });

    res.status(200).json({ message: 'Leadership transferred successfully' });
  } catch (error) {
    console.error('Transfer leadership error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// ✅ KICK MEMBER FROM CLAN (Leader only)
exports.kickMember = async (req, res) => {
  try {
    const { clanId, memberId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if user is leader
    const leader = await ClanMember.findOne({ userId, clanId, role: 'leader' });
    if (!leader) {
      return res.status(403).json({ message: 'Only the clan leader can kick members' });
    }

    // Check if member exists in clan
    const member = await ClanMember.findOne({ userId: memberId, clanId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found in this clan' });
    }

    // Prevent kicking yourself
    if (memberId.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot kick yourself' });
    }

    // Prevent kicking other leaders (if co-leaders exist)
    if (member.role === 'leader') {
      return res.status(400).json({ message: 'Cannot kick the clan leader' });
    }

    // Get clan name before removing
    const clan = await Clan.findById(clanId);
    const clanName = clan ? clan.name : 'Unknown Clan';

    // Remove member from clan
    await ClanMember.findByIdAndDelete(member._id);

    // Update total members in clan
    if (clan) {
      clan.totalMembers -= 1;
      await clan.save();
    }

    // Update user's clanId to null
    const user = await User.findById(memberId);
    if (user) {
      user.clanId = null;
      await user.save();
    }

    // Send notification to kicked user
    await Notification.createNotification({
      userId: memberId,
      type: 'system',
      title: '⚠️ You were kicked from the clan!',
      message: `You have been kicked from ${clanName} by the leader.`,
      icon: '🚫',
      color: 'red',
      priority: 'high'
    });

    // Log in clan chat
    const kickMessage = new ClanMessage({
      clanId,
      userId: userId,
      username: leader.username || 'Leader',
      message: `🚫 Kicked ${user ? user.username : 'member'} from the clan.`,
      type: 'system'
    });
    await kickMessage.save();

    res.status(200).json({
      success: true,
      message: 'Member kicked successfully'
    });

  } catch (error) {
    console.error('Kick member error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};
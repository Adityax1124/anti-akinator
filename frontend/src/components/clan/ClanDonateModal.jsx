import React, { useState } from 'react';
import axios from '../../api/axios';
import './ClanDonateModal.css';

const ClanDonateModal = ({ clanId, members, onClose, onDonate }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser?._id || currentUser?.id;

  // Filter out current user from members list
  const availableMembers = members.filter(m => m.id !== currentUserId);

  // Calculate shard cost (1 gem = 2 shards)
  const GEM_TO_SHARD_RATE = 2;
  const shardCost = amount * GEM_TO_SHARD_RATE;
  const hasEnoughShards = (currentUser?.shards || 0) >= shardCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/clan/donate', {
        clanId,
        targetUserId: selectedUser,
        amount: parseInt(amount)
      });
      
      console.log('✅ Gem donation successful:', response.data);
      onDonate();
      onClose();
    } catch (err) {
      console.error('❌ Donation error:', err);
      setError(err.response?.data?.message || 'Failed to donate gems');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donate-modal-overlay">
      <div className="donate-modal">
        <button className="donate-modal-close" onClick={onClose}>✕</button>
        <h3>💎 Donate Gems</h3>
        <p className="donate-subtitle">Send gems to your clan members!</p>
        
        {availableMembers.length === 0 ? (
          <div className="no-members-message">
            <p>No other members in your clan to donate to.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Member</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                required
              >
                <option value="">Choose a member...</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username} {member.role === 'leader' ? '👑' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Amount of Gems to Donate</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
              <div className="cost-breakdown">
                <span className="hint-text">
                  💰 Cost: {shardCost} shards (1 gem = {GEM_TO_SHARD_RATE} shards)
                </span>
                <span className="hint-text">
                  💎 You have {currentUser?.shards || 0} shards available
                </span>
                <span className="hint-text">
                  🎁 Recipient gets: {amount} gems added to their account
                </span>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="donate-btn" 
              disabled={loading || !selectedUser || !hasEnoughShards}
            >
              {loading ? 'Donating...' : `Donate ${amount} 💎 Gems`}
            </button>

            {!hasEnoughShards && (
              <div className="insufficient-funds">
                ⚠️ Insufficient shards! Need {shardCost} shards, have {currentUser?.shards || 0}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ClanDonateModal;
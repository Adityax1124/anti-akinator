import React, { useState } from 'react';
import axios from '../../api/axios';
import './ClanDonateModal.css';

const ClanDonateModal = ({ clanId, members, onClose, onDonate }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/clan/donate', {
        clanId,
        targetUserId: selectedUser,
        amount: parseInt(amount)
      });
      onDonate();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to donate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donate-modal-overlay">
      <div className="donate-modal">
        <div className="donate-modal-aurora"></div>
        <button className="donate-modal-close" onClick={onClose}>✕</button>
        <h3>💎 Donate Diamonds</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Member</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              required
            >
              <option value="">Choose a member...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.username}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="donate-btn" disabled={loading}>
            {loading ? 'Donating...' : `Donate ${amount} 💎`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClanDonateModal;
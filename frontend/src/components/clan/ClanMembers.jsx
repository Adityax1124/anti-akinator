import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import './ClanMembers.css';

const ClanMembers = ({ clanId, userRole, onLeave }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [clanId]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`/clan/members/${clanId}`);
      setMembers(response.data.members);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await axios.post('/clan/leave', { clanId });
      onLeave();
    } catch (error) {
      console.error('Failed to leave clan:', error);
      alert(error.response?.data?.message || 'Failed to leave clan');
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      leader: '👑 Leader',
      'co-leader': '⭐ Co-Leader',
      elder: '🔱 Elder',
      member: '👤 Member'
    };
    return badges[role] || '👤 Member';
  };

  if (loading) {
    return (
      <div className="clan-members-loading">
        <div className="loader"></div>
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="clan-members">
      <div className="members-header">
        <h3>👥 Clan Members</h3>
        <span className="member-count">{members.length}/20</span>
      </div>

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              <span className="member-username">{member.username}</span>
              <span className="member-role">{getRoleBadge(member.role)}</span>
            </div>
            <div className="member-stats">
              <span className="donation-stats">
                💎 Donated: {member.diamondsDonated || 0}
              </span>
              <span className="request-stats">
                📥 Received: {member.diamondsRequested || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="members-actions">
        <button
          className="leave-clan-btn"
          onClick={() => setShowLeaveConfirm(true)}
        >
          Leave Clan
        </button>
      </div>

      {showLeaveConfirm && (
        <div className="leave-confirm-overlay">
          <div className="leave-confirm-modal">
            <h4>Leave Clan?</h4>
            <p>Are you sure you want to leave this clan?</p>
            <p className="warning-text">
              {userRole === 'leader'
                ? '⚠️ You are the leader! Leaving will disband the clan.'
                : 'You can join another clan after leaving.'}
            </p>
            <div className="confirm-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
              >
                Cancel
              </button>
              <button
                className="confirm-leave-btn"
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? 'Leaving...' : 'Yes, Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClanMembers;
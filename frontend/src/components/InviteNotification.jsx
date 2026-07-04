import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './InviteNotification.css';

const InviteNotification = ({ invite, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!invite) return null;

  const handleAccept = async () => {
    setLoading(true);
    try {
      // ✅ CHECK IF IT'S A MATCH INVITE OR TEAM INVITE
      if (invite.type === 'match') {
        // ✅ MATCH INVITE
        const response = await api.post('/match/accept-invite', {
          matchCode: invite.matchCode
        });
        if (response.data.success) {
          onClose();
          navigate(`/match/battle/${invite.matchCode}`);
        }
      } else {
        // ✅ TEAM INVITE (Existing)
        const response = await api.post('/team/accept-invite', {
          roomCode: invite.roomCode
        });
        if (response.data.success) {
          onClose();
          navigate(`/team-game/${invite.roomCode}`);
        }
      }
    } catch (error) {
      console.error('Accept invite error:', error);
      alert(error.response?.data?.message || 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      if (invite.type === 'match') {
        await api.post('/match/decline-invite', {
          matchCode: invite.matchCode
        });
      } else {
        await api.post('/team/decline-invite', {
          roomCode: invite.roomCode
        });
      }
      onClose();
    } catch (error) {
      console.error('Decline invite error:', error);
      onClose();
    }
  };

  // ✅ Determine display details based on invite type
  const getDisplayDetails = () => {
    if (invite.type === 'match') {
      return {
        title: 'Battle Invite!',
        code: invite.matchCode,
        players: '1/2',
        type: '⚔️ Battle'
      };
    } else {
      return {
        title: 'Team Invite!',
        code: invite.roomCode,
        players: `${invite.room?.players || 1}/${invite.room?.maxPlayers || 4}`,
        type: '🤝 Team'
      };
    }
  };

  const details = getDisplayDetails();

  return (
    <div className="invite-notification slide-in">
      <div className="invite-content">
        <div className="invite-icon">
          {invite.type === 'match' ? '⚔️' : '📨'}
        </div>
        <div className="invite-text">
          <strong>{invite.from?.username || 'Someone'}</strong> invited you to a {details.type}!
          <span className="invite-details">
            {details.type}: {details.code} • 👥 {details.players} players
          </span>
        </div>
      </div>
      <div className="invite-actions">
        <button 
          className="invite-btn accept"
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? 'Joining...' : 'Accept'}
        </button>
        <button 
          className="invite-btn decline"
          onClick={handleDecline}
          disabled={loading}
        >
          Decline
        </button>
      </div>
      <button className="invite-close" onClick={onClose}>✕</button>
    </div>
  );
};

export default InviteNotification;
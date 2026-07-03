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
      const response = await api.post('/team/accept-invite', {
        roomCode: invite.roomCode
      });
      
      if (response.data.success) {
        onClose();
        // ✅ Navigate to team game page which will show the lobby first
        navigate(`/team-game/${invite.roomCode}`);
      }
    } catch (error) {
      console.error('Accept invite error:', error);
      alert(error.response?.data?.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      await api.post('/team/decline-invite', {
        roomCode: invite.roomCode
      });
      onClose();
    } catch (error) {
      console.error('Decline invite error:', error);
      onClose();
    }
  };

  return (
    <div className="invite-notification slide-in">
      <div className="invite-content">
        <div className="invite-icon">📨</div>
        <div className="invite-text">
          <strong>{invite.from?.username || 'Someone'}</strong> invited you to join their team!
          <span className="invite-details">
            Room: {invite.roomCode} • {invite.room?.players || 1}/{invite.room?.maxPlayers || 4} players
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
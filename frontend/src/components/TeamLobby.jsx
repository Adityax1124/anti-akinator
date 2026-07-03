import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const TeamLobby = ({ room, roomCode, user, onLeave, onGameStart, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [friends, setFriends] = useState([]);
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await api.get('/friend/list');
      console.log('📊 Friends list:', response.data.friends);
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  };

  const getHostId = () => {
    if (!room?.host) return null;
    if (room.host._id) return room.host._id;
    if (typeof room.host === 'string') return room.host;
    if (room.host.user) return room.host.user;
    return null;
  };

  const getHostUsername = () => {
    if (!room?.host) return '...';
    if (room.host.username) return room.host.username;
    return 'Host';
  };

  const hostId = getHostId();
  const userId = user?._id || user?.id;
  const isHost = hostId && userId && hostId.toString() === userId.toString();

  const handleInviteFriend = async (friendId, friendUsername) => {
    console.log('📤 [INVITE] Sending invite to:', { friendId, friendUsername });
    console.log('📤 [INVITE] Room code:', roomCode);
    
    if (!friendId) {
      console.error('❌ [INVITE] No friend ID provided');
      setInviteMessage('❌ Invalid friend');
      setTimeout(() => setInviteMessage(''), 3000);
      return;
    }

    setInviteLoading(true);
    setInviteMessage('');
    try {
      const response = await api.post('/team/invite', {
        roomCode: roomCode,
        friendId: friendId
      });

      console.log('📨 [INVITE] Response:', response.data);

      if (response.data.success) {
        setInviteMessage(`✅ Invite sent to ${friendUsername}!`);
        setTimeout(() => setInviteMessage(''), 3000);
        setShowInviteDropdown(false);
      } else {
        setInviteMessage(`❌ ${response.data.message || 'Failed to send invite'}`);
        setTimeout(() => setInviteMessage(''), 3000);
      }
    } catch (error) {
      console.error('❌ [INVITE] Error:', error);
      console.error('❌ [INVITE] Response:', error.response?.data);
      setInviteMessage(`❌ ${error.response?.data?.message || 'Failed to send invite'}`);
      setTimeout(() => setInviteMessage(''), 3000);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost) {
      setError('Only the host can start the game');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/team/start', { roomCode });
      if (response.data.success) {
        onGameStart();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const playerCount = room?.players?.length || 0;

  // Filter out friends already in the room
  const availableFriends = friends.filter(friend => {
    const isInRoom = room?.players?.some(
      p => p.user && (p.user._id || p.user) === friend.userId
    );
    return !isInRoom;
  });

  return (
    <div className="team-lobby">
      <h2>👑 Team Lobby</h2>
      
      {/* ✅ REMOVED Room Code Section - No longer needed */}

      <div className="players-list">
        <h4>Players ({playerCount}/{room?.maxPlayers || 4})</h4>
        {room?.players && room.players.length > 0 ? (
          room.players.map((player, index) => {
            const playerId = player.user?._id || player.user || player._id;
            const isPlayerHost = playerId && hostId && playerId.toString() === hostId.toString();
            
            return (
              <div key={index} className="player-item">
                <span className="player-name">
                  {player.user ? '👤' : '⏳'}
                  {player.username || 'Waiting...'}
                  {isPlayerHost && (
                    <span className="host-badge">Host</span>
                  )}
                </span>
                <span className="player-status">
                  {player.user ? '🟢 Ready' : '⏳ Waiting'}
                </span>
              </div>
            );
          })
        ) : (
          <div style={{ color: '#666', textAlign: 'center', padding: '1rem 0' }}>
            No players yet. Invite your friends!
          </div>
        )}
      </div>

      {/* ✅ INVITE FRIENDS SECTION (Host Only) */}
      {isHost && (
        <div className="invite-section">
          <button 
            className="invite-toggle-btn"
            onClick={() => setShowInviteDropdown(!showInviteDropdown)}
          >
            👥 Invite Friends {availableFriends.length > 0 && `(${availableFriends.length})`}
          </button>

          {showInviteDropdown && (
            <div className="invite-dropdown">
              {availableFriends.length === 0 ? (
                <div className="invite-empty">
                  <p>No friends available to invite.</p>
                  <p>All your friends are either in the room or offline.</p>
                </div>
              ) : (
                <div className="invite-list">
                  {availableFriends.map((friend) => (
                    <div key={friend.id} className="invite-item">
                      <span className="invite-friend-name">
                        {friend.username}
                        <span className="invite-badge online">🟢 Online</span>
                      </span>
                      <button 
                        className="invite-friend-btn"
                        onClick={() => handleInviteFriend(friend.userId, friend.username)}
                        disabled={inviteLoading}
                      >
                        {inviteLoading ? 'Sending...' : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {inviteMessage && (
            <div className={`invite-message ${inviteMessage.includes('❌') ? 'error' : ''}`}>
              {inviteMessage}
            </div>
          )}
        </div>
      )}

      {error && <div className="auth-error" style={{ margin: '0.5rem 0' }}>{error}</div>}

      <div className="lobby-actions">
        {isHost ? (
          <button 
            className="btn-start"
            onClick={handleStartGame}
            disabled={loading || playerCount < 2}
          >
            {loading ? 'Starting...' : `🚀 Start Game (${playerCount}/2 min)`}
          </button>
        ) : (
          <div className="waiting-text">
            Waiting for host <strong>{getHostUsername()}</strong> to start the game...
          </div>
        )}
        <button className="btn-leave" onClick={onLeave}>
          Leave Room
        </button>
      </div>

      <div className="team-info">
        <p>💡 Need at least <strong>2</strong> players to start</p>
        <p>🎴 Reward: <strong>5 Shards</strong> each if you guess correctly</p>
        <p>⚡ No streak or leaderboard impact</p>
      </div>
    </div>
  );
};

export default TeamLobby;
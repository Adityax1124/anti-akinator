import React, { useState } from 'react';
import api from '../api/axios';

const TeamLobby = ({ room, roomCode, user, onLeave, onGameStart, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Debug logs
  console.log('🔍 [TeamLobby] Props:');
  console.log('  roomCode:', roomCode);
  console.log('  room:', room);
  console.log('  user._id:', user?._id);
  console.log('  user.username:', user?.username);

  // ✅ FIX: Better host detection
  const getHostId = () => {
    if (!room?.host) return null;
    // If host is an object with _id
    if (room.host._id) return room.host._id;
    // If host is just an ID string
    if (typeof room.host === 'string') return room.host;
    return null;
  };

  const getHostUsername = () => {
    if (!room?.host) return '...';
    if (room.host.username) return room.host.username;
    return 'Host';
  };

  const hostId = getHostId();
  const isHost = hostId && user?._id && hostId.toString() === user._id.toString();

  console.log('🔍 [TeamLobby] Host detection:');
  console.log('  hostId:', hostId);
  console.log('  user._id:', user?._id);
  console.log('  isHost:', isHost);

  const copyRoomCode = () => {
    if (!roomCode) {
      alert('Room code not available');
      return;
    }
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const shareLink = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}/join?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    if (!roomCode) return;
    const message = `🎯 Join my team on Anti-Akinator! Room Code: ${roomCode}\n\n${window.location.origin}/join?room=${roomCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const playerCount = room?.players?.length || 0;

  return (
    <div className="team-lobby">
      <h2>👑 Team Lobby</h2>
      
      <div className="room-code-section">
        <div className="room-code-label">Room Code</div>
        <div className="room-code-display">
          <span className="code">{roomCode || 'Loading...'}</span>
          <button className="copy-btn" onClick={copyRoomCode}>
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>

      <div className="players-list">
        <h4>Players ({playerCount}/{room?.maxPlayers || 4})</h4>
        {room?.players && room.players.length > 0 ? (
          room.players.map((player, index) => {
            // Check if this player is the host
            const playerId = player.user?._id || player.user;
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
            No players yet. Share the room code!
          </div>
        )}
      </div>

      {error && <div className="auth-error" style={{ margin: '0.5rem 0' }}>{error}</div>}

      <div className="share-buttons" style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <button 
          className="share-btn whatsapp" 
          onClick={shareWhatsApp} 
          style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: '#25D366', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
        >
          📱 WhatsApp
        </button>
        <button 
          className="share-btn copy-link" 
          onClick={shareLink} 
          style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: '#6c63ff', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
        >
          🔗 Share Link
        </button>
        {onRefresh && (
          <button 
            className="share-btn refresh" 
            onClick={onRefresh} 
            style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
          >
            🔄
          </button>
        )}
      </div>

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
          <div style={{ textAlign: 'center', color: '#888', padding: '0.5rem' }}>
            Waiting for host <strong>{getHostUsername()}</strong> to start the game...
          </div>
        )}
        <button className="btn-leave" onClick={onLeave}>
          Leave Room
        </button>
      </div>

      <div className="team-info" style={{ marginTop: '1rem' }}>
        <p>💡 Need at least <strong>2</strong> players to start</p>
        <p>🎴 Reward: <strong>5 Shards</strong> each if you guess correctly</p>
        <p>⚡ No streak or leaderboard impact</p>
      </div>
    </div>
  );
};

export default TeamLobby;
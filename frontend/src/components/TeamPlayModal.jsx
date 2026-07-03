import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import io from 'socket.io-client';
import TeamLobby from './TeamLobby';
import './TeamPlay.css';

const TeamPlayModal = ({ isOpen, onClose }) => {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('main');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // ✅ Connect socket and listen for invites when modal opens
  useEffect(() => {
    if (!isOpen || !isAuthenticated || !user) {
      // Clean up when modal closes
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    console.log('🔌 Connecting socket from TeamPlayModal...');
    
    // ✅ Get the correct user ID
    const userId = user?._id || user?.id || user?.userId;
    console.log('👤 User ID:', userId);
    
    if (!userId) {
      console.error('❌ No user ID found!');
      return;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      socket.emit('register-user', { userId: userId });
      console.log(`📤 Registered user ${userId} for invites`);
    });

    // ✅ Listen for team invites (primary)
    socket.on('team-invite', (data) => {
      console.log('📨 [PRIMARY] Team invite received in modal!', data);
      console.log('📨 From:', data.from?.username);
      console.log('📨 Room:', data.roomCode);
      
      setPendingInvites(prev => {
        // Check if already exists
        const exists = prev.some(invite => invite.roomCode === data.roomCode);
        if (exists) {
          console.log('⚠️ Invite already exists, skipping');
          return prev;
        }
        console.log('✅ Adding invite to pending list');
        return [...prev, {
          ...data,
          id: Date.now(),
          receivedAt: new Date()
        }];
      });
    });

    // ✅ Listen for global invites (fallback)
    socket.on('team-invite-global', (data) => {
      console.log('📨 [GLOBAL] Global invite received:', data);
      if (data.targetUserId === userId) {
        console.log('✅ Global invite matches current user');
        setPendingInvites(prev => {
          const exists = prev.some(invite => invite.roomCode === data.roomCode);
          if (exists) return prev;
          return [...prev, {
            ...data,
            id: Date.now(),
            receivedAt: new Date()
          }];
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isOpen, isAuthenticated, token, user]);

  // Join team room socket
  useEffect(() => {
    if (!roomCode || roomCode === 'undefined' || !socketRef.current || !isAuthenticated) return;
    socketRef.current.emit('join-team-room', roomCode);
    console.log(`📤 Joined socket room: ${roomCode}`);
  }, [roomCode, isAuthenticated]);

  // Polling for room updates
  useEffect(() => {
    if (!isOpen || !roomCode || roomCode === 'undefined' || view !== 'lobby' || !isAuthenticated) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    fetchRoomData();
    pollingIntervalRef.current = setInterval(() => {
      fetchRoomData();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, roomCode, view, isAuthenticated]);

  const fetchRoomData = async () => {
    if (!roomCode || roomCode === 'undefined' || !isAuthenticated) return;
    try {
      const response = await api.get(`/team/room/${roomCode}`);
      if (response.data.success) {
        const fetchedRoom = response.data.room;
        setRoom(fetchedRoom);
        if (fetchedRoom.status === 'playing') {
          onClose();
          navigate(`/team-game/${roomCode}`);
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Fetch room error:', error);
      }
    }
  };

  // ✅ Accept Invite - Navigate to team game page (which shows lobby)
  const handleAcceptInvite = async (invite) => {
    console.log('📨 Accepting invite to:', invite.roomCode);
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/team/accept-invite', {
        roomCode: invite.roomCode
      });
      
      if (response.data.success) {
        // Remove from pending invites
        setPendingInvites(prev => prev.filter(i => i.roomCode !== invite.roomCode));
        
        // ✅ Close modal and navigate to team game page
        // The TeamGamePage will show the lobby first
        onClose();
        navigate(`/team-game/${invite.roomCode}`);
      }
    } catch (error) {
      console.error('Accept invite error:', error);
      setError(error.response?.data?.message || 'Failed to accept invite');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Decline Invite
  const handleDeclineInvite = async (invite) => {
    console.log('📨 Declining invite to:', invite.roomCode);
    try {
      await api.post('/team/decline-invite', {
        roomCode: invite.roomCode
      });
      setPendingInvites(prev => prev.filter(i => i.roomCode !== invite.roomCode));
    } catch (error) {
      console.error('Decline invite error:', error);
      setPendingInvites(prev => prev.filter(i => i.roomCode !== invite.roomCode));
    }
  };

  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/team/create');
      if (response.data.success) {
        const newRoom = response.data.room;
        const code = response.data.roomCode || newRoom?.roomCode;
        
        const roomWithCode = {
          ...newRoom,
          roomCode: code
        };
        
        setRoom(roomWithCode);
        setRoomCode(code);
        setView('lobby');
        
        if (socketRef.current) {
          socketRef.current.emit('join-team-room', code);
        }
      }
    } catch (error) {
      console.error('Create room error:', error);
      setError(error.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.post('/team/leave', { roomCode });
      if (socketRef.current) {
        socketRef.current.emit('leave-team-room', roomCode);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setView('main');
      setRoom(null);
      setRoomCode('');
    } catch (error) {
      console.error('Leave room error:', error);
      setView('main');
      setRoom(null);
      setRoomCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={(e) => e.stopPropagation()}>
        <button className="team-modal-close" onClick={onClose}>✕</button>

        {view === 'main' && (
          <>
            <div className="modal-header">
              <div className="icon-wrapper">
                <span className="icon">🤝</span>
              </div>
              <h2>Team Play</h2>
              <p>Play with friends as a team!</p>
            </div>

            {/* ✅ PENDING INVITES SECTION */}
            {pendingInvites.length > 0 ? (
              <div className="pending-invites-section">
                <h4>📨 Pending Invites ({pendingInvites.length})</h4>
                {pendingInvites.map((invite) => (
                  <div key={invite.id || invite.roomCode} className="pending-invite-item">
                    <div className="invite-info">
                      <span className="invite-from">
                        <strong>{invite.from?.username || 'Someone'}</strong> invited you to join their team!
                      </span>
                      <span className="invite-room">Room: {invite.roomCode}</span>
                      <span className="invite-players">
                        👥 {invite.room?.players || 1}/{invite.room?.maxPlayers || 4} players
                      </span>
                    </div>
                    <div className="invite-actions">
                      <button 
                        className="invite-btn accept-invite"
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={loading}
                      >
                        {loading ? 'Joining...' : 'Accept'}
                      </button>
                      <button 
                        className="invite-btn decline-invite"
                        onClick={() => handleDeclineInvite(invite)}
                        disabled={loading}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-invites-message">
                No pending invites
              </div>
            )}

            <div className="team-options">
              <div className="team-option" style={{ gridColumn: '1 / -1', maxWidth: '300px', margin: '0 auto' }}>
                <span className="opt-icon">👑</span>
                <h3>Create Room</h3>
                <p className="opt-desc">Host a team game and invite friends</p>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateRoom}
                  disabled={loading || !isAuthenticated}
                >
                  {loading ? 'Creating...' : 'Create Room →'}
                </button>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="team-info">
              <div className="info-row">
                <span className="info-icon">💡</span>
                <p>Work together to guess the character</p>
              </div>
              <div className="info-row">
                <span className="info-icon">🎴</span>
                <p><strong>5 Shards</strong> each if you guess correctly</p>
              </div>
              <div className="info-row">
                <span className="info-icon">👥</span>
                <p>Max <strong>4</strong> players</p>
              </div>
              <div className="info-row">
                <span className="info-icon">⚡</span>
                <p>No streak or leaderboard impact</p>
              </div>
            </div>
          </>
        )}

        {view === 'lobby' && room && (
          <TeamLobby
            room={room}
            roomCode={roomCode}
            user={user}
            onLeave={handleLeaveRoom}
            onGameStart={() => {
              onClose();
              navigate(`/team-game/${roomCode}`);
            }}
            onRefresh={fetchRoomData}
          />
        )}
      </div>
    </div>
  );
};

export default TeamPlayModal;
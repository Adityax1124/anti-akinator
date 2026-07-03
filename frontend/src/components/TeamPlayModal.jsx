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
  const [joinCode, setJoinCode] = useState('');
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const joinInputRef = useRef(null);

  // ✅ Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && view === 'main') {
      setTimeout(() => {
        if (joinInputRef.current) {
          joinInputRef.current.focus();
        }
      }, 200);
    }
  }, [isOpen, view]);

  useEffect(() => {
    if (!isAuthenticated) {
      setError('Please login to play team games');
      setTimeout(() => {
        onClose();
        navigate('/login');
      }, 2000);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('player-update', () => {
      fetchRoomData();
    });

    socket.on('game-started', (data) => {
      const codeToNavigate = data.roomCode || roomCode;
      if (codeToNavigate && codeToNavigate !== 'undefined') {
        onClose();
        navigate(`/team-game/${codeToNavigate}`);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isOpen, roomCode, isAuthenticated, token]);

  useEffect(() => {
    if (!roomCode || roomCode === 'undefined' || !socketRef.current || !isAuthenticated) return;
    socketRef.current.emit('join-team-room', roomCode);
  }, [roomCode, isAuthenticated]);

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
      console.error('Fetch room error:', error);
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
      setError(error.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmedCode = joinCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/team/join', { roomCode: trimmedCode });
      if (response.data.success) {
        const joinedRoom = response.data.room;
        const code = response.data.roomCode || joinedRoom?.roomCode || trimmedCode;
        
        const roomWithCode = {
          ...joinedRoom,
          roomCode: code
        };
        
        setRoom(roomWithCode);
        setRoomCode(code);
        setView('lobby');
        setJoinCode('');
        
        if (socketRef.current) {
          socketRef.current.emit('join-team-room', code);
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to join room');
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
      setJoinCode('');
    } catch (error) {
      console.error('Leave room error:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleJoinRoom();
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

            <div className="team-options">
              {/* Create Room */}
              <div className="team-option">
                <span className="opt-icon">👑</span>
                <h3>Create Room</h3>
                <p className="opt-desc">Host and invite friends</p>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreateRoom}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Room →'}
                </button>
              </div>

              {/* Join Room */}
              <div className="team-option">
                <span className="opt-icon">🔗</span>
                <h3>Join Room</h3>
                <p className="opt-desc">Enter a room code</p>
                <div className="join-wrapper">
                  <div className="join-room-input">
                    <input
                      type="text"
                      placeholder="ANTI-XXXX"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyPress}
                      maxLength={12}
                      className="join-input"
                      id="team-join-input"
                      autoComplete="off"
                      ref={joinInputRef}
                    />
                    <button 
                      className="btn-secondary"
                      onClick={handleJoinRoom}
                      disabled={loading || !joinCode.trim()}
                    >
                      {loading ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>
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
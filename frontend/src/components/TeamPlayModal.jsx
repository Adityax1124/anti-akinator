import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import io from 'socket.io-client';
import TeamLobby from './TeamLobby';
import './TeamPlay.css';

const TeamPlayModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('main');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isOpen) return;

    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('player-update', (data) => {
      console.log('📢 Player update received:', data);
      fetchRoomData();
    });

    socket.on('game-started', (data) => {
      console.log('🎮 Game started event received:', data);
      const codeToNavigate = data.roomCode || roomCode;
      
      if (codeToNavigate && codeToNavigate !== 'undefined') {
        console.log('🚀 Navigating to team game page:', codeToNavigate);
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
  }, [isOpen, roomCode]);

  // Join socket room when roomCode changes
  useEffect(() => {
    if (!roomCode || roomCode === 'undefined' || !socketRef.current) return;
    console.log('🔌 Joining socket room:', roomCode);
    socketRef.current.emit('join-team-room', roomCode);
  }, [roomCode]);

  // Polling fallback - fetch room data every 3 seconds when in lobby
  useEffect(() => {
    if (!isOpen || !roomCode || roomCode === 'undefined' || view !== 'lobby') {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    console.log('🔄 Starting polling for room:', roomCode);
    
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
  }, [isOpen, roomCode, view]);

  const fetchRoomData = async () => {
    if (!roomCode || roomCode === 'undefined') return;
    try {
      const response = await api.get(`/team/room/${roomCode}`);
      if (response.data.success) {
        const fetchedRoom = response.data.room;
        console.log('📊 Room data fetched:', {
          roomCode: fetchedRoom.roomCode,
          players: fetchedRoom.players?.length,
          status: fetchedRoom.status,
          host: fetchedRoom.host?.username
        });
        setRoom(fetchedRoom);
        
        if (fetchedRoom.status === 'playing') {
          console.log('🎮 Room is already playing, redirecting to game page');
          onClose();
          navigate(`/team-game/${roomCode}`);
        }
      }
    } catch (error) {
      console.error('❌ Fetch room error:', error);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/team/create');
      console.log('📝 [Create Room] Full response:', response.data);
      
      if (response.data.success) {
        const newRoom = response.data.room;
        const code = response.data.roomCode || newRoom?.roomCode;
        
        console.log('📝 [Create Room] Room code:', code);
        
        if (!code) {
          throw new Error('No room code received from server');
        }
        
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
      console.error('❌ Create room error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/team/join', { roomCode: trimmedCode });
      console.log('📝 [Join Room] Full response:', response.data);
      
      if (response.data.success) {
        const joinedRoom = response.data.room;
        const code = response.data.roomCode || joinedRoom?.roomCode || trimmedCode;
        
        console.log('📝 [Join Room] Room code:', code);
        
        if (!code) {
          throw new Error('No room code received from server');
        }
        
        const roomWithCode = {
          ...joinedRoom,
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
      console.error('❌ Join room error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to join room');
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
      console.error('❌ Leave room error:', error);
    }
  };

  const handleManualRefresh = async () => {
    if (!roomCode) return;
    await fetchRoomData();
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
                      maxLength={12}
                      disabled={false}
                      autoFocus
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
              console.log('🚀 Host starting game, redirecting to:', roomCode);
              onClose();
              navigate(`/team-game/${roomCode}`);
            }}
            onRefresh={handleManualRefresh}
          />
        )}
      </div>
    </div>
  );
};

export default TeamPlayModal;
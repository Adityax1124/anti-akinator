import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import io from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';
import './TeamGamePage.css';

const TeamGamePage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const [sending, setSending] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [players, setPlayers] = useState([]);
  
  // ===== VOICE CHAT STATE =====
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  const [micError, setMicError] = useState('');
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteUsersRef = useRef({});

  // ============================================================
  // AGORA VOICE CHAT FUNCTIONS
  // ============================================================

  const startVoiceChat = async () => {
    try {
      console.log('🎤 Starting Agora voice chat...');
      setMicError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Your browser does not support microphone access');
        return;
      }

      console.log('🔄 Fetching Agora token...');
      const tokenResponse = await api.get(`/agora-token?channel=${roomCode}`);
      const { token, appId, uid } = tokenResponse.data;
      console.log('✅ Agora token fetched successfully, UID:', uid);

      const client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
      });
      clientRef.current = client;

      client.on('connection-state-change', (curState, prevState) => {
        console.log('🔄 Connection state:', prevState, '→', curState);
        if (curState === 'CONNECTED') {
          console.log('✅ Client connected successfully!');
        }
        if (curState === 'DISCONNECTED') {
          console.warn('⚠️ Client disconnected!');
          setIsMicOn(false);
        }
      });

      client.on('exception', (event) => {
        console.error('❌ Agora exception:', event);
      });

      await client.join(
        appId,
        roomCode,
        token,
        uid
      );
      console.log('✅ Joined Agora channel:', roomCode, 'with UID:', uid);

      console.log('🎤 Creating microphone audio track...');
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: {
          bitrate: 32000,
          codec: 'opus'
        }
      });
      localAudioTrackRef.current = localAudioTrack;
      console.log('✅ Microphone audio track created');

      await client.publish([localAudioTrack]);
      console.log('✅ Published local audio track');

      setIsMicOn(true);

      // ✅ Remote user published handler
      client.on('user-published', async (user, mediaType) => {
        console.log('👤 Remote user published:', user.uid, 'mediaType:', mediaType);
        if (mediaType === 'audio') {
          try {
            await client.subscribe(user, mediaType);
            console.log('🔊 Subscribed to remote audio for user:', user.uid);
            
            const audioTrack = user.audioTrack;
            audioTrack.play();
            audioTrack.setVolume(100);
            remoteUsersRef.current[user.uid] = audioTrack;
            
            setVoiceParticipants(prev => {
              if (!prev.includes(user.uid)) {
                return [...prev, user.uid];
              }
              return prev;
            });
            
            console.log(`🔊 Audio playing for user ${user.uid}`);
          } catch (error) {
            console.error('❌ Error subscribing to remote audio:', error);
          }
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        console.log('👤 Remote user unpublished:', user.uid);
        if (mediaType === 'audio') {
          const audioTrack = remoteUsersRef.current[user.uid];
          if (audioTrack) {
            audioTrack.stop();
            delete remoteUsersRef.current[user.uid];
            setVoiceParticipants(prev => prev.filter(id => id !== user.uid));
          }
        }
      });

      client.on('user-left', (user) => {
        console.log('👤 Remote user left:', user.uid);
        const audioTrack = remoteUsersRef.current[user.uid];
        if (audioTrack) {
          audioTrack.stop();
          delete remoteUsersRef.current[user.uid];
          setVoiceParticipants(prev => prev.filter(id => id !== user.uid));
        }
      });

      if (socketRef.current) {
        socketRef.current.emit('user-joined-voice', { 
          roomCode, 
          username: user.username 
        });
      }

      console.log('🎤 Agora voice chat started successfully');
    } catch (error) {
      console.error('❌ Failed to start voice chat:', error);
      setMicError('Failed to start voice chat: ' + (error.message || 'Unknown error'));
    }
  };

  const stopVoiceChat = async () => {
    console.log('🎤 Stopping voice chat...');

    try {
      if (localAudioTrackRef.current) {
        try {
          await clientRef.current?.unpublish([localAudioTrackRef.current]);
          localAudioTrackRef.current.close();
        } catch (e) {
          console.warn('Error unpublishing track:', e);
        }
        localAudioTrackRef.current = null;
      }

      Object.values(remoteUsersRef.current).forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      remoteUsersRef.current = {};

      try {
        await clientRef.current?.leave();
      } catch (e) {
        console.warn('Error leaving channel:', e);
      }
      clientRef.current = null;

      setVoiceParticipants([]);
      setIsMicOn(false);
      setMicError('');

      console.log('🎤 Voice chat stopped');
    } catch (error) {
      console.error('Error stopping voice chat:', error);
    }
  };

  // ✅ MIC TOGGLE - Only affects mic
  const toggleMic = () => {
    console.log('🎤 Toggle mic called, current state:', isMicOn);
    if (isMicOn) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  // ✅ SPEAKER TOGGLE - Only affects speaker, NOT mic
  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    
    // ✅ Only update remote tracks, don't affect local mic
    Object.values(remoteUsersRef.current).forEach(track => {
      try {
        track.setVolume(newState ? 100 : 0);
        console.log(`🔊 Track volume set to ${newState ? 100 : 0}`);
      } catch (e) {}
    });
    console.log(`🔊 Speaker ${newState ? 'unmuted' : 'muted'}`);
  };

  // ============================================================
  // GAME FUNCTIONS
  // ============================================================

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || sending || gameOver) return;

    setSending(true);
    try {
      const response = await api.post('/team/question', {
        roomCode,
        question: question.trim()
      });

      if (response.data.success) {
        const newMessage = {
          question: question.trim(),
          answer: response.data.answer || 'Maybe',
          askedBy: response.data.askedBy || user.username,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMessage]);
        setQuestionCount(response.data.questionCount || questionCount + 1);
        setQuestion('');
        setTimeout(() => fetchRoomData(), 500);
      }
    } catch (error) {
      console.error('Ask question error:', error);
      alert(error.response?.data?.message || 'Failed to ask question');
    } finally {
      setSending(false);
    }
  };

  const handleMakeGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || sending || gameOver) return;

    setSending(true);
    try {
      const response = await api.post('/team/guess', {
        roomCode,
        guess: guess.trim()
      });

      if (response.data.success) {
        const newMessage = {
          type: response.data.isCorrect ? 'guess-correct' : 'guess-wrong',
          guessedBy: user.username,
          text: response.data.isCorrect ? `🎉 Correct! It was ${response.data.character}!` : `❌ ${guess.trim()} is not correct`,
          character: response.data.character,
          image: response.data.image,
          reward: response.data.reward,
          players: response.data.players
        };
        setMessages(prev => [...prev, newMessage]);
        setGuess('');

        if (response.data.isCorrect) {
          setGameOver(true);
          setResult({
            success: true,
            character: response.data.character,
            image: response.data.image,
            reward: response.data.reward,
            players: response.data.players
          });
        }
        setTimeout(() => fetchRoomData(), 500);
      }
    } catch (error) {
      console.error('Guess error:', error);
      alert(error.response?.data?.message || 'Failed to make guess');
    } finally {
      setSending(false);
    }
  };

  const handleLeave = () => {
    stopVoiceChat();
    if (socketRef.current) {
      socketRef.current.emit('leave-team-room', roomCode);
    }
    navigate('/');
  };

  const handlePlayAgain = () => {
    stopVoiceChat();
    navigate('/');
  };

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================

  const fetchRoomData = async () => {
    try {
      const response = await api.get(`/team/room/${roomCode}`);
      if (response.data.success) {
        const roomData = response.data.room;
        setRoom(roomData);
        setPlayers(roomData.players || []);
        setQuestionCount(roomData.gameData?.totalQuestions || 0);
        setMaxQuestions(roomData.gameData?.maxQuestions || 10);
        
        if (roomData.gameData?.questions) {
          setMessages(roomData.gameData.questions);
        }
        
        if (roomData.gameData?.isGuessed) {
          setGameOver(true);
          setResult({
            success: true,
            character: roomData.gameData.characterName,
            image: roomData.gameData.characterImage,
            players: roomData.players
          });
        }
        
        if (roomData.status === 'finished' && !roomData.gameData?.isGuessed) {
          setGameOver(true);
          setResult({
            success: false,
            message: 'Game ended',
            character: roomData.gameData?.characterName || 'Unknown'
          });
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Fetch room error:', error);
      setError('Failed to load game');
      setLoading(false);
    }
  };

  // ============================================================
  // USE EFFECTS
  // ============================================================

  useEffect(() => {
    if (!roomCode) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('join-team-room', roomCode);
    });

    socket.on('player-update', (data) => {
      console.log('📢 Player update:', data);
      fetchRoomData();
    });

    socket.on('game-started', (data) => {
      console.log('🎮 Game started:', data);
      fetchRoomData();
    });

    socket.on('user-joined-voice', (data) => {
      console.log('🎤 User joined voice:', data.username);
    });

    socket.on('user-left-voice', (data) => {
      console.log('🎤 User left voice:', data.username);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      if (isMicOn) {
        stopVoiceChat();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (isMicOn) {
        stopVoiceChat();
      }
    };
  }, [roomCode]);

  useEffect(() => {
    fetchRoomData();
    const interval = setInterval(fetchRoomData, 3000);
    return () => clearInterval(interval);
  }, [roomCode]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="team-game-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="team-game-page">
        <div className="error-container">
          <h2>❌ {error || 'Room not found'}</h2>
          <button className="btn btn-primary" onClick={handleLeave}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isQuestionLimitReached = questionCount >= maxQuestions;

  return (
    <div className="team-game-page">
      <div className="team-game-header">
        <div className="header-left">
          <button className="btn-leave" onClick={handleLeave}>
            ← Leave
          </button>
          <span className="room-code-display">Room: {roomCode}</span>
        </div>
        <div className="header-center">
          <span className="team-name">
            👥 {players.map(p => p.username).join(', ')}
          </span>
        </div>
        <div className="header-right">
          <div className="voice-controls">
            <button 
              className={`voice-btn ${isMicOn ? 'active' : ''}`}
              onClick={toggleMic}
              title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {isMicOn ? '🎤' : '🎤🔇'}
              {isSpeaking && isMicOn && <span className="speaking-indicator"></span>}
            </button>
            <button 
              className={`voice-btn ${isSpeakerOn ? 'active' : ''}`}
              onClick={toggleSpeaker}
              title={isSpeakerOn ? 'Mute Speaker' : 'Unmute Speaker'}
            >
              {isSpeakerOn ? '🔊' : '🔇'}
            </button>
            {Object.keys(remoteUsersRef.current).length > 0 && (
              <span className="voice-participants">
                {Object.keys(remoteUsersRef.current).length} 🎤
              </span>
            )}
          </div>
          <span className="question-count">
            Questions: {questionCount}/{maxQuestions}
          </span>
        </div>
      </div>

      <div className="team-game-body">
        <div className="team-game-messages" ref={messagesContainerRef}>
          {messages.length === 0 && (
            <div className="empty-state">
              <p>🤔 Start asking questions to find the secret character!</p>
              <p>Team members can take turns asking questions</p>
            </div>
          )}
          
          {messages.map((msg, index) => {
            const isQuestion = msg.question && msg.answer;
            const isGuessCorrect = msg.type === 'guess-correct';
            const isGuessWrong = msg.type === 'guess-wrong';
            
            return (
              <div key={index} className={`msg ${isQuestion ? 'question' : ''} ${isGuessCorrect ? 'guess-correct' : ''} ${isGuessWrong ? 'guess-wrong' : ''}`}>
                {isQuestion && (
                  <>
                    <div><strong>{msg.askedBy || 'Team'}</strong> asked: "{msg.question}"</div>
                    <div className="msg-answer">🤖 {msg.answer}</div>
                  </>
                )}
                {isGuessCorrect && (
                  <div className="msg-correct">
                    <div>🎉 <strong>{msg.guessedBy}</strong> guessed correctly!</div>
                    <div className="character-reveal">It was {msg.character}!</div>
                    {msg.reward && (
                      <div className="reward-text">🎴 Everyone gets {msg.reward} Shards!</div>
                    )}
                  </div>
                )}
                {isGuessWrong && (
                  <div className="msg-wrong">
                    ❌ <strong>{msg.guessedBy}</strong> guessed: "{msg.text}"
                  </div>
                )}
              </div>
            );
          })}
          
          {isQuestionLimitReached && !gameOver && (
            <div className="limit-warning">
              ⚠️ You've used all {maxQuestions} questions! Make your guess now!
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {gameOver && result ? (
          <div className="team-game-result">
            <div className="result-icon">🎉</div>
            <h2>Team Guessed Correctly!</h2>
            <div className="character-name">{result.character}</div>
            {result.image && (
              <img src={result.image} alt={result.character} className="result-image" />
            )}
            <div className="reward-text">🎴 Everyone gets {result.reward || 5} Shards!</div>
            <div className="players-text">
              👥 {result.players?.map(p => p.username).join(', ')}
            </div>
            <button className="btn btn-primary" onClick={handlePlayAgain}>
              🔄 Play Again
            </button>
          </div>
        ) : (
          <div className="team-game-input-area">
            <form onSubmit={handleAskQuestion} className="input-row">
              <input
                type="text"
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={sending || gameOver || isQuestionLimitReached}
                className="input-ask"
              />
              <button
                type="submit"
                className="btn btn-ask"
                disabled={sending || !question.trim() || gameOver || isQuestionLimitReached}
              >
                Ask
              </button>
            </form>
            <form onSubmit={handleMakeGuess} className="input-row">
              <input
                type="text"
                placeholder="Make a guess..."
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                disabled={sending || gameOver}
                className="input-guess"
              />
              <button
                type="submit"
                className="btn btn-guess"
                disabled={sending || !guess.trim() || gameOver}
              >
                Guess!
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="team-game-footer">
        <span>🎴 5 Shards each if correct</span>
        <span>⚡ No streak/leaderboard impact</span>
        {isMicOn && (
          <span className={`voice-status ${isSpeaking ? 'speaking' : ''}`}>
            {isSpeaking ? '🔴 Speaking...' : '🎤 Connected'}
          </span>
        )}
        {micError && (
          <span className="voice-status error">
            ⚠️ {micError}
          </span>
        )}
      </div>
    </div>
  );
};

export default TeamGamePage;
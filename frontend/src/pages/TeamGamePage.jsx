import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import io from 'socket.io-client';
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
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Initialize socket
  useEffect(() => {
    if (!roomCode) return;

    const socket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('join-team-room', roomCode);
      
      if (isMicOn) {
        socket.emit('user-joined-voice', { 
          roomCode, 
          username: user.username 
        });
      }
    });

    socket.on('player-update', (data) => {
      console.log('📢 Player update:', data);
      fetchRoomData();
    });

    socket.on('game-started', (data) => {
      console.log('🎮 Game started:', data);
      fetchRoomData();
    });

    // ===== VOICE CHAT EVENTS =====
    socket.on('voice-offer', async (data) => {
      console.log('📞 Voice offer received from:', data.from);
      if (isMicOn) {
        await handleVoiceOffer(data);
      }
    });

    socket.on('voice-answer', async (data) => {
      console.log('📞 Voice answer received from:', data.from);
      if (isMicOn) {
        await handleVoiceAnswer(data);
      }
    });

    socket.on('voice-ice-candidate', async (data) => {
      console.log('🧊 ICE candidate received from:', data.from);
      if (isMicOn) {
        await handleIceCandidate(data);
      }
    });

    socket.on('user-joined-voice', (data) => {
      console.log('🎤 User joined voice:', data.username);
      if (isMicOn) {
        setVoiceParticipants(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    });

    socket.on('user-left-voice', (data) => {
      console.log('🎤 User left voice:', data.username);
      setVoiceParticipants(prev => prev.filter(name => name !== data.username));
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

  // Fetch room data
  const fetchRoomData = async () => {
    try {
      const response = await api.get(`/team/room/${roomCode}`);
      if (response.data.success) {
        const roomData = response.data.room;
        console.log('📊 Room data fetched:', roomData);
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
  // VOICE CHAT FUNCTIONS
  // ============================================================

  const startVoiceChat = async () => {
    try {
      console.log('🎤 Starting voice chat...');
      setMicError('');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Microphone access granted');
      localStreamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start voice activity detection
      detectVoiceActivity();
      
      setIsMicOn(true);
      
      // Notify others
      if (socketRef.current) {
        socketRef.current.emit('user-joined-voice', { 
          roomCode, 
          username: user.username 
        });
      }
      
      // Create peer connections for all other players
      const otherPlayers = players.filter(p => p.username !== user.username);
      console.log(`👥 Creating connections for: ${otherPlayers.map(p => p.username).join(', ')}`);
      
      for (const player of otherPlayers) {
        await createPeerConnection(player.username);
      }
      
      console.log('🎤 Voice chat started successfully');
    } catch (error) {
      console.error('❌ Failed to start voice chat:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMicError('No microphone found. Please connect a microphone and try again.');
      } else {
        setMicError('Could not access microphone. Please check your permissions and try again.');
      }
      alert(micError || 'Could not access microphone. Please check your permissions.');
    }
  };

  const stopVoiceChat = () => {
    console.log('🎤 Stopping voice chat...');
    
    // Close all peer connections
    for (const username in peerConnectionsRef.current) {
      try {
        peerConnectionsRef.current[username].close();
        const audioEl = document.getElementById(`audio-${username}`);
        if (audioEl) audioEl.remove();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }
    peerConnectionsRef.current = {};
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Notify others
    if (isMicOn && socketRef.current) {
      socketRef.current.emit('user-left-voice', { 
        roomCode, 
        username: user.username 
      });
    }
    
    setIsMicOn(false);
    setVoiceParticipants([]);
    setMicError('');
    
    console.log('🎤 Voice chat stopped');
  };

  const toggleMic = () => {
    if (isMicOn) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    
    // Update all audio elements
    const audioElements = document.querySelectorAll('audio[id^="audio-"]');
    audioElements.forEach(el => {
      el.volume = isSpeakerOn ? 0 : 1;
    });
    
    console.log(`🔊 Speaker ${isSpeakerOn ? 'muted' : 'unmuted'}`);
  };

  const createPeerConnection = async (targetUsername) => {
    if (peerConnectionsRef.current[targetUsername]) {
      console.log(`⚠️ Connection to ${targetUsername} already exists`);
      return;
    }
    
    console.log(`🔗 Creating peer connection to: ${targetUsername}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });
    
    peerConnectionsRef.current[targetUsername] = pc;
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 ICE candidate from ${user.username} to ${targetUsername}`);
        socketRef.current.emit('voice-ice-candidate', {
          roomCode,
          to: targetUsername,
          candidate: event.candidate,
          from: user.username
        });
      }
    };
    
    // Handle incoming audio tracks
    pc.ontrack = (event) => {
      console.log(`🎵 Received audio track from ${targetUsername}`);
      
      const existingEl = document.getElementById(`audio-${targetUsername}`);
      if (existingEl) existingEl.remove();
      
      const audioElement = document.createElement('audio');
      audioElement.id = `audio-${targetUsername}`;
      audioElement.srcObject = event.streams[0];
      audioElement.autoplay = true;
      audioElement.volume = isSpeakerOn ? 1 : 0;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      
      console.log(`🔊 Audio element created for ${targetUsername}, volume: ${audioElement.volume}`);
    };
    
    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection to ${targetUsername}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log(`⚠️ Connection to ${targetUsername} lost, cleaning up...`);
        delete peerConnectionsRef.current[targetUsername];
        const audioEl = document.getElementById(`audio-${targetUsername}`);
        if (audioEl) audioEl.remove();
        setVoiceParticipants(prev => prev.filter(name => name !== targetUsername));
      }
    };
    
    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketRef.current.emit('voice-offer', {
        roomCode,
        to: targetUsername,
        offer: pc.localDescription,
        from: user.username
      });
      
      console.log(`📤 Offer sent to ${targetUsername}`);
    } catch (error) {
      console.error(`❌ Error creating offer for ${targetUsername}:`, error);
    }
  };

  const handleVoiceOffer = async (data) => {
    const { from, offer } = data;
    console.log(`📞 Voice offer from ${from}`);
    
    if (!peerConnectionsRef.current[from]) {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });
      
      peerConnectionsRef.current[from] = pc;
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('voice-ice-candidate', {
            roomCode,
            to: from,
            candidate: event.candidate,
            from: user.username
          });
        }
      };
      
      pc.ontrack = (event) => {
        console.log(`🎵 Received audio track from ${from}`);
        
        const existingEl = document.getElementById(`audio-${from}`);
        if (existingEl) existingEl.remove();
        
        const audioElement = document.createElement('audio');
        audioElement.id = `audio-${from}`;
        audioElement.srcObject = event.streams[0];
        audioElement.autoplay = true;
        audioElement.volume = isSpeakerOn ? 1 : 0;
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        
        console.log(`🔊 Audio element created for ${from}`);
      };
      
      pc.onconnectionstatechange = () => {
        console.log(`🔗 Connection to ${from}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          delete peerConnectionsRef.current[from];
          const audioEl = document.getElementById(`audio-${from}`);
          if (audioEl) audioEl.remove();
          setVoiceParticipants(prev => prev.filter(name => name !== from));
        }
      };
    }
    
    const pc = peerConnectionsRef.current[from];
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketRef.current.emit('voice-answer', {
        roomCode,
        to: from,
        answer: pc.localDescription,
        from: user.username
      });
      
      console.log(`📤 Answer sent to ${from}`);
    } catch (error) {
      console.error(`❌ Error handling offer from ${from}:`, error);
    }
  };

  const handleVoiceAnswer = async (data) => {
    const { from, answer } = data;
    console.log(`📞 Voice answer from ${from}`);
    
    const pc = peerConnectionsRef.current[from];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ Remote description set for ${from}`);
      } catch (error) {
        console.error(`❌ Error handling answer from ${from}:`, error);
      }
    } else {
      console.warn(`⚠️ No peer connection found for ${from}`);
    }
  };

  const handleIceCandidate = async (data) => {
    const { from, candidate } = data;
    const pc = peerConnectionsRef.current[from];
    
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ ICE candidate added for ${from}`);
      } catch (error) {
        console.error(`❌ Error adding ICE candidate from ${from}:`, error);
      }
    }
  };

  const detectVoiceActivity = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    const checkVoice = () => {
      if (!analyserRef.current || !isMicOn) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      let average = 0;
      for (let i = 0; i < dataArray.length; i++) {
        average += dataArray[i];
      }
      average /= dataArray.length;
      
      const isActive = average > 30;
      if (isActive !== isSpeaking) {
        setIsSpeaking(isActive);
      }
      
      requestAnimationFrame(checkVoice);
    };
    
    checkVoice();
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || sending || gameOver) return;

    setSending(true);
    try {
      const response = await api.post('/team/question', {
        roomCode,
        question: question.trim()
      });

      console.log('📝 Ask question response:', response.data);

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

      console.log('📝 Guess response:', response.data);

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
          {/* ===== VOICE CONTROLS ===== */}
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
            {voiceParticipants.length > 0 && (
              <span className="voice-participants">
                {voiceParticipants.length} 🎤
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
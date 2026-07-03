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
      
      // ✅ Only join voice if mic is already on (persistent)
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
      // ✅ Only stop voice if mic was on
      if (isMicOn) {
        stopVoiceChat();
      }
    });

    return () => {
      // ✅ Cleanup on unmount
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
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start voice activity detection
      detectVoiceActivity();
      
      setIsMicOn(true);
      
      // ✅ Only emit join voice AFTER mic is on
      if (socketRef.current) {
        socketRef.current.emit('user-joined-voice', { 
          roomCode, 
          username: user.username 
        });
      }
      
      // Create peer connections for all other players
      for (const player of players) {
        if (player.username !== user.username) {
          await createPeerConnection(player.username);
        }
      }
      
      console.log('🎤 Voice chat started');
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopVoiceChat = () => {
    // Stop all peer connections
    for (const username in peerConnectionsRef.current) {
      peerConnectionsRef.current[username].close();
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
    
    // ✅ Only emit leave voice if mic was on
    if (isMicOn && socketRef.current) {
      socketRef.current.emit('user-left-voice', { 
        roomCode, 
        username: user.username 
      });
    }
    
    setIsMicOn(false);
    setVoiceParticipants([]);
    
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
    // Mute/unmute all peer connections
    for (const username in peerConnectionsRef.current) {
      const pc = peerConnectionsRef.current[username];
      const receivers = pc.getReceivers();
      receivers.forEach(receiver => {
        if (receiver.track && receiver.track.kind === 'audio') {
          receiver.track.enabled = isSpeakerOn;
        }
      });
    }
  };

  const createPeerConnection = async (targetUsername) => {
    if (peerConnectionsRef.current[targetUsername]) {
      return;
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
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
        socketRef.current.emit('voice-ice-candidate', {
          roomCode,
          to: targetUsername,
          candidate: event.candidate,
          from: user.username
        });
      }
    };
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      const audioElement = new Audio();
      audioElement.srcObject = event.streams[0];
      audioElement.autoplay = true;
      audioElement.volume = isSpeakerOn ? 1 : 0;
      
      // Add to DOM for debugging
      audioElement.id = `audio-${targetUsername}`;
      document.body.appendChild(audioElement);
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
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleVoiceOffer = async (data) => {
    const { from, offer } = data;
    
    // Create peer connection if doesn't exist
    if (!peerConnectionsRef.current[from]) {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      peerConnectionsRef.current[from] = pc;
      
      // Add local stream tracks
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
        const audioElement = new Audio();
        audioElement.srcObject = event.streams[0];
        audioElement.autoplay = true;
        audioElement.volume = isSpeakerOn ? 1 : 0;
        audioElement.id = `audio-${from}`;
        document.body.appendChild(audioElement);
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
    } catch (error) {
      console.error('Error handling voice offer:', error);
    }
  };

  const handleVoiceAnswer = async (data) => {
    const { from, answer } = data;
    const pc = peerConnectionsRef.current[from];
    
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling voice answer:', error);
      }
    }
  };

  const handleIceCandidate = async (data) => {
    const { from, candidate } = data;
    const pc = peerConnectionsRef.current[from];
    
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  };

  const detectVoiceActivity = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    const checkVoice = () => {
      if (!analyserRef.current) return;
      
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
      </div>
    </div>
  );
};

export default TeamGamePage;
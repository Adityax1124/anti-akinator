import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import io from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';
import TeamLobby from '../components/TeamLobby';
import './TeamGamePage.css';

const TeamGamePage = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const [sending, setSending] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [players, setPlayers] = useState([]);

  const [timeLeft, setTimeLeft] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [timeWarning, setTimeWarning] = useState(false);
  const timerStartedRef = useRef(false);

  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [voiceParticipants, setVoiceParticipants] = useState([]);
  const [micError, setMicError] = useState('');
  const [speakingUsers, setSpeakingUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteUsersRef = useRef({});
  const isLeavingRef = useRef(false);
  const voiceCleanupDoneRef = useRef(false);
  const isConnectedRef = useRef(false);
  const timerIntervalRef = useRef(null);

  const startGameTimer = () => {
    if (timerStartedRef.current) {
      return;
    }

    timerStartedRef.current = true;

    setTimeLeft(120);
    setTimerActive(true);
    setTimeWarning(false);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;

        if (newTime <= 30 && newTime > 0) {
          setTimeWarning(true);
        }

        if (newTime <= 0) {
          setTimerActive(false);
          setTimeWarning(false);

          handleTimeUp();

          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          return 0;
        }

        return newTime;
      });
    }, 1000);
  };

  const stopGameTimer = () => {
    setTimerActive(false);
    setTimeWarning(false);
    timerStartedRef.current = false;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleTimeUp = async () => {
    if (gameOver) return;

    let characterName = 'Unknown';
    let characterImage = '';

    try {
      const response = await api.get(`/team/room/${roomCode}`);
      if (response.data.success) {
        const roomData = response.data.room;
        if (roomData.gameData?.characterId) {
          const charResponse = await api.get(`/game/character/${roomData.gameData.characterId}`);
          if (charResponse.data.success) {
            characterName = charResponse.data.character.name;
            characterImage = charResponse.data.character.image || '';
          }
        }
      }
    } catch (error) {
      console.error('Error fetching character for time up:', error);
    }

    setGameOver(true);
    setResult({
      success: false,
      reason: 'timeout',
      character: characterName,
      image: characterImage,
      message: "⏰ Time's Up! You ran out of time!"
    });

    if (isMicOn) {
      await stopVoiceChat();
    }

    try {
      await api.post('/team/end-game', { roomCode });
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const cleanupVoice = async () => {
    if (voiceCleanupDoneRef.current) return;
    voiceCleanupDoneRef.current = true;

    try {
      if (clientRef.current) {
        try {
          clientRef.current.disableAudioVolumeIndicator();
        } catch (e) {}
      }

      if (localAudioTrackRef.current) {
        try {
          if (clientRef.current) {
            await clientRef.current.unpublish([localAudioTrackRef.current]);
          }
          localAudioTrackRef.current.close();
        } catch (e) {}
        localAudioTrackRef.current = null;
      }

      Object.values(remoteUsersRef.current).forEach(remoteData => {
        try {
          if (remoteData && remoteData.track) {
            remoteData.track.stop();
          }
        } catch (e) {}
      });
      remoteUsersRef.current = {};

      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch (e) {}
      }

      clientRef.current = null;
      setVoiceParticipants([]);
      setSpeakingUsers([]);
      setIsMicOn(false);
      isConnectedRef.current = false;
    } catch (error) {
      console.error('Error during voice cleanup:', error);
    }
  };

  const startVoiceChat = async () => {
    try {
      setMicError('');
      voiceCleanupDoneRef.current = false;
      isConnectedRef.current = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Your browser does not support microphone access');
        return;
      }

      const tokenResponse = await api.get(`/agora-token?channel=${roomCode}`);
      const { token, appId, uid } = tokenResponse.data;

      const client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
      });
      clientRef.current = client;

      client.on('connection-state-change', (curState) => {
        if (curState === 'CONNECTED') {
          isConnectedRef.current = true;
        }
        if (curState === 'DISCONNECTED') {
          setIsMicOn(false);
          isConnectedRef.current = false;
        }
      });

      client.on('user-published', async (remoteUser, mediaType) => {
        if (mediaType === 'audio') {
          try {
            await client.subscribe(remoteUser, mediaType);

            const audioTrack = remoteUser.audioTrack;
            if (audioTrack) {
              audioTrack.play();
              audioTrack.setVolume(isSpeakerOn ? 100 : 0);

              remoteUsersRef.current[remoteUser.uid] = {
                track: audioTrack,
                userId: remoteUser.uid
              };

              setVoiceParticipants(prev => {
                if (!prev.includes(remoteUser.uid)) {
                  return [...prev, remoteUser.uid];
                }
                return prev;
              });
            }
          } catch (error) {
            console.error('Error subscribing to remote audio:', error);
          }
        }
      });

      client.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'audio') {
          const remoteData = remoteUsersRef.current[remoteUser.uid];
          if (remoteData && remoteData.track) {
            remoteData.track.stop();
            delete remoteUsersRef.current[remoteUser.uid];
            setVoiceParticipants(prev => prev.filter(id => id !== remoteUser.uid));
          }
        }
      });

      client.on('user-left', (remoteUser) => {
        const remoteData = remoteUsersRef.current[remoteUser.uid];
        if (remoteData && remoteData.track) {
          remoteData.track.stop();
          delete remoteUsersRef.current[remoteUser.uid];
          setVoiceParticipants(prev => prev.filter(id => id !== remoteUser.uid));
        }
      });

      client.on('volume-indicator', (volumes) => {
        const speaking = [];
        volumes.forEach(volume => {
          if (volume.level > 5) {
            speaking.push(volume.uid);
          }
        });
        setSpeakingUsers(speaking);
      });

      await client.join(appId, roomCode, token, uid);

      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: {
          bitrate: 32000,
          codec: 'opus'
        }
      });
      localAudioTrackRef.current = localAudioTrack;

      client.enableAudioVolumeIndicator();

      await client.publish([localAudioTrack]);

      setIsMicOn(true);

      if (socketRef.current) {
        socketRef.current.emit('user-joined-voice', {
          roomCode,
          username: user.username
        });
      }
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      setMicError('Failed to start voice chat: ' + (error.message || 'Unknown error'));
      setIsMicOn(false);
    }
  };

  const stopVoiceChat = async () => {
    await cleanupVoice();
  };

  const toggleMic = () => {
    if (gameOver) {
      alert('Game is already over!');
      return;
    }
    if (isMicOn) {
      stopVoiceChat();
    } else {
      startVoiceChat();
    }
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);

    Object.values(remoteUsersRef.current).forEach(remoteData => {
      try {
        remoteData.track.setVolume(newState ? 100 : 0);
      } catch (e) {}
    });
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
          stopGameTimer();
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

  const handleLeave = async () => {
    isLeavingRef.current = true;

    stopGameTimer();
    await cleanupVoice();

    if (socketRef.current) {
      socketRef.current.emit('leave-team-room', roomCode);
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    navigate('/');
  };

  const handlePlayAgain = async () => {
    stopGameTimer();
    await cleanupVoice();
    navigate('/');
  };

  const handleGameStart = () => {
    setGameStarted(true);
  };

  const fetchRoomData = async () => {
    try {
      const response = await api.get(`/team/room/${roomCode}`);
      if (response.data.success) {
        const roomData = response.data.room;
        setRoom(roomData);
        setPlayers(roomData.players || []);
        setQuestionCount(roomData.gameData?.totalQuestions || 0);
        setMaxQuestions(roomData.gameData?.maxQuestions || 10);

        if (roomData.status === 'playing') {
          setGameStarted(true);
          if (!timerStartedRef.current && !gameOver) {
            startGameTimer();
          }
        }

        if (roomData.gameData?.questions) {
          setMessages(roomData.gameData.questions);
        }

        if (roomData.gameData?.isGuessed) {
          stopGameTimer();
          setGameOver(true);
          setResult({
            success: true,
            character: roomData.gameData.characterName,
            image: roomData.gameData.characterImage,
            players: roomData.players
          });
        }

        if (roomData.status === 'finished' && !roomData.gameData?.isGuessed) {
          stopGameTimer();
          setGameOver(true);
          setResult({
            success: false,
            reason: 'finished',
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
    if (!roomCode) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-team-room', roomCode);
    });

    socket.on('player-update', () => {
      fetchRoomData();
    });

    socket.on('game-started', () => {
      setGameStarted(true);
      if (!timerStartedRef.current && !gameOver) {
        startGameTimer();
      }
      fetchRoomData();
    });

    socket.on('user-joined-voice', () => {});
    socket.on('user-left-voice', () => {});
    socket.on('disconnect', () => {});

    return () => {
      isLeavingRef.current = true;
      stopGameTimer();
      cleanupVoice();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="team-game-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading room...</p>
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

  if (!gameStarted) {
    return (
      <div className="team-game-page lobby-view">
        <TeamLobby
          room={room}
          roomCode={roomCode}
          user={user}
          onLeave={handleLeave}
          onGameStart={handleGameStart}
          onRefresh={fetchRoomData}
        />
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
          <span className={`timer-display ${timeWarning ? 'warning' : ''} ${timeLeft <= 10 ? 'danger' : ''}`}>
            ⏱️ {formatTime(timeLeft)}
          </span>
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
              disabled={gameOver}
            >
              {isMicOn ? '🎤' : '🎤🔇'}
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
                {voiceParticipants.map(uid => (
                  <span
                    key={uid}
                    className={`participant-dot ${speakingUsers.includes(uid) ? 'speaking' : ''}`}
                    title={`Player ${uid} ${speakingUsers.includes(uid) ? '🔴 Speaking' : ''}`}
                  >
                    🟢
                  </span>
                ))}
              </span>
            )}
            {voiceParticipants.length > 0 && (
              <span className="voice-count">{voiceParticipants.length} 🎤</span>
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
              <p className="timer-info">⏱️ You have <strong>2 minutes</strong> to guess the character!</p>
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
          <div className={`team-game-result ${result.success ? 'success' : 'timeout'}`}>
            <div className="result-icon">
              {result.success ? '🎉' : '⏰'}
            </div>
            <h2>{result.success ? 'Team Guessed Correctly!' : "Time's Up!"}</h2>
            {!result.success && (
              <p className="timeout-message">⏰ You ran out of time!</p>
            )}
            <div className="character-name">{result.character}</div>
            {result.image && (
              <img src={result.image} alt={result.character} className="result-image" />
            )}
            {result.success && result.reward && (
              <div className="reward-text">🎴 Everyone gets {result.reward} Shards!</div>
            )}
            {result.success && result.players && (
              <div className="players-text">
                👥 {result.players?.map(p => p.username).join(', ')}
              </div>
            )}
            {!result.success && (
              <div className="timeout-text">
                <p>The character was <strong>{result.character}</strong></p>
                <p>Better luck next time! 🍀</p>
              </div>
            )}
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
        <span className="timer-info">⏱️ {formatTime(timeLeft)} remaining</span>
        {isMicOn && (
          <span className="voice-status active">
            🎤 Connected ({voiceParticipants.length} others)
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
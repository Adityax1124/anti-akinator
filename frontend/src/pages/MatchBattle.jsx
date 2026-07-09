import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import io from 'socket.io-client';
import MatchChat from '../components/MatchChat';
import './MatchBattle.css';

const FightAnimation = ({ playerCard, opponentCard, winner, onComplete, mySide }) => {
  const [stage, setStage] = useState('fly');
  const [sparkles, setSparkles] = useState([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const flyTimer = setTimeout(() => setStage('impact'), 900);
    const impactTimer = setTimeout(() => {
      setStage('result');
      setShowResult(true);
      const newSparkles = [];
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 180;
        newSparkles.push({
          id: i,
          x: 50 + Math.cos(angle) * distance,
          y: 50 + Math.sin(angle) * distance,
          delay: Math.random() * 0.35,
          size: 4 + Math.random() * 14
        });
      }
      setSparkles(newSparkles);
    }, 1500);
    const completeTimer = setTimeout(() => {
      setStage('complete');
      if (onComplete) onComplete();
    }, 3200);
    return () => {
      clearTimeout(flyTimer);
      clearTimeout(impactTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const isWinner = winner === mySide;
  const isDraw = winner === 'draw';

  return (
    <div className={`fight-modal-arena ${stage === 'impact' ? 'shaking' : ''}`}>
      <div className="fight-arena-glow"></div>
      <div className="fight-arena-rays"></div>

      <div className="fight-cards-container">
        <div className={`fight-card player-card ${stage === 'fly' ? 'flying' : ''} ${stage === 'impact' ? 'battle-impact' : ''} ${stage === 'result' ? (isWinner ? 'winner-card' : isDraw ? 'draw-card' : 'loser-card') : ''}`}>
          <div className="fight-card-trail player-trail"></div>
          <div className="fight-card-inner">
            {playerCard?.image ? (
              <img src={playerCard.image} alt={playerCard.characterName} className="fight-card-image" />
            ) : (
              <div className="fight-card-placeholder">{playerCard?.characterName?.charAt(0) || '?'}</div>
            )}
            <div className="fight-card-shine"></div>
          </div>
          <div className="fight-card-info">
            <span className="fight-card-name">{playerCard?.characterName || 'Your Card'}</span>
            <span className="fight-card-power">⚡{playerCard?.powerLevel || '?'}</span>
          </div>
          {stage === 'result' && isWinner && <div className="fight-card-crown">👑</div>}
        </div>

        {stage === 'impact' && (
          <>
            <div className="impact-shockwave ring-1"></div>
            <div className="impact-shockwave ring-2"></div>
            <div className="impact-shockwave ring-3"></div>
            <div className="lightning-bolt bolt-1">⚡</div>
            <div className="lightning-bolt bolt-2">⚡</div>
            <div className="vs-burst">VS</div>
          </>
        )}

        <div className={`fight-card opponent-card ${stage === 'fly' ? 'flying' : ''} ${stage === 'impact' ? 'battle-impact' : ''} ${stage === 'result' ? (!isWinner && !isDraw ? 'winner-card' : isDraw ? 'draw-card' : 'loser-card') : ''}`}>
          <div className="fight-card-trail opponent-trail"></div>
          <div className="fight-card-inner">
            {opponentCard?.image ? (
              <img src={opponentCard.image} alt={opponentCard.characterName} className="fight-card-image" />
            ) : (
              <div className="fight-card-placeholder">{opponentCard?.characterName?.charAt(0) || '?'}</div>
            )}
            <div className="fight-card-shine"></div>
          </div>
          <div className="fight-card-info">
            <span className="fight-card-name">{opponentCard?.characterName || 'Opponent'}</span>
            <span className="fight-card-power">⚡{opponentCard?.powerLevel || '?'}</span>
          </div>
          {stage === 'result' && !isWinner && !isDraw && <div className="fight-card-crown">👑</div>}
        </div>

        {sparkles.map(s => (
          <div
            key={s.id}
            className={`sparkle ${isDraw ? 'sparkle-draw' : isWinner ? 'sparkle-win' : 'sparkle-lose'}`}
            style={{
              '--tx': `${s.x - 50}px`,
              '--ty': `${s.y - 50}px`,
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`
            }}
          />
        ))}
      </div>

      {showResult && (
        <div className="fight-result-announcement">
          <div className={`fight-result-text ${isDraw ? 'draw' : (isWinner ? 'win' : 'lose')}`}>
            <span className="fight-result-shine"></span>
            {isDraw ? '⚖️ DRAW!' : (isWinner ? '🎉 YOU WIN!' : '💔 YOU LOSE!')}
          </div>
        </div>
      )}
    </div>
  );
};

const MatchBattle = () => {
  const { matchCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [mySide, setMySide] = useState(null);
  const [stolenCard, setStolenCard] = useState(null);
  const [showStealModal, setShowStealModal] = useState(false);
  const [availableCards, setAvailableCards] = useState([]);
  const [stealLoading, setStealLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);
  const [startLoading, setStartLoading] = useState(false);
  const [showFight, setShowFight] = useState(false);
  const [showFightModal, setShowFightModal] = useState(false);
  const [fightData, setFightData] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);

  useEffect(() => {
    if (!matchCode) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Battle socket connected:', socket.id);
      socket.emit('join-match-room', matchCode);
      setConnectionError(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnectionError(true);
    });

    socket.on('match-update', (data) => {
      console.log('📨 Match update:', data);
      fetchMatchState();
    });

    socket.on('match-started', (data) => {
      console.log('🎮 Match started:', data);
      fetchMatchState();
    });

    socket.on('round-revealed', (data) => {
      console.log('🎯 Round revealed:', data);
      fetchMatchState();
    });

    socket.on('opponent-left', (data) => {
      console.log('👋 Opponent left:', data);
      setSuccess(data.message);
      fetchMatchState();
      alert(`👋 ${data.message}`);
    });

    socket.on('match-ended-waiting-selection', (data) => {
      console.log('🏆 Match ended - Winner select card:', data);
      if (data.forfeit) {
        setSuccess(`🏆 ${data.winner} wins by forfeit! Select a card to steal.`);
      }
      setAvailableCards(data.availableCards || []);
      setShowStealModal(true);
      fetchMatchState();
    });

    socket.on('match-ended', (data) => {
      console.log('🏆 Match ended:', data);
      if (data.stolenCard) {
        setStolenCard(data.stolenCard);
      }
      setShowStealModal(false);
      fetchMatchState();
    });

    socket.on('match-chat-message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    // ✅ NEW: Match cancelled event
    socket.on('match-cancelled', (data) => {
      console.log('🚫 Match cancelled:', data);
      setSuccess(`⚠️ ${data.message || 'Match has been cancelled'}`);
      setTimeout(() => {
        navigate('/match');
      }, 2000);
    });

    fetchMatchState();

    const interval = setInterval(fetchMatchState, 3000);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      clearInterval(interval);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [matchCode]);

  const fetchMatchState = async () => {
    try {
      const response = await api.get(`/match/${matchCode}`);
      if (response.data.success) {
        const matchData = response.data.match;
        setMatch(matchData);
        setMySide(matchData.mySide);
        setTimeLeft(matchData.timeLeft || 0);
        
        setIsConfirmed(matchData.isConfirmed || false);
        setIsWaiting(matchData.isWaiting || false);

        console.log('🔍 [FETCH] matchData.myTeam length:', matchData.myTeam?.length || 0);
        console.log('🔍 [FETCH] isConfirmed:', matchData.isConfirmed);
        console.log('🔍 [FETCH] matchData.roundResult:', matchData.roundResult);

        if (matchData.isSelectingReward && matchData.isWinner) {
          setAvailableCards(matchData.availableCardsToSteal || []);
          setShowStealModal(true);
        }

        setLoading(false);
      }
    } catch (error) {
      console.error('Fetch match error:', error);
      if (error.response?.status === 404) {
        setError('Match not found');
      }
      setLoading(false);
    }
  };

  // ✅ Trigger fight modal when round result comes
  useEffect(() => {
    if (match?.status === 'round_result' && match.roundResult && match.roundResult.revealed) {
      const playerCard = match.roundResult.player1Card || null;
      const opponentCard = match.roundResult.player2Card || null;
      const winner = match.roundResult.winner;
      
      if (playerCard && opponentCard) {
        setFightData({ playerCard, opponentCard, winner });
        setShowFightModal(true);
        setShowFight(true);
      }
    }
  }, [match?.status, match?.roundResult]);

  useEffect(() => {
    if (timeLeft > 0 && match?.status === 'selecting' && !isConfirmed) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && match?.status === 'selecting' && !isConfirmed) {
      handleAutoConfirm();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, match?.status, isConfirmed]);

  const handleAutoConfirm = async () => {
    if (selectedIndex !== null) {
      await handleConfirmCard();
    }
  };

  const handleSelectCard = (index) => {
    if (match?.status !== 'selecting') return;
    if (match?.myTeam?.[index]?.used) return;
    if (isConfirmed) return;

    setSelectedIndex(index);
  };

  const handleConfirmCard = async () => {
    if (selectedIndex === null) {
      setError('Please select a card first!');
      return;
    }

    try {
      const response = await api.post('/match/confirm', {
        matchCode: matchCode,
        cardIndex: selectedIndex
      });

      if (response.data.success) {
        setSelectedIndex(null);
        setIsConfirmed(true);
        fetchMatchState();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to confirm card');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSelectForRound = async (index) => {
    if (match?.status !== 'selecting') return;

    try {
      const response = await api.post('/match/select', {
        matchCode: matchCode,
        cardIndex: index
      });

      if (response.data.success) {
        setSelectedIndex(index);
        fetchMatchState();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to select card');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleStartMatch = async () => {
    const userId = user?._id?.toString() || user?.id?.toString();
    
    let hostUserId = null;
    if (match?.player1?.user) {
      if (typeof match.player1.user === 'object' && match.player1.user !== null) {
        hostUserId = match.player1.user._id?.toString() || match.player1.user.id?.toString();
      } else if (typeof match.player1.user === 'string') {
        hostUserId = match.player1.user;
      }
    }
    
    const isUserHost = userId && hostUserId && userId === hostUserId;
    
    if (!isUserHost) {
      setError('Only the host can start the match!');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setStartLoading(true);
    try {
      const response = await api.post('/match/start', {
        matchCode: matchCode
      });
      if (response.data.success) {
        fetchMatchState();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to start match');
      setTimeout(() => setError(''), 3000);
    } finally {
      setStartLoading(false);
    }
  };

  const handleStealCard = async (index) => {
    setStealLoading(true);
    setError('');
    try {
      const response = await api.post('/match/steal', {
        matchCode: matchCode,
        cardIndex: index
      });

      if (response.data.success) {
        setStolenCard(response.data.stolenCard);
        setShowStealModal(false);
        setAvailableCards([]);
        fetchMatchState();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to steal card');
      setTimeout(() => setError(''), 3000);
    } finally {
      setStealLoading(false);
    }
  };

  // ============================================================
  // ✅ LEAVE MATCH (Forfeit + Cleanup)
  // ============================================================
  const handleLeave = async () => {
    if (isFinished) {
      if (socketRef.current) {
        socketRef.current.emit('leave-match-room', matchCode);
        socketRef.current.disconnect();
      }
      navigate('/match');
      return;
    }

    const confirmLeave = window.confirm(
      '⚠️ Are you sure you want to leave the match?\n\n' +
      'If you leave, you will LOSE the match and the opponent will get to steal one of your cards!\n\n' +
      'This action CANNOT be undone!'
    );

    if (!confirmLeave) return;

    setLeaveLoading(true);
    setError('');

    try {
      const response = await api.post('/match/leave', {
        matchCode: matchCode
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchMatchState();
        if (response.data.canSteal) {
          setAvailableCards(response.data.availableCards || []);
          setShowStealModal(true);
        }
        
        if (socketRef.current) {
          socketRef.current.emit('leave-match-room', matchCode);
          socketRef.current.disconnect();
        }
        
        setTimeout(() => {
          navigate('/match');
        }, 3000);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to leave match');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLeaveLoading(false);
    }
  };

  // ============================================================
  // ✅ CANCEL / DELETE MATCH (NEW)
  // ============================================================
  const handleCancelMatch = async () => {
    if (!matchCode) {
      setError('No active match to cancel');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // ✅ Confirmation dialog
    if (!window.confirm(
      '⚠️ Are you sure you want to CANCEL this match?\n\n' +
      'This will PERMANENTLY DELETE the match from the database.\n' +
      'Both players will be sent back to matchmaking.\n\n' +
      'This action CANNOT be undone!'
    )) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/match/cancel/${matchCode}`);
      
      if (response.data.success) {
        setSuccess('✅ Match cancelled and deleted successfully');
        
        // ✅ Notify via socket
        if (socketRef.current) {
          socketRef.current.emit('match-cancelled', {
            matchCode: matchCode,
            userId: user?._id
          });
          socketRef.current.emit('leave-match-room', matchCode);
          socketRef.current.disconnect();
        }
        
        // ✅ Navigate back to matchmaking
        setTimeout(() => {
          navigate('/match');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Failed to cancel match:', error);
      setError(error.response?.data?.message || 'Failed to cancel match');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = (message) => {
    if (socketRef.current && matchCode) {
      socketRef.current.emit('match-chat-message', {
        matchCode,
        username: user?.username || 'Player',
        message,
        userId: user?._id
      });
      setChatMessages(prev => [...prev, {
        username: user?.username || 'Player',
        message,
        userId: user?._id,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  if (loading) {
    return (
      <div className="battle-container premium-bg">
        <div className="battle-loading">
          <div className="battle-loader"></div>
          <p>Loading battle...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="battle-container premium-bg">
        <div className="battle-error premium-card">
          <h2>❌ {error || 'Match not found'}</h2>
          <button className="btn-leave" onClick={handleLeave}>Go Back</button>
        </div>
      </div>
    );
  }

  const isFinished = match.status === 'finished';
  const canSteal = match.isSelectingReward && match.isWinner;
  const currentRoundResult = match.roundResult;
  const isDraw = currentRoundResult?.winner === 'draw';
  const isForfeit = match.forfeit || false;
  const forfeitBy = match.forfeitBy || null;

  let hostUserId = null;
  if (match?.player1?.user) {
    if (typeof match.player1.user === 'object' && match.player1.user !== null) {
      hostUserId = match.player1.user._id?.toString() || match.player1.user.id?.toString();
    } else if (typeof match.player1.user === 'string') {
      hostUserId = match.player1.user;
    }
  }
  const userId = user?._id?.toString() || user?.id?.toString();
  const isUserHost = userId && hostUserId && userId === hostUserId;

  console.log('🔍 [RENDER] mySide:', mySide);
  console.log('🔍 [RENDER] match.myTeam length:', match.myTeam?.length || 0);
  console.log('🔍 [RENDER] isConfirmed:', isConfirmed);
  console.log('🔍 [RENDER] currentRoundResult:', currentRoundResult);

  if (isWaiting) {
    return (
      <div className="battle-container premium-bg">
        <div className="battle-lobby premium-card">
          <div className="lobby-header">
            <div className="lobby-icon">🏠</div>
            <h2>Match Lobby</h2>
            <p className="lobby-code">Code: <span className="code-highlight">{matchCode}</span></p>
          </div>

          <div className="lobby-players">
            <div className="lobby-player host-player">
              <span className="player-status host">👑 Host</span>
              <span className="player-name">{match.player1.username}</span>
              <span className="player-ready">✅ Ready</span>
            </div>
            <div className="lobby-vs">⚔️</div>
            <div className={`lobby-player ${!match.player2.username ? 'empty' : ''}`}>
              <span className="player-status">{match.player2.username ? '🟢 Player' : '⏳ Waiting'}</span>
              <span className="player-name">{match.player2.username || 'Waiting for opponent...'}</span>
              <span className="player-ready">{match.player2.username ? '✅ Ready' : '⏳...'}</span>
            </div>
          </div>

          <div className="lobby-actions">
            {isUserHost ? (
              <button 
                className="btn-start-match premium-btn"
                onClick={handleStartMatch}
                disabled={!match.player2.user || startLoading}
              >
                {startLoading ? 'Starting...' : 
                 match.player2.user ? '⚔️ Start Battle' : 
                 '⏳ Waiting for opponent...'}
              </button>
            ) : (
              <div className="waiting-message-lobby">
                <span>⏳ Waiting for <strong>{match.player1.username}</strong> to start the match...</span>
              </div>
            )}
            <button className="btn-leave-lobby" onClick={handleLeave}>
              Leave
            </button>
          </div>

          {isUserHost && match.player2.username && (
            <p className="lobby-ready-text host-ready">
              🎯 Both players are ready! Click <strong>"Start Battle"</strong> to begin.
            </p>
          )}
          {isUserHost && !match.player2.username && (
            <p className="lobby-ready-text waiting">
              ⏳ Share the match code with your friend to join.
            </p>
          )}
          {!isUserHost && match.player2.username && (
            <p className="lobby-ready-text player-waiting">
              ⏳ Waiting for <strong>{match.player1.username}</strong> to start the battle...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="battle-container premium-bg">
      {/* ===== FIGHT MODAL ===== */}
      {showFightModal && fightData && (
        <div className="fight-modal-overlay">
          <div className="fight-modal-content">
            <FightAnimation 
              playerCard={fightData.playerCard}
              opponentCard={fightData.opponentCard}
              winner={fightData.winner}
              mySide={mySide}
              onComplete={() => {
                setTimeout(() => {
                  setShowFightModal(false);
                  setShowFight(false);
                  setFightData(null);
                }, 500);
              }}
            />
          </div>
        </div>
      )}

      {/* ===== STEAL MODAL ===== */}
      {showStealModal && canSteal && (
        <div className="steal-modal-overlay">
          <div className="steal-modal premium-card">
            <div className="steal-modal-header">
              <div className="steal-icon">🎯</div>
              <h2>Select a Card to Steal!</h2>
              {isForfeit && <p className="steal-subtitle" style={{ color: '#ffd700' }}>⚡ Opponent forfeited! Choose a card to steal.</p>}
              <p className="steal-subtitle">
                Choose any card from <strong>Opponent</strong>'s team
              </p>
            </div>

            {error && <div className="steal-error">{error}</div>}

            <div className="steal-cards-grid">
              {availableCards.map((card, index) => (
                <div
                  key={index}
                  className={`steal-card ${card.used ? 'used' : ''}`}
                  onClick={() => !stealLoading && handleStealCard(index)}
                >
                  <div className="steal-card-image">
                    {card.image ? (
                      <img src={card.image} alt={card.characterName} />
                    ) : (
                      <div className="steal-card-placeholder">
                        {card.characterName?.charAt(0) || '?'}
                      </div>
                    )}
                    {card.used && (
                      <div className="steal-card-used-badge">Used</div>
                    )}
                  </div>
                  <div className="steal-card-info">
                    <span className="steal-card-name">{card.characterName}</span>
                    <span className="steal-card-power">⚡{card.powerLevel}</span>
                  </div>
                  {!card.used && !stealLoading && (
                    <div className="steal-card-hover">Click to Steal</div>
                  )}
                  {stealLoading && (
                    <div className="steal-card-loading">⏳</div>
                  )}
                </div>
              ))}
            </div>

            <div className="steal-modal-footer">
              <p className="steal-hint">💡 Choose wisely! You can only steal one card.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div className="battle-header">
        {/* ✅ CANCEL MATCH BUTTON */}
        <button 
          className="btn-cancel-match" 
          onClick={handleCancelMatch} 
          disabled={loading || isFinished}
          style={{
            background: 'rgba(255,0,0,0.15)',
            border: '1px solid rgba(255,0,0,0.3)',
            color: '#ff6b6b',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          {loading ? '⏳ Cancelling...' : '🚫 Cancel Match'}
        </button>

        <button className="btn-leave" onClick={handleLeave} disabled={leaveLoading}>
          {leaveLoading ? '⏳' : '🚪 Leave'}
        </button>

        <div className="battle-info">
          <span className="battle-code">{matchCode}</span>
          <span className="battle-round">Round {match.currentRound} / {match.maxRounds}</span>
          {isForfeit && (
            <span className="forfeit-badge" style={{ color: '#ff6b6b', fontWeight: 'bold', marginLeft: '10px' }}>
              ⚠️ {forfeitBy === mySide ? 'You forfeited' : 'Opponent forfeited'}
            </span>
          )}
        </div>

        <div className="battle-timer">
          <span className="timer-icon">⏱️</span>
          <span className={`timer-text ${timeLeft <= 5 ? 'danger' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* ===== SCOREBOARD ===== */}
      <div className="scoreboard premium-card">
        <div className="score-player">
          <span className="score-name">{match.player1.username}</span>
          <span className={`score-value ${mySide === 'player1' ? 'highlight' : ''}`}>
            {match.player1.score}
          </span>
        </div>
        <div className="score-vs">⚔️</div>
        <div className="score-player">
          <span className={`score-value ${mySide === 'player2' ? 'highlight' : ''}`}>
            {match.player2.score}
          </span>
          <span className="score-name">{match.player2.username}</span>
        </div>
      </div>

      {/* ===== FORFEIT ANNOUNCEMENT ===== */}
      {isForfeit && !isFinished && (
        <div className="forfeit-announcement premium-card" style={{ textAlign: 'center', padding: '1rem', borderColor: 'rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.05)' }}>
          <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
            ⚠️ {forfeitBy === mySide ? 'You left the match! You lose by forfeit.' : 'Opponent left the match! You win by forfeit!'}
          </p>
        </div>
      )}

      {/* ===== STOLEN CARD ===== */}
      {isFinished && stolenCard && (
        <div className="stolen-card-announcement premium-card">
          <div className="stolen-icon">🎯</div>
          <div className="stolen-content">
            <h3>Card Stolen!</h3>
            <p>
              <strong>{stolenCard.toUsername}</strong> stole
              <strong> {stolenCard.characterName}</strong> from
              <strong> {stolenCard.fromUsername}</strong>
            </p>
            {isForfeit && <p style={{ color: '#ffd700', fontSize: '0.85rem' }}>⚡ Won by forfeit!</p>}
            <div className="stolen-card-preview">
              <span className="stolen-card-name">{stolenCard.characterName}</span>
              <span className="stolen-card-power">⚡{stolenCard.powerLevel}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== GAME OVER ===== */}
      {isFinished && (
        <div className="game-over premium-card">
          <div className="game-over-icon">{isForfeit ? '⚔️' : '🏆'}</div>
          <h2>
            {match.winner === user?._id ? '🎉 You Won!' :
             match.winner === 'Draw' ? '⚖️ Draw!' :
             ` ${match.winnerUsername} Won!`}
          </h2>
          {isForfeit && <p style={{ color: '#ffd700' }}>⚡ Won by forfeit!</p>}
          <p className="final-score">
            {match.player1.username} {match.player1.score} - {match.player2.score} {match.player2.username}
          </p>
          {match.stolenCard && (
            <p className="stolen-info">
              🎯 {match.stolenCard.toUsername} stole {match.stolenCard.characterName}
            </p>
          )}
          <button className="btn-play-again" onClick={handleLeave}>
            🔄 Return to Arena
          </button>
        </div>
      )}

      {/* ===== YOUR TEAM CARDS ===== */}
      {!isFinished && match && match.myTeam && match.myTeam.length > 0 && (
        <div className="cards-grid-container">
          <div className="cards-section">
            <h4 className="cards-title">
              <span>🃏 Your Team</span>
              <span className="cards-used">{match.myTeam?.filter(c => c.used).length || 0}/10 used</span>
            </h4>
            <div className="cards-grid">
              {match.myTeam.map((card, index) => {
                let isRevealing = false;
                let isWinner = false;
                let isLoser = false;
                
                if (currentRoundResult && currentRoundResult.revealed) {
                  if (card.used) {
                    let myCardIndex = null;
                    if (mySide === 'player1') {
                      myCardIndex = currentRoundResult.player1CardIndex;
                    } else if (mySide === 'player2') {
                      myCardIndex = currentRoundResult.player2CardIndex;
                    }
                    
                    const isMyCard = myCardIndex === index;
                    
                    if (isMyCard) {
                      isRevealing = true;
                      if (currentRoundResult.winner === mySide) {
                        isWinner = true;
                      } else if (currentRoundResult.winner !== 'draw') {
                        isLoser = true;
                      }
                    }
                  }
                }
                
                const delayClass = `delay-${(index % 3) + 1}`;

                return (
                  <div
                    key={index}
                    className={`battle-card ${card.used ? 'used' : ''}
                      ${selectedIndex === index ? 'selected' : ''}
                      ${isConfirmed ? 'confirmed' : ''}
                      ${isRevealing ? `revealing ${delayClass}` : ''}
                      ${isWinner ? 'winner' : ''}
                      ${isLoser ? 'loser' : ''}
                      ${card.won === true ? 'won' : ''}
                      ${card.won === false ? 'lost' : ''}
                      ${match.status === 'selecting' && !card.used && !isConfirmed ? 'clickable' : ''}`}
                    onClick={() => {
                      if (match.status === 'selecting' && !card.used && !isConfirmed) {
                        handleSelectForRound(index);
                      }
                    }}
                  >
                    <div className="card-flip-container">
                      <div className="card-flip-inner flipped">
                        <div className="card-front">
                          <span className="card-question-mark">❓</span>
                        </div>
                        <div className="card-back">
                          {card.image ? (
                            <img 
                              src={card.image} 
                              alt={card.characterName} 
                              className="card-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = e.target.parentElement?.querySelector('.card-placeholder-fallback');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="card-placeholder-fallback" 
                            style={{ 
                              display: card.image ? 'none' : 'flex',
                              width: '100%',
                              height: '100%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '2rem',
                              fontWeight: '700',
                              color: 'rgba(255,255,255,0.05)',
                              background: 'linear-gradient(135deg, #1a1a3e, #2d2d5e)',
                              minHeight: '80px'
                            }}
                          >
                            {card.characterName?.charAt(0) || '?'}
                          </div>
                          {isRevealing && isWinner && (
                            <div className="card-result-badge">✅</div>
                          )}
                          {isRevealing && isLoser && (
                            <div className="card-result-badge">❌</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="card-info">
                      <span className="card-name">{card.characterName}</span>
                      <span className="card-power">⚡{card.powerLevel}</span>
                    </div>
                    {card.used && card.roundUsed && (
                      <div className="card-round-badge">R{card.roundUsed}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {match.status === 'selecting' && !isConfirmed && (
              <div className="action-area">
                <button
                  className="btn-confirm-card premium-btn"
                  onClick={handleConfirmCard}
                  disabled={selectedIndex === null}
                >
                  {selectedIndex !== null ? '✅ Confirm Selection' : 'Select a card first'}
                </button>
                {selectedIndex !== null && (
                  <p className="selected-hint">
                    Selected: {match.myTeam[selectedIndex]?.characterName} (⚡{match.myTeam[selectedIndex]?.powerLevel})
                  </p>
                )}
              </div>
            )}

            {isConfirmed && match.status === 'selecting' && (
              <div className="waiting-message">
                <span className="waiting-icon">⏳</span>
                <span>Waiting for opponent...</span>
              </div>
            )}

            {match.status !== 'selecting' && !isFinished && match.status !== 'round_result' && (
              <div className="waiting-message">
                <span className="waiting-icon">⏳</span>
                <span>Processing...</span>
              </div>
            )}

            {match.status === 'round_result' && (
              <div className="waiting-message">
                <span className="waiting-icon">🎯</span>
                <span>Round result! Next round starting soon...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== VS SEPARATOR (Only when no fight) ===== */}
      {!showFightModal && !isFinished && match?.status !== 'finished' && (
        <div className="battle-vs-separator">
          <div className="vs-line"></div>
          <div className="vs-center">⚔️ VS ⚔️</div>
          <div className="vs-line"></div>
        </div>
      )}

      {/* ===== EMPTY STATE ===== */}
      {!isFinished && (!match || !match.myTeam || match.myTeam.length === 0) && (
        <div className="cards-empty-state">
          <p>🃏 No cards in your team yet.</p>
          <p>Please select 10 cards for battle.</p>
        </div>
      )}

      {/* ===== OPPONENT CARDS ===== */}
      {!isFinished && match && match.opponentTeam && match.opponentTeam.length > 0 && (
        <div className="opponent-section premium-card">
          <h4 className="cards-title">
            <span>👤 Opponent's Team</span>
            <span className="cards-used">{match.opponentTeam?.filter(c => c.used).length || 0}/10 used</span>
          </h4>
          <div className="opponent-cards-grid">
            {match.opponentTeam.map((card, index) => (
              <div
                key={index}
                className={`opponent-card ${card.used ? 'used' : ''}`}
              >
                <div className="card-image-wrapper">
                  {card.used ? (
                    <div className="card-used-opponent">
                      <span>{card.won === true ? '✅' : card.won === false ? '❌' : '⚡'}</span>
                    </div>
                  ) : (
                    <div className="card-hidden">🔒</div>
                  )}
                </div>
                <div className="card-info">
                  <span className="card-name">{card.used ? card.characterName : '???'}</span>
                  <span className="card-power">{card.used ? `⚡${card.powerLevel}` : '⚡??'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ROUND HISTORY ===== */}
      <div className="round-history premium-card">
        <h4 className="history-title">📜 Round History</h4>
        <div className="history-grid">
          {match.roundHistory?.map((round, index) => (
            <div key={index} className={`history-item ${round.winner === mySide ? 'win' : round.winner === 'draw' ? 'draw' : 'lose'}`}>
              <span className="history-round">#{round.round}</span>
              <span className="history-result">
                {round.winner === mySide ? '✅' :
                 round.winner === 'draw' ? '⚖️' : '❌'}
              </span>
              {round.revealed && (
                <span className="history-powers">
                  {round.player1Power} ⚡ vs ⚡ {round.player2Power}
                </span>
              )}
            </div>
          ))}
        </div>
        {match.roundHistory?.length === 0 && (
          <p className="history-empty">No rounds played yet</p>
        )}
      </div>

      {/* ===== CHAT ===== */}
      <MatchChat
        matchCode={matchCode}
        user={user}
        onSendMessage={handleSendChat}
        messages={chatMessages}
      />
    </div>
  );
};

export default MatchBattle;
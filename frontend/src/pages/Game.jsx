import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import './Game.css';

// ===== Buy Shards Modal Component =====
const BuyShardsModal = ({ isOpen, onClose, onPurchaseComplete, currentShards }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const shardPackages = [
    { id: 1, shards: 50, price: 35, label: 'Starter', hints: 1 },
    { id: 2, shards: 150, price: 105, label: 'Enthusiast', hints: 3 },
    { id: 3, shards: 350, price: 210, label: 'Pro', hints: 7 },
    { id: 4, shards: 750, price: 375, label: 'Popular', hints: 15 },
    { id: 5, shards: 1500, price: 750, label: 'Ultimate', hints: 30 },
    { id: 6, shards: 3000, price: 1350, label: 'Legendary', hints: 60 },
  ];

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedPackage) {
      setError('Please select a shard package');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/payment/create-order', {
        amount: selectedPackage.price * 100,
        shards: selectedPackage.shards,
        packageId: selectedPackage.id
      });

      const { orderId, amount, currency } = response.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: 'Anti-Akinator',
        description: `Buy ${selectedPackage.shards} Shards (${selectedPackage.hints} Hints)`,
        order_id: orderId,
        handler: async function (paymentResponse) {
          setLoading(false);
          setSuccess(`✅ Successfully purchased ${selectedPackage.shards} Shards!`);

          try {
            await api.post('/payment/verify', {
              orderId: orderId,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              shards: selectedPackage.shards
            });

            onPurchaseComplete(selectedPackage.shards);
            
            setTimeout(() => {
              onClose();
              setSuccess('');
              setSelectedPackage(null);
            }, 2000);
          } catch (verifyError) {
            console.error('Payment verification failed:', verifyError);
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: localStorage.getItem('username') || '',
          email: localStorage.getItem('email') || '',
        },
        theme: {
          color: '#6c63ff'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2>💎 Buy Shards</h2>
        <p className="modal-subtitle">Current Shards: <strong>{currentShards}</strong></p>
        
        <div className="shard-packages">
          {shardPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`shard-package ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
              onClick={() => setSelectedPackage(pkg)}
            >
              <div className="shard-amount">{pkg.shards}</div>
              <div className="shard-label">{pkg.label}</div>
              <div className="shard-hints">💡 {pkg.hints} Hints</div>
              <div className="shard-price">₹{pkg.price}</div>
            </div>
          ))}
        </div>

        {error && <div className="modal-error">{error}</div>}
        {success && <div className="modal-success">{success}</div>}

        <button
          className="btn btn-primary purchase-btn"
          onClick={handlePurchase}
          disabled={!selectedPackage || loading}
        >
          {loading ? 'Processing...' : `Buy ${selectedPackage?.shards || ''} Shards`}
        </button>

        <p className="modal-footer">🔒 Secure payment via Razorpay</p>
      </div>
    </div>
  );
};

// ===== MAIN GAME COMPONENT =====
const Game = () => {
  const [gameState, setGameState] = useState({
    gameId: null,
    status: 'idle',
    questions: [],
    questionCount: 0,
    remainingGuesses: 3,
    remainingQuestions: 10,
    character: null,
    characterImage: null,
    loading: false
  });
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const [showGuessInput, setShowGuessInput] = useState(false);
  const [error, setError] = useState('');
  const [unlockNotifications, setUnlockNotifications] = useState([]);
  const [currentUnlockIndex, setCurrentUnlockIndex] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');
  const [shards, setShards] = useState(0);
  const messagesEndRef = useRef(null); // ← ADD THIS REF
  const navigate = useNavigate();
  const location = useLocation();

  // ===== Buy Shards Modal State =====
  const [isBuyShardsOpen, setIsBuyShardsOpen] = useState(false);
  
  // Track if game has already ended
  const hasEnded = useRef(false);
  // Track if user has been warned
  const hasWarned = useRef(false);
  // Track if user is navigating away
  const isNavigating = useRef(false);
  // Store previous path to detect navigation
  const prevPathRef = useRef(location.pathname);
  // Track if payment modal is open
  const isPaymentModalOpen = useRef(false);

  // ===== FETCH SHARDS =====
  useEffect(() => {
    fetchUserShards();
  }, []);

  const fetchUserShards = async () => {
    try {
      const response = await api.get('/auth/me');
      setShards(response.data.user.shards || 0);
    } catch (error) {
      console.error('Failed to fetch shards:', error);
    }
  };

  // ===== SCROLL TO BOTTOM (Only scrolls the chat messages container) =====
  const scrollToBottom = () => {
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  // ===== AUTO-SCROLL TO BOTTOM WHEN NEW MESSAGES ARRIVE =====
  useEffect(() => {
    scrollToBottom();
  }, [gameState.questions, gameState.loading]);

  // ===== UPDATE SHARDS AFTER PURCHASE =====
  const handleShardPurchase = (newShards) => {
    setShards(prev => prev + newShards);
    setError('');
  };

  // ===== HANDLE GAME ABANDON =====
  const handleGameAbandon = async () => {
    if (hasEnded.current) return;
    if (!gameState.gameId) return;
    if (gameState.status !== 'playing') return;

    hasEnded.current = true;

    try {
      console.log('🏳️ Abandoning game with gameId:', gameState.gameId);
      
      await api.post('/game/giveup', {
        gameId: gameState.gameId
      });
      
      setGameState(prev => ({
        ...prev,
        status: 'lost',
        character: 'Unknown',
        questions: [...prev.questions, {
          type: 'system',
          text: '💔 You left the game! Your streak has been reset.'
        }]
      }));
      
      console.log('🏳️ Game abandoned - streak reset');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('ℹ️ Game already ended, ignoring abandon');
        return;
      }
      console.error('Error abandoning game:', error);
    }
  };

  // ===== DETECT NAVIGATION AWAY (with payment modal check) =====
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    hasEnded.current = false;
    hasWarned.current = false;
    isNavigating.current = false;
    prevPathRef.current = location.pathname;

    if (prevPathRef.current === '/game' && location.pathname !== '/game' && location.pathname !== '') {
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (isPaymentModalOpen.current) {
          console.log('ℹ️ Payment modal open - ignoring navigation away');
          return;
        }
        
        if (!hasWarned.current) {
          hasWarned.current = true;
          const confirmLeave = window.confirm('⚠️ If you leave now, your streak will be reset! Click OK to leave or Cancel to stay.');
          if (confirmLeave) {
            handleGameAbandon();
          } else {
            hasWarned.current = false;
            navigate('/game');
          }
        } else {
          handleGameAbandon();
        }
      }
    }
    
    prevPathRef.current = location.pathname;
  }, [location.pathname, gameState.status]);

  // ===== DETECT PAGE LEAVE (with payment modal check) =====
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    hasEnded.current = false;
    hasWarned.current = false;
    isNavigating.current = false;

    const handleVisibilityChange = () => {
      if (isPaymentModalOpen.current) {
        console.log('ℹ️ Payment modal open - ignoring visibility change');
        return;
      }
      
      if (document.hidden && gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
          alert('⚠️ You switched to another tab! If you leave again, your streak will be reset!');
        } else {
          handleGameAbandon();
        }
      }
    };

    const handleBeforeUnload = (e) => {
      if (isPaymentModalOpen.current) {
        console.log('ℹ️ Payment modal open - ignoring beforeunload');
        return;
      }
      
      if (gameState.status === 'playing' && !hasEnded.current) {
        e.preventDefault();
        e.returnValue = '⚠️ If you leave now, your streak will be reset! Are you sure?';
        handleGameAbandon();
        return e.returnValue;
      }
    };

    const handlePageHide = () => {
      if (isPaymentModalOpen.current) {
        console.log('ℹ️ Payment modal open - ignoring pagehide');
        return;
      }
      
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
        } else {
          handleGameAbandon();
        }
      }
    };

    const handleFreeze = () => {
      if (isPaymentModalOpen.current) {
        console.log('ℹ️ Payment modal open - ignoring freeze');
        return;
      }
      
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
        } else {
          handleGameAbandon();
        }
      }
    };

    const handlePopState = () => {
      if (isPaymentModalOpen.current) {
        console.log('ℹ️ Payment modal open - ignoring popstate');
        return;
      }
      
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
          const confirmLeave = window.confirm('⚠️ If you leave now, your streak will be reset! Click OK to leave or Cancel to stay.');
          if (confirmLeave) {
            handleGameAbandon();
          } else {
            hasWarned.current = false;
            window.history.pushState(null, '', '/game');
          }
        } else {
          handleGameAbandon();
        }
      }
    };

    window.history.pushState(null, '', '/game');

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('freeze', handleFreeze);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('freeze', handleFreeze);
    };
  }, [gameState.status, gameState.gameId]);

  // ===== CLEANUP ON UNMOUNT =====
  useEffect(() => {
    return () => {
      if (gameState.status === 'playing' && !hasEnded.current && !isPaymentModalOpen.current) {
        handleGameAbandon();
      }
    };
  }, [gameState.status]);

  // ===== HANDLE NAVIGATION AWAY FROM RESULT =====
  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
      hasEnded.current = true;
    }
  }, [gameState.status]);

  // ===== START GAME =====
  const startGame = async () => {
    setError('');
    setGameState(prev => ({ ...prev, loading: true }));
    hasEnded.current = false;
    hasWarned.current = false;
    isNavigating.current = false;
    isPaymentModalOpen.current = false;

    try {
      await fetchUserShards();
      
      const response = await api.post('/game/start');
      
      setGameState({
        gameId: response.data.gameId,
        status: 'playing',
        questions: [],
        questionCount: 0,
        remainingGuesses: 3,
        remainingQuestions: 10,
        character: null,
        characterImage: null,
        loading: false
      });
      setHintUsed(false);
      setHintText('');
      setError('');
    } catch (error) {
      setError('Failed to start game. Please try again.');
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  // ===== OPEN BUY SHARDS MODAL =====
  const openBuyShardsModal = () => {
    isPaymentModalOpen.current = true;
    setIsBuyShardsOpen(true);
  };

  // ===== CLOSE BUY SHARDS MODAL =====
  const closeBuyShardsModal = () => {
    isPaymentModalOpen.current = false;
    setIsBuyShardsOpen(false);
  };

  // ===== ASK QUESTION =====
  const askQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || gameState.status !== 'playing' || gameState.loading) return;
    if (gameState.remainingQuestions <= 0) {
      setError('You have used all 10 questions! Time to guess.');
      return;
    }

    setError('');
    setGameState(prev => ({ ...prev, loading: true }));

    const userQuestion = question.trim();
    setQuestion('');
    setGameState(prev => ({
      ...prev,
      questions: [...prev.questions, { type: 'user', text: userQuestion }]
    }));

    try {
      const response = await api.post('/game/question', {
        gameId: gameState.gameId,
        question: userQuestion
      });

      setGameState(prev => ({
        ...prev,
        questions: [...prev.questions, { 
          type: 'ai', 
          text: response.data.answer,
          questionCount: response.data.questionCount
        }],
        questionCount: response.data.questionCount,
        remainingQuestions: 10 - response.data.questionCount,
        loading: false
      }));
    } catch (error) {
      if (error.response?.data?.limitReached) {
        setError('You have used all 10 questions! Time to guess.');
        setGameState(prev => ({ ...prev, loading: false }));
      } else {
        setError('Failed to get answer. Please try again.');
        setGameState(prev => ({ ...prev, loading: false }));
      }
    }
  };

  // ===== USE HINT =====
  const useHint = async () => {
    if (hintUsed || gameState.status !== 'playing') return;

    try {
      const response = await api.post('/game/hint', {
        gameId: gameState.gameId
      });

      if (response.data.success) {
        setHintUsed(true);
        setHintText(response.data.hint);
        setShards(response.data.shards);
        
        setGameState(prev => ({
          ...prev,
          questions: [...prev.questions, {
            type: 'hint',
            text: `💡 Hint: ${response.data.hint}`
          }]
        }));
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to use hint');
    }
  };

  // ===== MAKE GUESS =====
  const makeGuess = async (e) => {
    e.preventDefault();
    
    if (!guess.trim()) {
      setError('Please enter a guess!');
      return;
    }
    
    if (gameState.status !== 'playing') {
      setError('Game is not active!');
      return;
    }
    
    if (gameState.loading) return;

    if (!gameState.gameId) {
      setError('No active game found. Please start a new game.');
      return;
    }

    setError('');
    setGameState(prev => ({ ...prev, loading: true }));

    try {
      const response = await api.post('/game/guess', {
        gameId: gameState.gameId,
        guess: guess.trim()
      });

      if (response.data.isCorrect) {
        setGameState(prev => ({
          ...prev,
          status: 'won',
          character: response.data.character,
          characterImage: response.data.image || null,
          loading: false
        }));
        setGuess('');
        setShowGuessInput(false);

        if (response.data.unlockedItems && response.data.unlockedItems.length > 0) {
          setUnlockNotifications(response.data.unlockedItems);
          setCurrentUnlockIndex(0);
        }
        if (response.data.shards !== undefined) {
          setShards(response.data.shards);
        }
      } else if (response.data.gameOver) {
        setGameState(prev => ({
          ...prev,
          status: 'lost',
          character: response.data.character,
          characterImage: response.data.image || null,
          loading: false
        }));
        setGuess('');
        setShowGuessInput(false);
      } else {
        setGameState(prev => ({
          ...prev,
          remainingGuesses: response.data.remainingGuesses,
          loading: false,
          questions: [...prev.questions, {
            type: 'system',
            text: response.data.message
          }]
        }));
        setGuess('');
      }
    } catch (error) {
      console.error('Guess error:', error);
      if (error.response?.status === 400) {
        setError(error.response?.data?.message || 'Invalid guess. Please try again.');
      } else if (error.response?.status === 404) {
        setError('Game not found. Please start a new game.');
        setGameState(prev => ({ ...prev, status: 'idle', gameId: null }));
      } else {
        setError('Failed to make guess. Please try again.');
      }
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  // ===== GIVE UP =====
  const giveUp = async () => {
    if (!window.confirm('Are you sure you want to give up?')) return;

    try {
      const response = await api.post('/game/giveup', {
        gameId: gameState.gameId
      });

      setGameState(prev => ({
        ...prev,
        status: 'lost',
        character: response.data.character,
        characterImage: response.data.image || null,
        questions: [...prev.questions, {
          type: 'system',
          text: `💔 ${response.data.message}`
        }]
      }));
    } catch (error) {
      setError('Failed to give up. Please try again.');
    }
  };

  // ===== CLOSE UNLOCK POPUP =====
  const closeUnlockPopup = () => {
    if (currentUnlockIndex < unlockNotifications.length - 1) {
      setCurrentUnlockIndex(prev => prev + 1);
    } else {
      setUnlockNotifications([]);
      setCurrentUnlockIndex(0);
    }
  };

  // ===== PLAY AGAIN =====
  const playAgain = () => {
    setGameState({
      gameId: null,
      status: 'idle',
      questions: [],
      questionCount: 0,
      remainingGuesses: 3,
      remainingQuestions: 10,
      character: null,
      characterImage: null,
      loading: false
    });
    setQuestion('');
    setGuess('');
    setShowGuessInput(false);
    setError('');
    setUnlockNotifications([]);
    setCurrentUnlockIndex(0);
    setHintUsed(false);
    setHintText('');
    hasEnded.current = false;
    hasWarned.current = false;
    isNavigating.current = false;
    isPaymentModalOpen.current = false;
  };

  // ===== GO HOME =====
  const goHome = () => {
    navigate('/');
  };

  const currentUnlock = unlockNotifications[currentUnlockIndex] || null;

  // ===== RENDER IDLE =====
  if (gameState.status === 'idle') {
    return (
      <div className="game-container fade-in">
        <div className="game-start">
          <div className="game-start-content">
            <h1>🎯 Ready to Play?</h1>
            <p>AI will pick a secret anime character. You ask questions and guess!</p>
            <p className="game-hint">💡 You have 3 wrong guesses before game over</p>
            <p className="game-hint">📝 You have 10 questions per game</p>
            <p className="game-hint">🎴 You have {shards} Shards</p>
            <p className="game-hint-warning">⚠️ If you leave the game, your streak will be reset!</p>
            <button
              className="btn btn-primary start-btn"
              onClick={startGame}
              disabled={gameState.loading}
            >
              {gameState.loading ? 'Starting...' : 'Start New Game 🚀'}
            </button>
            {error && <div className="game-error">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER GAME =====
  return (
    <div className="game-container fade-in">
      {/* ===== BUY SHARDS MODAL ===== */}
      <BuyShardsModal
        isOpen={isBuyShardsOpen}
        onClose={closeBuyShardsModal}
        onPurchaseComplete={handleShardPurchase}
        currentShards={shards}
      />

      {currentUnlock && (
        <div className="unlock-popup">
          <div className="unlock-popup-content">
            <h2>
              {currentUnlock.type === 'banner' && '🎨 New Banner Unlocked!'}
              {currentUnlock.type === 'title' && '🏷️ New Title Unlocked!'}
              {currentUnlock.type === 'profile_photo' && '📸 New Profile Photo!'}
            </h2>
            <p>
              {currentUnlock.type === 'banner' && 'You earned a new profile banner!'}
              {currentUnlock.type === 'title' && 'You earned a new title!'}
              {currentUnlock.type === 'profile_photo' && 'You earned a new character photo!'}
            </p>
            <div className="unlock-preview">
              {currentUnlock.type === 'banner' ? (
                <img 
                  src={currentUnlock.data?.gifUrl} 
                  alt={currentUnlock.name} 
                  className="unlock-banner-gif"
                />
              ) : currentUnlock.type === 'profile_photo' ? (
                <img 
                  src={currentUnlock.data?.imageUrl} 
                  alt={currentUnlock.name} 
                  className="unlock-photo-img"
                />
              ) : (
                <div className="unlock-title-preview">
                  {currentUnlock.data?.displayType === 'prefix' 
                    ? `[${currentUnlock.data?.displayName}] Username` 
                    : `Username [${currentUnlock.data?.displayName}]`}
                </div>
              )}
            </div>
            <h3>{currentUnlock.name}</h3>
            <p className="unlock-desc">{currentUnlock.data?.description || 'Check your profile to equip it ✨'}</p>
            <button 
              className="btn btn-primary"
              onClick={closeUnlockPopup}
            >
              {currentUnlockIndex < unlockNotifications.length - 1 
                ? `Next → (${currentUnlockIndex + 1}/${unlockNotifications.length})` 
                : 'Awesome! ✨'}
            </button>
          </div>
        </div>
      )}

      <div className="game-header">
        <div className="game-info">
          <span className="game-status">
            {gameState.status === 'playing' && '🎮 Playing'}
            {gameState.status === 'won' && '🎉 Won!'}
            {gameState.status === 'lost' && '😔 Game Over'}
          </span>
          <span className="game-count">Questions: {gameState.remainingQuestions} left</span>
          {gameState.status === 'playing' && (
            <span className="game-guesses">Guesses left: {gameState.remainingGuesses}</span>
          )}
          <span className="game-shards">🎴 {shards} Shards</span>
        </div>
        <div className="game-header-buttons">
          {gameState.status === 'playing' && (
            <button 
              className="btn btn-shards btn-sm"
              onClick={openBuyShardsModal}
              title="Buy Shards without losing your streak"
            >
              💎 Buy Shards
            </button>
          )}
          {gameState.status === 'playing' && (
            <button className="btn btn-danger btn-sm" onClick={giveUp}>
              Give Up
            </button>
          )}
        </div>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {gameState.questions.length === 0 && (
            <div className="chat-welcome">
              <p>🤔 Ask your first question about the secret character!</p>
              <p className="hint">Example: "Is your character a girl?" or "Bhai kya ye Naruto se hai?"</p>
            </div>
          )}
          
          {gameState.questions.map((msg, index) => {
            let avatar = '📢';
            let msgClass = 'system';
            
            if (msg.type === 'user') {
              avatar = '👤';
              msgClass = 'user';
            } else if (msg.type === 'ai') {
              avatar = '🤖';
              msgClass = 'ai';
            } else if (msg.type === 'hint') {
              avatar = '💡';
              msgClass = 'hint';
            } else {
              avatar = '📢';
              msgClass = 'system';
            }

            return (
              <div key={index} className={`chat-message ${msgClass}`}>
                <div className="message-avatar">{avatar}</div>
                <div className="message-content">
                  <div className="message-text">{msg.text}</div>
                  {msg.type === 'ai' && msg.questionCount && (
                    <div className="message-meta">Question #{msg.questionCount}</div>
                  )}
                </div>
              </div>
            );
          })}
          
          {gameState.loading && (
            <div className="chat-message ai">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {gameState.status === 'won' && (
          <div className="game-result win">
            <h2>🎉 Congratulations!</h2>
            <p>You guessed it right!</p>
            {gameState.characterImage && (
              <div className="result-image">
                <img src={gameState.characterImage} alt={gameState.character} />
              </div>
            )}
            <p className="result-character">It was <strong>{gameState.character}</strong>!</p>
            <p className="result-stats">Solved in {gameState.questionCount} questions!</p>
            <div className="result-buttons">
              <button className="btn btn-primary" onClick={playAgain}>Play Again</button>
              <button className="btn btn-secondary" onClick={goHome}>Home</button>
            </div>
          </div>
        )}

        {gameState.status === 'lost' && (
          <div className="game-result lose">
            <h2>😔 Game Over!</h2>
            <p>The character was:</p>
            {gameState.characterImage && (
              <div className="result-image">
                <img src={gameState.characterImage} alt={gameState.character} />
              </div>
            )}
            <p className="result-character"><strong>{gameState.character}</strong></p>
            <p>Better luck next time!</p>
            <div className="result-buttons">
              <button className="btn btn-primary" onClick={playAgain}>Try Again</button>
              <button className="btn btn-secondary" onClick={goHome}>Home</button>
            </div>
          </div>
        )}

        {gameState.status === 'playing' && (
          <div className="chat-input-area">
            <div className="input-tabs">
              <button 
                className={`tab-btn ${!showGuessInput ? 'active' : ''}`}
                onClick={() => setShowGuessInput(false)}
              >
                Ask Question
                {gameState.remainingQuestions > 0 && (
                  <span className="tab-badge">{gameState.remainingQuestions} left</span>
                )}
                {gameState.remainingQuestions <= 0 && (
                  <span className="tab-badge disabled">🔒</span>
                )}
              </button>
              <button 
                className={`tab-btn ${showGuessInput ? 'active' : ''}`}
                onClick={() => setShowGuessInput(true)}
              >
                Make Guess
              </button>
            </div>

            {gameState.remainingQuestions <= 0 && !showGuessInput && (
              <div className="no-questions-message">
                ⚠️ You've used all 10 questions! Switch to <strong>Make Guess</strong> tab to guess the character.
              </div>
            )}

            {!showGuessInput ? (
              <form onSubmit={askQuestion} className="chat-form">
                <input
                  type="text"
                  className="form-control chat-input"
                  placeholder={gameState.remainingQuestions <= 0 ? "No questions left! Make a guess." : "Ask a question... (e.g., 'Is she from Naruto?')"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={gameState.loading || gameState.remainingQuestions <= 0}
                />
                <div className="button-group">
                  <button 
                    type="submit" 
                    className="btn btn-primary send-btn"
                    disabled={!question.trim() || gameState.loading || gameState.remainingQuestions <= 0}
                  >
                    Ask ➤
                  </button>
                  <button 
                    type="button"
                    className={`btn btn-warning hint-btn ${hintUsed ? 'used' : ''}`}
                    onClick={useHint}
                    disabled={hintUsed || gameState.loading}
                    title={hintUsed ? 'Hint already used' : 'Use 50 Shards for a hint'}
                  >
                    {hintUsed ? '💡 Used' : '💡 Hint (50 Shards)'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={makeGuess} className="chat-form">
                <input
                  type="text"
                  className="form-control chat-input guess-input"
                  placeholder="Enter your guess..."
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  disabled={gameState.loading}
                />
                <button 
                  type="submit" 
                  className="btn btn-success send-btn"
                  disabled={!guess.trim() || gameState.loading}
                >
                  Guess!
                </button>
              </form>
            )}
            
            {error && <div className="chat-error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
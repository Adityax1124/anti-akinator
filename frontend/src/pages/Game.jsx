import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Game.css';

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
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  // Track if game has already ended
  const hasEnded = useRef(false);
  // Track if user has been warned
  const hasWarned = useRef(false);

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

  // ===== SCROLL TO BOTTOM =====
  useEffect(() => {
    scrollToBottom();
  }, [gameState.questions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ===== HANDLE GAME ABANDON =====
  const handleGameAbandon = async () => {
    if (hasEnded.current) return;
    if (!gameState.gameId) return;
    if (gameState.status !== 'playing') return;

    hasEnded.current = true;

    try {
      // ✅ This resets the streak on the backend
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
      console.error('Error abandoning game:', error);
    }
  };

  // ===== DETECT PAGE LEAVE (PC & Mobile) =====
  useEffect(() => {
    // Only track if game is active
    if (gameState.status !== 'playing') return;

    // Reset flags when game starts
    hasEnded.current = false;
    hasWarned.current = false;

    // ===== Navigation away (within app) – THIS CATCHES "BACK" BUTTON =====
    const unlisten = navigate((location) => {
      // If user navigates away from /game to any other page
      if (gameState.status === 'playing' && !hasEnded.current && location.pathname !== '/game') {
        if (!hasWarned.current) {
          hasWarned.current = true;
          const confirmLeave = window.confirm('⚠️ If you leave now, your streak will be reset! Click OK to leave or Cancel to stay.');
          if (confirmLeave) {
            handleGameAbandon();
          } else {
            hasWarned.current = false;
            // User cancelled – stay on the game
            navigate('/game');
          }
        } else {
          // Second time – count as loss
          handleGameAbandon();
        }
      }
    });

    // ===== Clicking back button (popstate) =====
    const handlePopState = () => {
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
          const confirmLeave = window.confirm('⚠️ If you leave now, your streak will be reset! Click OK to leave or Cancel to stay.');
          if (confirmLeave) {
            handleGameAbandon();
          } else {
            hasWarned.current = false;
            // Push state back to game
            window.history.pushState(null, '', '/game');
          }
        } else {
          handleGameAbandon();
        }
      }
    };

    // ===== PC: Tab/Window visibility change =====
    const handleVisibilityChange = () => {
      if (document.hidden && gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
          alert('⚠️ You switched to another tab! If you leave again, your streak will be reset!');
        } else {
          handleGameAbandon();
        }
      }
    };

    // ===== PC: Before unload (refresh, close tab) =====
    const handleBeforeUnload = (e) => {
      if (gameState.status === 'playing' && !hasEnded.current) {
        e.preventDefault();
        e.returnValue = '⚠️ If you leave now, your streak will be reset! Are you sure?';
        handleGameAbandon();
        return e.returnValue;
      }
    };

    // ===== Mobile: App goes to background =====
    const handlePageHide = () => {
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
        } else {
          handleGameAbandon();
        }
      }
    };

    // ===== Mobile: Freeze detection (iOS) =====
    const handleFreeze = () => {
      if (gameState.status === 'playing' && !hasEnded.current) {
        if (!hasWarned.current) {
          hasWarned.current = true;
        } else {
          handleGameAbandon();
        }
      }
    };

    // ===== Push state to catch back button =====
    window.history.pushState(null, '', '/game');

    // ===== Register event listeners =====
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('freeze', handleFreeze);

    // ===== CLEANUP =====
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('freeze', handleFreeze);
      unlisten();
    };
  }, [gameState.status, gameState.gameId]);

  // ===== CLEANUP ON UNMOUNT (component unmounts) =====
  useEffect(() => {
    return () => {
      if (gameState.status === 'playing' && !hasEnded.current) {
        handleGameAbandon();
      }
    };
  }, [gameState.status]);

  // ===== START GAME =====
  const startGame = async () => {
    setError('');
    setGameState(prev => ({ ...prev, loading: true }));
    hasEnded.current = false;
    hasWarned.current = false;

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
        {gameState.status === 'playing' && (
          <button className="btn btn-danger btn-sm" onClick={giveUp}>
            Give Up
          </button>
        )}
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
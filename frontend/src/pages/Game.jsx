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
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    scrollToBottom();
  }, [gameState.questions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startGame = async () => {
    setError('');
    setGameState(prev => ({ ...prev, loading: true }));

    try {
      const response = await api.post('/game/start');
      if (response.data.success) {
        setGameState({
          gameId: response.data.gameId,
          status: 'playing',
          questions: [],
          questionCount: 0,
          remainingGuesses: 3,
          character: null,
          characterImage: null,
          loading: false
        });
      } else {
        setError(response.data.message || 'Failed to start game');
        setGameState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      setError('Failed to start game. Please try again.');
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const askQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || gameState.status !== 'playing' || gameState.loading) return;

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
        loading: false
      }));
    } catch (error) {
      setError('Failed to get answer. Please try again.');
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

  const makeGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || gameState.status !== 'playing' || gameState.loading) return;

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

        // Show unlock notifications
        if (response.data.unlockedItems && response.data.unlockedItems.length > 0) {
          setUnlockNotifications(response.data.unlockedItems);
          setCurrentUnlockIndex(0);
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
        setShowGuessInput(false);
      }
    } catch (error) {
      setError('Failed to make guess. Please try again.');
      setGameState(prev => ({ ...prev, loading: false }));
    }
  };

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

  const closeUnlockPopup = () => {
    if (currentUnlockIndex < unlockNotifications.length - 1) {
      setCurrentUnlockIndex(prev => prev + 1);
    } else {
      setUnlockNotifications([]);
      setCurrentUnlockIndex(0);
    }
  };

  const playAgain = () => {
    setGameState({
      gameId: null,
      status: 'idle',
      questions: [],
      questionCount: 0,
      remainingGuesses: 3,
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
  };

  const goHome = () => {
    navigate('/');
  };

  const currentUnlock = unlockNotifications[currentUnlockIndex] || null;

  // ===== IDLE STATE =====
  if (gameState.status === 'idle') {
    return (
      <div className="game-container fade-in">
        <div className="game-start">
          <div className="game-start-content">
            <h1>🎯 Ready to Play?</h1>
            <p>AI will pick a secret anime character. You ask questions and guess!</p>
            <p className="game-hint">💡 You have 3 wrong guesses before game over</p>
            <button
              className="btn btn-primary start-btn"
              onClick={startGame}
              disabled={gameState.loading}
            >
              {gameState.loading ? 'Starting...' : 'Start New Game 🚀'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== PLAYING, WON, LOST STATES =====
  return (
    <div className="game-container fade-in">
      {/* Unlock Popup */}
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

      {/* Game Header */}
      <div className="game-header">
        <div className="game-info">
          <span className="game-status">
            {gameState.status === 'playing' && '🎮 Playing'}
            {gameState.status === 'won' && '🎉 Won!'}
            {gameState.status === 'lost' && '😔 Game Over'}
          </span>
          <span className="game-count">Questions: {gameState.questionCount}</span>
          {gameState.status === 'playing' && (
            <span className="game-guesses">Guesses left: {gameState.remainingGuesses}</span>
          )}
        </div>
        {gameState.status === 'playing' && (
          <button className="btn btn-danger btn-sm" onClick={giveUp}>
            Give Up
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="chat-container">
        <div className="chat-messages">
          {gameState.questions.length === 0 && (
            <div className="chat-welcome">
              <p>🤔 Ask your first question about the secret character!</p>
              <p className="hint">Example: "Is your character a girl?" or "Bhai kya ye Naruto se hai?"</p>
            </div>
          )}
          
          {gameState.questions.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.type}`}>
              <div className="message-avatar">
                {msg.type === 'user' ? '👤' : msg.type === 'ai' ? '🤖' : '📢'}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.text}</div>
                {msg.type === 'ai' && msg.questionCount && (
                  <div className="message-meta">Question #{msg.questionCount}</div>
                )}
              </div>
            </div>
          ))}
          
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

        {/* Result States */}
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

        {/* Input Area */}
        {gameState.status === 'playing' && (
          <div className="chat-input-area">
            <div className="input-tabs">
              <button 
                className={`tab-btn ${!showGuessInput ? 'active' : ''}`}
                onClick={() => setShowGuessInput(false)}
              >
                Ask Question
              </button>
              <button 
                className={`tab-btn ${showGuessInput ? 'active' : ''}`}
                onClick={() => setShowGuessInput(true)}
              >
                Make Guess
              </button>
            </div>

            {!showGuessInput ? (
              <form onSubmit={askQuestion} className="chat-form">
                <input
                  type="text"
                  className="form-control chat-input"
                  placeholder="Ask a question... (e.g., 'Is she from Naruto?')"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={gameState.loading}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary send-btn"
                  disabled={!question.trim() || gameState.loading}
                >
                  Ask ➤
                </button>
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
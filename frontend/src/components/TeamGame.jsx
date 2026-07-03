import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

const TeamGame = ({ room, roomCode, user, onGameEnd }) => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const messagesEndRef = useRef(null);

  // Load initial game data
  useEffect(() => {
    if (room?.gameData) {
      setMessages(room.gameData.questions || []);
      setQuestionCount(room.gameData.totalQuestions || 0);
      setMaxQuestions(room.gameData.maxQuestions || 10);
      
      if (room.gameData.isGuessed) {
        setGameOver(true);
        setResult({
          success: true,
          character: room.gameData.characterName,
          image: room.gameData.characterImage,
          players: room.players
        });
      }
    }
  }, [room]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading || gameOver) return;

    setLoading(true);
    try {
      const response = await api.post('/team/question', {
        roomCode,
        question: question.trim()
      });

      if (response.data.success) {
        const newMessage = {
          type: 'question',
          askedBy: response.data.askedBy || user.username,
          text: question.trim(),
          answer: response.data.answer
        };
        setMessages(prev => [...prev, newMessage]);
        setQuestionCount(response.data.questionCount);
        setQuestion('');
      }
    } catch (error) {
      console.error('Ask question error:', error);
      alert(error.response?.data?.message || 'Failed to ask question');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || loading || gameOver) return;

    setLoading(true);
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
      }
    } catch (error) {
      console.error('Guess error:', error);
      alert(error.response?.data?.message || 'Failed to make guess');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = () => {
    onGameEnd();
  };

  const isQuestionLimitReached = questionCount >= maxQuestions;

  return (
    <div className="team-game-container">
      <div className="team-game-header">
        <span className="team-name">
          👥 Team: <strong>{room?.players?.map(p => p.username).join(', ') || '...'}</strong>
        </span>
        <span className="question-count">
          Questions: {questionCount}/{maxQuestions}
        </span>
      </div>

      <div className="team-game-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem 0' }}>
            <p>🤔 Start asking questions to find the secret character!</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Team members can take turns asking questions
            </p>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} className={`msg ${msg.type}`}>
            {msg.type === 'question' && (
              <>
                <div><strong>{msg.askedBy}</strong> asked: "{msg.text}"</div>
                <div style={{ color: '#00d4ff', marginTop: '2px' }}>🤖 {msg.answer}</div>
              </>
            )}
            {msg.type === 'guess-correct' && (
              <div>
                <div>🎉 <strong>{msg.guessedBy}</strong> guessed correctly!</div>
                <div style={{ color: '#ffd700', fontWeight: '700', fontSize: '1.1rem' }}>
                  It was {msg.character}!
                </div>
                {msg.reward && (
                  <div style={{ color: '#51cf66', marginTop: '4px' }}>
                    🎴 Everyone gets {msg.reward} Shards!
                  </div>
                )}
              </div>
            )}
            {msg.type === 'guess-wrong' && (
              <div>
                <div>❌ <strong>{msg.guessedBy}</strong> guessed: "{msg.text}"</div>
              </div>
            )}
          </div>
        ))}
        
        {isQuestionLimitReached && !gameOver && (
          <div style={{ textAlign: 'center', color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.05)', borderRadius: '8px' }}>
            ⚠️ You've used all {maxQuestions} questions! Make your guess now!
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {gameOver && result ? (
        <div className="team-game-result">
          <span className="result-icon">🎉</span>
          <h3>Team Guessed Correctly!</h3>
          <div className="character-name">{result.character}</div>
          {result.image && (
            <img src={result.image} alt={result.character} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px', margin: '0.5rem auto', display: 'block' }} />
          )}
          <div className="reward-text">🎴 Everyone gets {result.reward || 5} Shards!</div>
          <div className="players-text">
            👥 {result.players?.map(p => p.username).join(', ')}
          </div>
          <button className="btn-play-again" onClick={handlePlayAgain}>
            🔄 Play Again
          </button>
        </div>
      ) : (
        <div className="team-game-input">
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading || gameOver || isQuestionLimitReached}
          />
          <button
            className="btn btn-ask"
            onClick={handleAskQuestion}
            disabled={loading || !question.trim() || gameOver || isQuestionLimitReached}
          >
            Ask
          </button>
          <input
            type="text"
            placeholder="Make a guess..."
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={loading || gameOver}
          />
          <button
            className="btn btn-guess"
            onClick={handleMakeGuess}
            disabled={loading || !guess.trim() || gameOver}
          >
            Guess
          </button>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: '#555', textAlign: 'center', marginTop: '0.5rem' }}>
        🎴 5 Shards each if correct • ⚡ No streak/leaderboard impact
      </div>
    </div>
  );
};

export default TeamGame;
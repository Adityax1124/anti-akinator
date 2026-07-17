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
    <div className="team-game-page">
      <div className="team-game-header">
        <div className="header-center">
          <span className="team-name">
            👥 Team: <strong>{room?.players?.map(p => p.username).join(', ') || '...'}</strong>
          </span>
        </div>
        <div className="header-right">
          <span className="question-count">
            Questions: {questionCount}/{maxQuestions}
          </span>
        </div>
      </div>

      <div className="team-game-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>🤔 Start asking questions to find the secret character!</p>
            <p>Team members can take turns asking questions</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`msg ${msg.type === 'question' ? 'question' : ''} ${msg.type === 'guess-correct' ? 'guess-correct' : ''} ${msg.type === 'guess-wrong' ? 'guess-wrong' : ''}`}>
            {msg.type === 'question' && (
              <>
                <div><strong>{msg.askedBy}</strong> asked: "{msg.text}"</div>
                <div className="msg-answer">🤖 {msg.answer}</div>
              </>
            )}
            {msg.type === 'guess-correct' && (
              <div>
                <div>🎉 <strong>{msg.guessedBy}</strong> guessed correctly!</div>
                <div className="character-reveal">It was {msg.character}!</div>
                {msg.reward && (
                  <div className="reward-text">🎴 Everyone gets {msg.reward} Shards!</div>
                )}
              </div>
            )}
            {msg.type === 'guess-wrong' && (
              <div>
                ❌ <strong>{msg.guessedBy}</strong> guessed: "{msg.text}"
              </div>
            )}
          </div>
        ))}

        {isQuestionLimitReached && !gameOver && (
          <div className="limit-warning">
            ⚠️ You've used all {maxQuestions} questions! Make your guess now!
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {gameOver && result ? (
        <div className="team-game-result success">
          <span className="result-icon">🎉</span>
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
              disabled={loading || gameOver || isQuestionLimitReached}
              className="input-ask"
            />
            <button
              type="submit"
              className="btn btn-ask"
              disabled={loading || !question.trim() || gameOver || isQuestionLimitReached}
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
              disabled={loading || gameOver}
              className="input-guess"
            />
            <button
              type="submit"
              className="btn btn-guess"
              disabled={loading || !guess.trim() || gameOver}
            >
              Guess
            </button>
          </form>
        </div>
      )}

      <div className="team-game-footer">
        <span>🎴 5 Shards each if correct</span>
        <span>⚡ No streak/leaderboard impact</span>
      </div>
    </div>
  );
};

export default TeamGame;
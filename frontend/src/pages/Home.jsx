import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="home-container fade-in">
      <div className="hero-section">
        <h1 className="hero-title">
          🎯 Anti-Akinator
        </h1>
        <p className="hero-subtitle">
          The Reverse Guessing Game!
        </p>
        <p className="hero-description">
          Think of an anime character? No! Here, <strong>YOU</strong> ask questions<br />
          and the AI has a secret character. Can you guess who it is?
        </p>
        <button 
          className="btn btn-primary hero-btn"
          onClick={() => navigate('/game')}
        >
          Start Playing Now 🚀
        </button>
      </div>

      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon">🤔</div>
          <h3>Ask Questions</h3>
          <p>Ask any question about the secret character in English or Hinglish</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>AI Answers</h3>
          <p>Get Yes/No/Maybe answers powered by AI intelligence</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏆</div>
          <h3>Guess & Win</h3>
          <p>Make your guess and climb the leaderboard!</p>
        </div>
      </div>

      <div className="stats-preview">
        <div className="stat-item">
          <span className="stat-value">{user?.stats?.gamesPlayed || 0}</span>
          <span className="stat-label">Games Played</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{user?.stats?.gamesWon || 0}</span>
          <span className="stat-label">Games Won</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{user?.stats?.bestScore || '-'}</span>
          <span className="stat-label">Best Score</span>
        </div>
      </div>

      <div className="how-to-play">
        <h2>How to Play</h2>
        <div className="steps">
          <div className="step">
            <span className="step-number">1</span>
            <p>AI secretly picks an anime character</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <p>You ask yes/no questions to identify them</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <p>AI answers with Yes/No/Maybe/Unlikely</p>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <p>Guess the character and win!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
// /frontend/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TeamPlayModal from '../components/TeamPlayModal';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const sections = document.querySelectorAll(
      '.offer-section, .how-to-play-section, .stats-section, .cta-section, .game-modes-section'
    );
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  return (
    <div className={`home-container ${isVisible ? 'visible' : ''}`}>
      <div className="bg-noise"></div>
      <div className="bg-grid"></div>

      <TeamPlayModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
      />

      {/* ============================================================
          HERO SECTION
          ============================================================ */}
      <section className="hero-section">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Premium Anime Battle Platform
          </div>
          <h1 className="hero-title">
            <span className="hero-title-gradient">Anti-Akinator</span>
          </h1>
          <p className="hero-subtitle">The Ultimate Anime Card Battle Experience</p>
          <p className="hero-description">
            Guess characters, collect powerful cards, battle friends in real-time,<br />
            and steal their best cards to build your ultimate anime collection!
          </p>
          <div className="hero-buttons">
            <button
              className="hero-btn btn-ai"
              onClick={() => navigate('/game')}
            >
              <span className="btn-icon">🤔</span>
              <span className="btn-text">AI Guessing Game</span>
            </button>
            <button
              className="hero-btn btn-blur"
              onClick={() => navigate('/blur-game')}
            >
              <span className="btn-icon">🔮</span>
              <span className="btn-text">Mystery Character</span>
            </button>
            <button
              className="hero-btn btn-battle"
              onClick={() => navigate('/match')}
            >
              <span className="btn-icon">⚔️</span>
              <span className="btn-text">Battle Now</span>
            </button>
            <button
              className="hero-btn btn-team"
              onClick={() => setIsTeamModalOpen(true)}
            >
              <span className="btn-icon">🤝</span>
              <span className="btn-text">Team Play</span>
            </button>
          </div>
        </div>
        <div className="hero-scroll-hint">
          <span></span>
        </div>
      </section>

      {/* ============================================================
          GAME MODES SECTION
          ============================================================ */}
      <section className="game-modes-section">
        <h2 className="section-title">
          Choose Your <span className="section-title-highlight">Game Mode</span>
        </h2>
        <div className="game-modes-grid">
          <div className="game-mode-card mode-ai" onClick={() => navigate('/game')}>
            <div className="mode-card-glow"></div>
            <div className="mode-icon-wrapper">
              <span className="mode-icon">🤔</span>
            </div>
            <h3>AI Guessing Game</h3>
            <p>Ask questions and guess the anime character the AI is thinking of</p>
            <div className="mode-features">
              <span>🎯 100+ Characters</span>
              <span>🧠 AI Powered</span>
              <span>💎 Earn Gems</span>
            </div>
            <div className="mode-play-btn">Play Now →</div>
          </div>

          <div className="game-mode-card mode-blur" onClick={() => navigate('/blur-game')}>
            <div className="mode-card-glow"></div>
            <div className="mode-icon-wrapper">
              <span className="mode-icon">🔮</span>
            </div>
            <h3>Mystery Character</h3>
            <p>Identify the character from a blurry image that gradually becomes clear</p>
            <div className="mode-features">
              <span>🖼️ Blur Challenge</span>
              <span>⏱️ 30-Second Reward</span>
              <span>🃏 Win Cards</span>
            </div>
            <div className="mode-play-btn">Play Now →</div>
          </div>

          <div className="game-mode-card mode-battle" onClick={() => navigate('/match')}>
            <div className="mode-card-glow"></div>
            <div className="mode-icon-wrapper">
              <span className="mode-icon">⚔️</span>
            </div>
            <h3>Card Battle</h3>
            <p>Challenge friends in epic real-time PvP card battles</p>
            <div className="mode-features">
              <span>👥 Real-Time</span>
              <span>🏆 Ranked</span>
              <span>🎴 Steal Cards</span>
            </div>
            <div className="mode-play-btn">Play Now →</div>
          </div>
        </div>
      </section>

      {/* ============================================================
          WHAT WE OFFER
          ============================================================ */}
      <section className="offer-section">
        <h2 className="section-title">
          What <span className="section-title-highlight">We Offer</span>
        </h2>
        <div className="offer-grid">
          <div className="offer-card" onClick={() => navigate('/game')} style={{ cursor: 'pointer' }}>
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">🤔</span>
            </div>
            <h3>AI Guessing Game</h3>
            <p>Ask questions and guess the anime character the AI is thinking of</p>
            <div className="offer-tag">Classic Mode</div>
          </div>
          <div className="offer-card" onClick={() => navigate('/blur-game')} style={{ cursor: 'pointer' }}>
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">🔮</span>
            </div>
            <h3>Mystery Character</h3>
            <p>Guess the character from a blurry image that clears over time</p>
            <div className="offer-tag">New Mode</div>
          </div>
          <div className="offer-card">
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">🃏</span>
            </div>
            <h3>Card Collection</h3>
            <p>Collect 500+ anime cards with unique power levels and elements</p>
            <div className="offer-tag">Collect & Earn</div>
          </div>
          <div className="offer-card">
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">⚔️</span>
            </div>
            <h3>Real-Time Battles</h3>
            <p>Challenge friends in epic PvP card battles with real-time gameplay</p>
            <div className="offer-tag">Multiplayer</div>
          </div>
          <div className="offer-card">
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">🎯</span>
            </div>
            <h3>Steal System</h3>
            <p>Win battles and steal your opponent's most powerful cards</p>
            <div className="offer-tag">High Stakes</div>
          </div>
          <div className="offer-card">
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">💎</span>
            </div>
            <h3>Card Upgrades</h3>
            <p>Level up your cards using gems to increase their power</p>
            <div className="offer-tag">Progression</div>
          </div>
          <div className="offer-card">
            <div className="offer-card-border"></div>
            <div className="offer-icon-wrapper">
              <div className="offer-icon-glow"></div>
              <span className="offer-icon">🏆</span>
            </div>
            <h3>Leaderboard</h3>
            <p>Compete globally and climb the ranks to become #1</p>
            <div className="offer-tag">Competitive</div>
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW TO PLAY
          ============================================================ */}
      <section className="how-to-play-section">
        <h2 className="section-title">
          How to <span className="section-title-highlight">Play</span>
        </h2>
        <div className="how-to-play-grid">
          <div className="how-to-line"></div>
          <div className="how-to-card how-to-left">
            <div className="how-to-number">01</div>
            <div className="how-to-content">
              <h3>AI Picks a Character</h3>
              <p>The AI secretly selects an anime character from our database of 100+ characters</p>
            </div>
          </div>
          <div className="how-to-card how-to-right">
            <div className="how-to-content">
              <h3>Ask Questions</h3>
              <p>Ask yes/no questions in English or Hinglish to identify the character</p>
            </div>
            <div className="how-to-number">02</div>
          </div>
          <div className="how-to-card how-to-left">
            <div className="how-to-number">03</div>
            <div className="how-to-content">
              <h3>AI Responds</h3>
              <p>Get Yes/No/Maybe answers powered by advanced AI intelligence</p>
            </div>
          </div>
          <div className="how-to-card how-to-right">
            <div className="how-to-content">
              <h3>Guess & Win</h3>
              <p>Guess correctly to earn cards, gems, and climb the leaderboard</p>
            </div>
            <div className="how-to-number">04</div>
          </div>
          <div className="how-to-card how-to-left">
            <div className="how-to-number">05</div>
            <div className="how-to-content">
              <h3>Collect & Upgrade</h3>
              <p>Build your collection, upgrade cards, and prepare for battles</p>
            </div>
          </div>
          <div className="how-to-card how-to-right">
            <div className="how-to-content">
              <h3>Battle & Steal</h3>
              <p>Challenge friends in real-time battles and steal their cards</p>
            </div>
            <div className="how-to-number">06</div>
          </div>
        </div>
      </section>

      {/* ============================================================
          STATS SECTION
          ============================================================ */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{user?.stats?.gamesPlayed || 0}</div>
            <div className="stat-label">Games Played</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{user?.stats?.gamesWon || 0}</div>
            <div className="stat-label">Games Won</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">{user?.stats?.winStreak || 0}</div>
            <div className="stat-label">Win Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🃏</div>
            <div className="stat-value">{user?.cards?.length || 0}</div>
            <div className="stat-label">Cards Collected</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💎</div>
            <div className="stat-value">{user?.gems || 0}</div>
            <div className="stat-label">Gems Earned</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚔️</div>
            <div className="stat-value">{user?.matchStats?.matchesWon || 0}</div>
            <div className="stat-label">Battles Won</div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA SECTION
          ============================================================ */}
      <section className="cta-section">
        <div className="cta-grid-overlay"></div>
        <div className="cta-glow"></div>
        <div className="cta-content">
          <h2>Ready to Begin Your Journey?</h2>
          <p>Join thousands of players in the ultimate anime guessing and card battle game</p>
          <div className="cta-buttons">
            <button
              className="cta-btn"
              onClick={() => navigate('/game')}
            >
              <span className="cta-icon">🤔</span>
              <span className="cta-text">AI Guessing Game</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button
              className="cta-btn-secondary"
              onClick={() => navigate('/blur-game')}
            >
              <span className="cta-icon">🔮</span>
              <span className="cta-text">Mystery Character</span>
            </button>
            <button
              className="cta-btn-battle"
              onClick={() => navigate('/match')}
            >
              <span className="cta-icon">⚔️</span>
              <span className="cta-text">Battle Now</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
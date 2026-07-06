import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import './SeasonWinners.css';

const SeasonWinners = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const itemRefs = useRef([]);

  useEffect(() => {
    setIsVisible(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && winners.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      );

      itemRefs.current.forEach((item) => {
        if (item) observer.observe(item);
      });

      return () => {
        if (observer) {
          observer.disconnect();
        }
      };
    }
  }, [loading, winners]);

  const fetchData = async () => {
    try {
      const response = await api.get('/season/winners');
      setWinners(response.data.winners || []);
      setCurrentSeason(response.data.currentSeason || null);
    } catch (error) {
      console.error('Error fetching season winners:', error);
      try {
        const seasonRes = await api.get('/season/current');
        setCurrentSeason(seasonRes.data.season || null);
      } catch (seasonError) {
        console.error('Error fetching current season:', seasonError);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`season-winners-container ${isVisible ? 'visible' : ''}`}>
        <div className="sw-bg-noise"></div>
        <div className="sw-bg-grid"></div>
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading champions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`season-winners-container ${isVisible ? 'visible' : ''}`}>
      <div className="sw-bg-noise"></div>
      <div className="sw-bg-grid"></div>

      <section className="season-hero">
        <div className="sw-aurora sw-aurora-1"></div>
        <div className="sw-aurora sw-aurora-2"></div>
        <div className="sw-hero-glow"></div>
        <div className="season-hero-content">
          <div className="season-badge">
            <span className="badge-dot"></span>
            Hall of Fame
          </div>
          <h1 className="season-title">
            <span className="season-title-gradient">Season Champions</span>
          </h1>
          <p className="season-subtitle">
            Current Season: <strong>{currentSeason?.display || 'Loading...'}</strong>
          </p>
        </div>
      </section>

      {winners.length === 0 ? (
        <div className="no-winners">
          <span className="no-winners-icon">🚀</span>
          <p>No season winners yet.</p>
          <p>Be the first to win a season!</p>
        </div>
      ) : (
        <div className="winners-list">
          <div className="winners-list-header">
            <span>Season</span>
            <span>Champion</span>
            <span>Streak</span>
            <span>Wins</span>
            <span>Prize</span>
          </div>

          {winners.map((winner, index) => (
            <div
              key={winner.season}
              ref={(el) => (itemRefs.current[index] = el)}
              className={`winner-item ${index === 0 ? 'latest' : ''}`}
              style={{ transitionDelay: `${Math.min(index, 10) * 0.08}s` }}
            >
              {index === 0 && <div className="winner-item-glow"></div>}
              <span className="season-number">
                {index === 0 && <span className="crown">👑</span>}
                {winner.displaySeason || `Season ${winner.season}`}
              </span>
              <span className="winner-name">{winner.username}</span>
              <span className="winner-streak">🔥 {winner.streak}</span>
              <span className="winner-wins">🎯 {winner.wins}</span>
              <span className="winner-prize">💰 {winner.prize || 2000}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonWinners;
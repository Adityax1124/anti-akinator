import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import './SeasonWinners.css';

const SeasonWinners = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  
  // ===== REF FOR INTERSECTION OBSERVER =====
  const itemRefs = useRef([]);

  useEffect(() => {
    fetchData();
  }, []);

  // ===== INTERSECTION OBSERVER FOR SCROLL ANIMATIONS =====
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

      // Observe all winner items
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
      
      // The backend now returns:
      // {
      //   currentSeason: { code: 202607, display: "Season 3" },
      //   winners: [{ season: 202607, displaySeason: "Season 3", username: "...", ... }]
      // }
      
      setWinners(response.data.winners || []);
      setCurrentSeason(response.data.currentSeason || null);
    } catch (error) {
      console.error('Error fetching season winners:', error);
      // Fallback: try to fetch current season separately if winners endpoint fails
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
      <div className="season-winners-container fade-in">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading champions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="season-winners-container fade-in">
      <div className="season-winners-header">
        <h1>🏆 Season Champions 🏆</h1>
        <p className="season-subtitle">
          Current Season: <strong>{currentSeason?.display || 'Loading...'}</strong>
        </p>
      </div>

      {winners.length === 0 ? (
        <div className="no-winners">
          <p>No season winners yet. Be the first to win a season! 🚀</p>
        </div>
      ) : (
        <div className="winners-list">
          {winners.map((winner, index) => (
            <div 
              key={winner.season} 
              ref={el => itemRefs.current[index] = el}
              className={`winner-item ${index === 0 ? 'latest' : ''}`}
            >
              <span className="season-number">
                {index === 0 && <span className="crown">👑</span>}
                {winner.displaySeason || `Season ${winner.season}`}
              </span>
              <span className="winner-name">{winner.username}</span>
              <span className="winner-streak">🔥 {winner.streak}</span>
              <span className="winner-wins">🎯 {winner.wins}</span>
              <span className="winner-prize">💰 {winner.prize || 2000} Shards</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonWinners;
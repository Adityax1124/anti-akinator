import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import './SeasonWinners.css';

const SeasonWinners = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [winnersRes, seasonRes] = await Promise.all([
        api.get('/season/winners'),
        api.get('/season/current')
      ]);
      setWinners(winnersRes.data.winners || []);
      setCurrentSeason(seasonRes.data.season || 1);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="season-winners-container">
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
        <h1>🏆 Season Champions</h1>
        <p className="season-subtitle">Current Season: <strong>Season {currentSeason}</strong></p>
      </div>

      {winners.length === 0 ? (
        <div className="no-winners">
          <p>No season winners yet. Be the first!</p>
        </div>
      ) : (
        <div className="winners-list">
          {winners.map((winner, index) => (
            <div key={winner.season} className={`winner-item ${index === 0 ? 'latest' : ''}`}>
              <span className="season-number">
                {index === 0 && <span className="crown">👑</span>}
                Season {winner.season}
              </span>
              <span className="winner-name">{winner.username}</span>
              <span className="winner-streak">🔥 {winner.streak} streak</span>
              <span className="winner-wins">🎯 {winner.wins} wins</span>
              <span className="winner-prize">💰 ₹{winner.prize || 2000}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeasonWinners;
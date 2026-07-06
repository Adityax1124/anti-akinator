import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import './ClanJoinList.css';

const ClanJoinList = ({ onBack, onJoin }) => {
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinLoading, setJoinLoading] = useState(null);

  useEffect(() => {
    fetchClans();
  }, []);

  const fetchClans = async () => {
    try {
      const response = await axios.get('/clan/list');
      setClans(response.data.clans);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clans');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (clanId) => {
    setJoinLoading(clanId);
    try {
      const response = await axios.post('/clan/join', { clanId });
      const clan = response.data.clan;
      const fullClan = clans.find(c => c._id === clanId);
      onJoin({ ...clan, ...fullClan });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join clan');
      setJoinLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="clan-join-loading">
        <div className="loader"></div>
        <p>Loading clans...</p>
      </div>
    );
  }

  return (
    <div className="clan-join-list">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <h2>Available Clans</h2>

      {error && <div className="error-message">{error}</div>}

      {clans.length === 0 ? (
        <div className="no-clans">
          <p>No clans available to join</p>
          <p className="sub-text">Create your own clan instead!</p>
        </div>
      ) : (
        <div className="clan-grid">
          {clans.map((clan) => (
            <div key={clan._id} className="clan-card">
              <div className="clan-card-header">
                <h3>{clan.name}</h3>
                <span className="member-count">
                  👥 {clan.memberCount}/{clan.maxMembers}
                </span>
              </div>
              <p className="clan-description">{clan.description}</p>
              <button
                className="join-clan-btn"
                onClick={() => handleJoin(clan._id)}
                disabled={joinLoading === clan._id || clan.memberCount >= clan.maxMembers}
              >
                {joinLoading === clan._id ? (
                  <span className="btn-loading">Joining...</span>
                ) : clan.memberCount >= clan.maxMembers ? (
                  'Full'
                ) : (
                  'Join Clan'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClanJoinList;
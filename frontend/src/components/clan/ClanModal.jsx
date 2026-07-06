import React, { useState } from 'react';
import './ClanModal.css';
import ClanCreateForm from './ClanCreateForm';
import ClanJoinList from './ClanJoinList';

const ClanModal = ({ isOpen, onClose, onClanAction }) => {
  const [mode, setMode] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setMode(null);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleClanAction = (clan) => {
    if (typeof onClanAction === 'function') {
      onClanAction(clan);
    } else {
      console.warn('onClanAction is not a function:', onClanAction);
    }
    handleClose();
  };

  return (
    <div className="clan-modal-overlay">
      <div className="clan-modal">
        <div className="clan-modal-aurora"></div>
        <button className="clan-modal-close" onClick={handleClose}>✕</button>

        {!mode ? (
          <div className="clan-modal-choices">
            <div className="clan-modal-badge">
              <span className="badge-dot"></span>
              Clan System
            </div>
            <h2>Join or Create a Clan</h2>
            <div className="clan-modal-buttons">
              <button
                className="clan-modal-btn create-btn"
                onClick={() => setMode('create')}
              >
                <div className="btn-icon-wrapper">
                  <div className="btn-icon-glow"></div>
                  <span className="btn-icon">🏰</span>
                </div>
                <span className="btn-title">Create Clan</span>
                <span className="btn-sub">Costs 200 💎</span>
              </button>
              <button
                className="clan-modal-btn join-btn"
                onClick={() => setMode('join')}
              >
                <div className="btn-icon-wrapper">
                  <div className="btn-icon-glow"></div>
                  <span className="btn-icon">🤝</span>
                </div>
                <span className="btn-title">Join Clan</span>
                <span className="btn-sub">Browse available clans</span>
              </button>
            </div>
          </div>
        ) : mode === 'create' ? (
          <ClanCreateForm
            onBack={() => setMode(null)}
            onSuccess={(clan) => {
              handleClanAction(clan);
            }}
          />
        ) : (
          <ClanJoinList
            onBack={() => setMode(null)}
            onJoin={(clan) => {
              handleClanAction(clan);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ClanModal;
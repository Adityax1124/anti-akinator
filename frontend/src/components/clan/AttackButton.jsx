import React, { useState } from 'react';
import './AttackButton.css';

const AttackButton = ({
  targetUserId,
  targetUsername,
  onAttack,
  disabled = false,
  loading = false,
  compact = false
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (disabled || loading) return;
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    
    onAttack(targetUserId);
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <div className={`attack-button-wrapper ${compact ? 'compact' : ''}`}>
      {!showConfirm ? (
        <button
          className={`attack-btn ${disabled || loading ? 'disabled' : ''} ${isHovered ? 'hover' : ''}`}
          onClick={handleClick}
          disabled={disabled || loading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              <span className="btn-text">Attacking...</span>
            </>
          ) : (
            <>
              <span className="btn-icon">⚔️</span>
              <span className="btn-text">Attack {targetUsername || 'Player'}</span>
            </>
          )}
        </button>
      ) : (
        <div className="attack-confirm">
          <span className="confirm-text">
            ⚔️ Attack {targetUsername}?
          </span>
          <div className="confirm-actions">
            <button
              className="confirm-btn confirm-yes"
              onClick={handleClick}
              disabled={loading}
            >
              ✅ Yes
            </button>
            <button
              className="confirm-btn confirm-no"
              onClick={handleCancel}
              disabled={loading}
            >
              ✖ No
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttackButton;
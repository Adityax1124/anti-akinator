import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import './ClanMembers.css';

const ClanMembers = ({ clanId, userRole, onLeave, onWarCardUpdate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  // War card states
  const [warCards, setWarCards] = useState([]);
  const [loadingWarCards, setLoadingWarCards] = useState(false);
  const [selectedWarCard, setSelectedWarCard] = useState(null);
  const [showWarCardSelector, setShowWarCardSelector] = useState(false);
  const [userCards, setUserCards] = useState([]);
  const [loadingUserCards, setLoadingUserCards] = useState(false);
  
  // ✅ NEW: Kick state
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [kicking, setKicking] = useState(false);
  const [targetMember, setTargetMember] = useState(null);

  useEffect(() => {
    fetchMembers();
    fetchWarCards();
    fetchUserWarCard();
  }, [clanId]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`/clan/members/${clanId}`);
      setMembers(response.data.members);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Fetch war cards for all clan members
  const fetchWarCards = async () => {
    try {
      setLoadingWarCards(true);
      const response = await axios.get(`/clan/${clanId}/war-cards`);
      if (response.data.success) {
        setWarCards(response.data.warCards || []);
      }
    } catch (error) {
    } finally {
      setLoadingWarCards(false);
    }
  };

  // Fetch user's current war card
  const fetchUserWarCard = async () => {
    try {
      const response = await axios.get('/clan/war-card');
      if (response.data.success && response.data.hasWarCard) {
        setSelectedWarCard(response.data.warCard);
      }
    } catch (error) {
    }
  };

  // Fetch user's cards for selection
  const fetchUserCards = async () => {
    try {
      setLoadingUserCards(true);
      const response = await axios.get('/cards/collection');
      if (response.data.success) {
        setUserCards(response.data.cards || []);
        setShowWarCardSelector(true);
      }
    } catch (error) {
      alert('Failed to load your cards');
    } finally {
      setLoadingUserCards(false);
    }
  };

  // Select war card
  const handleSelectWarCard = async (cardId) => {
    try {
      const response = await axios.post('/clan/select-war-card', { cardId });
      if (response.data.success) {
        setSelectedWarCard(response.data.warCard);
        setShowWarCardSelector(false);
        fetchWarCards();
        if (onWarCardUpdate) {
          onWarCardUpdate();
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to select war card');
    }
  };

  // ✅ NEW: Handle kick member
  const handleKickMember = (member) => {
    setTargetMember(member);
    setShowKickConfirm(true);
  };

  // ✅ NEW: Confirm kick member
  const confirmKickMember = async () => {
    if (!targetMember) return;

    setKicking(true);
    try {
      const response = await axios.post('/clan/kick', {
        clanId: clanId,
        memberId: targetMember.id
      });

      if (response.data.success) {
        // Remove member from list
        setMembers(prev => prev.filter(m => m.id !== targetMember.id));
        setShowKickConfirm(false);
        setTargetMember(null);
        alert(`✅ ${targetMember.username} has been kicked from the clan.`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to kick member');
    } finally {
      setKicking(false);
    }
  };

  // ✅ NEW: Cancel kick
  const cancelKick = () => {
    setShowKickConfirm(false);
    setTargetMember(null);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await axios.post('/clan/leave', { clanId });
      onLeave();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to leave clan');
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      leader: '👑 Leader',
      'co-leader': '⭐ Co-Leader',
      elder: '🔱 Elder',
      member: '👤 Member'
    };
    return badges[role] || '👤 Member';
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    const colors = {
      'Common': '#a0a0a0',
      'Uncommon': '#4ecdc4',
      'Rare': '#4a9eff',
      'Epic': '#a855f7',
      'Legendary': '#f59e0b'
    };
    return colors[rarity] || '#a0a0a0';
  };

  // Get rarity stars
  const getRarityStars = (rarity) => {
    const stars = {
      'Common': '⭐',
      'Uncommon': '⭐⭐',
      'Rare': '⭐⭐⭐',
      'Epic': '⭐⭐⭐⭐',
      'Legendary': '⭐⭐⭐⭐⭐'
    };
    return stars[rarity] || '⭐';
  };

  // Get element emoji
  const getElementEmoji = (element) => {
    const emojis = {
      'Fire': '🔥',
      'Water': '💧',
      'Wind': '🌪️',
      'Earth': '🌍'
    };
    return emojis[element] || '❓';
  };

  // Get war card for a member
  const getMemberWarCard = (userId) => {
    const warCard = warCards.find(wc => wc.userId === userId);
    return warCard;
  };

  // Get current user ID from localStorage or context
  const getCurrentUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user?._id || user?.id;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const currentUserId = getCurrentUserId();

  if (loading) {
    return (
      <div className="clan-members-loading">
        <div className="loader"></div>
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="clan-members">
      {/* Header */}
      <div className="members-header">
        <div className="members-header-left">
          <h3>👥 Clan Members</h3>
          <span className="member-count">{members.length}/20</span>
        </div>
        <div className="members-header-right">
          <span className="war-card-count">
            ⚔️ {warCards.filter(wc => wc.hasWarCard).length}/{members.length} selected
          </span>
        </div>
      </div>

      {/* War Card Banner */}
      <div className="war-card-banner">
        <div className="war-card-banner-content">
          <span className="war-card-icon">⚔️</span>
          <span className="war-card-title">Your War Card</span>
        </div>
        {selectedWarCard ? (
          <div className="war-card-selected">
            <div className="selected-card-display">
              <span 
                className="selected-card-name"
                style={{ color: getRarityColor(selectedWarCard.rarity) }}
              >
                {getElementEmoji(selectedWarCard.element)} {selectedWarCard.name}
              </span>
              <span className="selected-card-rarity">
                {getRarityStars(selectedWarCard.rarity)}
              </span>
            </div>
            <button 
              className="war-card-change-btn"
              onClick={fetchUserCards}
            >
              Change
            </button>
          </div>
        ) : (
          <button 
            className="war-card-select-btn"
            onClick={fetchUserCards}
          >
            + Select War Card
          </button>
        )}
      </div>

      {/* Members Grid */}
      <div className="members-grid">
        {members.map((member) => {
          const warCard = getMemberWarCard(member.id);
          const isCurrentUser = member.id === currentUserId;
          const isLeader = userRole === 'leader';
          const canKick = isLeader && !isCurrentUser && member.role !== 'leader';
          
          return (
            <div key={member.id} className="member-card">
              <div className="member-card-header">
                <div className="member-avatar">
                  <span className="avatar-text">
                    {member.username?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="member-name-section">
                  <span className="member-username">{member.username}</span>
                  <span className="member-role-badge">{getRoleBadge(member.role)}</span>
                </div>
                {/* ✅ NEW: Kick Button for Leader */}
                {canKick && (
                  <button 
                    className="kick-btn"
                    onClick={() => handleKickMember(member)}
                    title="Kick member"
                  >
                    🚫
                  </button>
                )}
              </div>
              
              <div className="member-card-body">
                {warCard?.hasWarCard && warCard.warCard ? (
                  <div 
                    className="member-war-card-display"
                    style={{ 
                      borderColor: getRarityColor(warCard.warCard.rarity),
                      background: `${getRarityColor(warCard.warCard.rarity)}10`
                    }}
                  >
                    <span className="war-card-element">
                      {getElementEmoji(warCard.warCard.element)}
                    </span>
                    <span className="war-card-name">
                      {warCard.warCard.name}
                    </span>
                    <span 
                      className="war-card-rarity-stars"
                      style={{ color: getRarityColor(warCard.warCard.rarity) }}
                    >
                      {getRarityStars(warCard.warCard.rarity)}
                    </span>
                  </div>
                ) : (
                  <div className="member-no-card">
                    <span className="no-card-text">❌ No Card Selected</span>
                  </div>
                )}
              </div>
              
              <div className="member-card-footer">
                <div className="member-stats">
                  <span className="donation-stats">
                    💎 {member.diamondsDonated || 0}
                  </span>
                  <span className="request-stats">
                    📥 {member.diamondsRequested || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Button */}
      <div className="members-actions">
        <button
          className="leave-clan-btn"
          onClick={() => setShowLeaveConfirm(true)}
        >
          Leave Clan
        </button>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="leave-confirm-overlay">
          <div className="leave-confirm-modal">
            <h4>Leave Clan?</h4>
            <p>Are you sure you want to leave this clan?</p>
            <p className="warning-text">
              {userRole === 'leader'
                ? '⚠️ You are the leader! Leaving will disband the clan.'
                : 'You can join another clan after leaving.'}
            </p>
            <div className="confirm-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowLeaveConfirm(false)}
                disabled={leaving}
              >
                Cancel
              </button>
              <button
                className="confirm-leave-btn"
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? 'Leaving...' : 'Yes, Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Kick Confirmation Modal */}
      {showKickConfirm && targetMember && (
        <div className="leave-confirm-overlay">
          <div className="leave-confirm-modal">
            <h4 style={{ color: '#ff6b6b' }}>Kick Member?</h4>
            <p>Are you sure you want to kick <strong>{targetMember.username}</strong> from the clan?</p>
            <p className="warning-text">⚠️ This action cannot be undone!</p>
            <div className="confirm-buttons">
              <button
                className="cancel-btn"
                onClick={cancelKick}
                disabled={kicking}
              >
                Cancel
              </button>
              <button
                className="confirm-leave-btn"
                onClick={confirmKickMember}
                disabled={kicking}
                style={{ background: 'linear-gradient(135deg, #f43f5e, #dc2645)' }}
              >
                {kicking ? 'Kicking...' : 'Yes, Kick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* War Card Selector Modal */}
      {showWarCardSelector && (
        <div className="war-card-selector-overlay">
          <div className="war-card-selector-modal">
            <div className="selector-header">
              <h4>⚔️ Select War Card</h4>
              <button 
                className="selector-close"
                onClick={() => setShowWarCardSelector(false)}
              >
                ✕
              </button>
            </div>
            
            {loadingUserCards ? (
              <div className="selector-loading">
                <div className="loader"></div>
                <p>Loading your cards...</p>
              </div>
            ) : userCards.length === 0 ? (
              <div className="selector-empty">
                <span>🃏</span>
                <p>You don't have any cards!</p>
                <p className="empty-hint">Win battles to collect cards.</p>
              </div>
            ) : (
              <div className="selector-grid">
                {userCards.map((card) => (
                  <div
                    key={card.characterId}
                    className={`selector-card ${selectedWarCard?.id === card.characterId ? 'selected' : ''}`}
                    onClick={() => handleSelectWarCard(card.characterId)}
                    style={{
                      borderColor: getRarityColor(card.rarity),
                      background: selectedWarCard?.id === card.characterId 
                        ? `${getRarityColor(card.rarity)}15` 
                        : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div className="selector-card-image">
                      {card.image ? (
                        <img src={card.image} alt={card.characterName} />
                      ) : (
                        <span className="card-placeholder">
                          {card.characterName?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="selector-card-info">
                      <span className="selector-card-name">{card.characterName}</span>
                      <span 
                        className="selector-card-rarity"
                        style={{ color: getRarityColor(card.rarity) }}
                      >
                        {getRarityStars(card.rarity)}
                      </span>
                      <span className="selector-card-power">
                        ⚡ {card.currentPower || card.powerLevel || 0}
                      </span>
                      <span className="selector-card-element">
                        {getElementEmoji(card.element)} {card.element}
                      </span>
                    </div>
                    {selectedWarCard?.id === card.characterId && (
                      <div className="selector-card-check">✅</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="selector-footer">
              <button 
                className="selector-cancel"
                onClick={() => setShowWarCardSelector(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClanMembers;
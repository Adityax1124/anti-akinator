import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Matchmaking.css';

const Matchmaking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cardCount, setCardCount] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [createdMatchCode, setCreatedMatchCode] = useState(null);
  const [friends, setFriends] = useState([]);
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const searchIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const [allCards, setAllCards] = useState([]);

  const [selectedTeam, setSelectedTeam] = useState([]);
  const [teamConfirmed, setTeamConfirmed] = useState(false);

  useEffect(() => {
    fetchCardCount();
    fetchFriends();
  }, []);

  const fetchCardCount = async () => {
    try {
      const response = await api.get('/profile/cards');
      setCardCount(response.data.count || 0);
      setAllCards(response.data.cards || []);
    } catch (error) {
      console.error('Fetch cards error:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get('/friend/list');
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  };

  useEffect(() => {
    if (mode === 'searching') {
      timerIntervalRef.current = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [mode]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCardSelection = (card) => {
    if (teamConfirmed) {
      setError('Team already confirmed! Cannot change.');
      return;
    }

    const index = selectedTeam.findIndex(c => c.characterId === card.characterId);
    if (index !== -1) {
      setSelectedTeam(prev => prev.filter(c => c.characterId !== card.characterId));
    } else {
      if (selectedTeam.length >= 10) {
        setError('You can only select 10 cards!');
        setTimeout(() => setError(''), 2000);
        return;
      }
      setSelectedTeam(prev => [...prev, card]);
    }
  };

  const confirmTeam = () => {
    if (selectedTeam.length !== 10) {
      setError(`Select exactly 10 cards! (${selectedTeam.length}/10)`);
      setTimeout(() => setError(''), 2000);
      return;
    }
    setTeamConfirmed(true);
    setSuccess('✅ Team confirmed! You can now start a battle.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const resetTeam = () => {
    setSelectedTeam([]);
    setTeamConfirmed(false);
  };

  const autoSelectTopCards = () => {
    if (allCards.length < 10) {
      setError(`You need at least 10 cards! (${allCards.length}/10)`);
      return;
    }
    const top10 = [...allCards].sort((a, b) => (b.currentPower || b.powerLevel || 0) - (a.currentPower || a.powerLevel || 0)).slice(0, 10);
    setSelectedTeam(top10);
    setSuccess('✅ Top 10 cards selected! Confirm your team.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreateRoom = async () => {
    if (!teamConfirmed) {
      setError('Please confirm your team first!');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setCreatedMatchCode(null);

    try {
      const response = await api.post('/match/create', {
        team: selectedTeam
      });
      if (response.data.success) {
        setCreatedMatchCode(response.data.matchCode);
        setSuccess(`✅ Battle created! Room Code: ${response.data.matchCode}`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriend = async (friendId, friendUsername) => {
    if (!createdMatchCode) {
      setInviteMessage('❌ Create a room first!');
      setTimeout(() => setInviteMessage(''), 3000);
      return;
    }

    setInviteLoading(true);
    setInviteMessage('');
    try {
      const response = await api.post('/match/invite', {
        matchCode: createdMatchCode,
        friendId: friendId
      });

      if (response.data.success) {
        setInviteMessage(`✅ Invite sent to ${friendUsername}!`);
        setTimeout(() => setInviteMessage(''), 3000);
        setShowInviteDropdown(false);
      }
    } catch (error) {
      setInviteMessage(`❌ ${error.response?.data?.message || 'Failed to send invite'}`);
      setTimeout(() => setInviteMessage(''), 3000);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleQuickMatch = async () => {
    if (!teamConfirmed) {
      setError('Please confirm your team first!');
      return;
    }
    if (cardCount < 10) {
      setError(`You need ${10 - cardCount} more cards to battle!`);
      return;
    }

    setMode('searching');
    setError('');
    setCreatedMatchCode(null);

    let attempts = 0;

    searchIntervalRef.current = setInterval(async () => {
      attempts++;

      if (attempts >= 4) {
        clearInterval(searchIntervalRef.current);
        searchIntervalRef.current = null;

        try {
          const response = await api.post('/match/create', {
            team: selectedTeam
          });
          if (response.data.success) {
            setMode('create');
            setTimeout(() => {
              navigate(`/match/battle/${response.data.matchCode}`);
            }, 500);
          }
        } catch (err) {
          setMode('create');
          setError('Failed to create match. Please try again.');
        }
      }
    }, 1500);

    setTimeout(() => {
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
        searchIntervalRef.current = null;
        setMode('create');
        setError('No opponents found. Try creating a match instead.');
      }
    }, 10000);
  };

  const cancelSearch = () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
      searchIntervalRef.current = null;
    }
    setMode('create');
    setSearchTime(0);
  };

  const goToBattle = () => {
    if (createdMatchCode) {
      navigate(`/match/battle/${createdMatchCode}`);
    }
  };

  const isCardSelected = (cardId) => {
    return selectedTeam.some(c => c.characterId === cardId);
  };

  return (
    <div className="matchmaking-container">
      <div className="matchmaking-bg-noise"></div>
      <div className="matchmaking-bg-grid"></div>
      <div className="matchmaking-aurora matchmaking-aurora-1"></div>
      <div className="matchmaking-aurora matchmaking-aurora-2"></div>

      <div className="matchmaking-header">
        <div className="matchmaking-badge">
          <span className="badge-dot"></span>
          Premium PvP
        </div>
        <h1 className="matchmaking-title">
          <span>⚔️</span>
          Card Battle Arena
        </h1>
        <div className="card-count-badge">
          <span className="badge-icon">🃏</span>
          <span className="badge-text">{cardCount}</span>
          <span className="badge-label">Cards</span>
          {cardCount < 10 && (
            <span className="badge-warning">Need {10 - cardCount} more</span>
          )}
        </div>
      </div>

      {error && (
        <div className="premium-alert error">
          <span className="alert-icon">❌</span>
          {error}
        </div>
      )}
      {success && (
        <div className="premium-alert success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      <div className="team-selection-section premium-card">
        <div className="team-selection-header">
          <h3>🃏 Select Your Team (10 Cards)</h3>
          <div className="team-selection-info">
            <span className="selected-count">{selectedTeam.length} / 10</span>
            {teamConfirmed && <span className="team-confirmed-badge">✅ Confirmed</span>}
          </div>
        </div>

        {allCards.length === 0 ? (
          <div className="team-empty">
            <p>No cards found! Play the guessing game to collect cards.</p>
          </div>
        ) : (
          <>
            <div className="team-cards-grid">
              {allCards.map((card) => {
                const selected = isCardSelected(card.characterId);
                const currentPower = card.currentPower || card.powerLevel || 0;
                const cardLevel = card.level || 1;
                const elementEmoji = {
                  'Fire': '🔥',
                  'Water': '💧',
                  'Wind': '🌪️',
                  'Earth': '🌍'
                }[card.element] || '❓';

                return (
                  <div
                    key={card.characterId}
                    className={`team-card ${selected ? 'selected' : ''} ${teamConfirmed ? 'disabled' : ''}`}
                    onClick={() => toggleCardSelection(card)}
                  >
                    <div className="team-card-image">
                      {card.image ? (
                        <img src={card.image} alt={card.characterName} />
                      ) : (
                        <div className="team-card-placeholder">
                          {card.characterName?.charAt(0) || '?'}
                        </div>
                      )}
                      {selected && <div className="team-card-check">✅</div>}
                      <div className="team-card-badges">
                        <span className="team-card-element">{elementEmoji}</span>
                        <span className="team-card-level">Lv.{cardLevel}</span>
                      </div>
                    </div>
                    <div className="team-card-info">
                      <span className="team-card-name">{card.characterName}</span>
                      <span className="team-card-power">⚡{currentPower}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="team-selection-actions">
              <button
                className="btn-auto-select"
                onClick={autoSelectTopCards}
                disabled={teamConfirmed || allCards.length < 10}
              >
                ⚡ Auto-Select Top 10
              </button>
              <button
                className="btn-confirm-team"
                onClick={confirmTeam}
                disabled={teamConfirmed || selectedTeam.length !== 10}
              >
                {teamConfirmed ? '✅ Team Confirmed' : `Confirm Team (${selectedTeam.length}/10)`}
              </button>
              <button
                className="btn-reset-team"
                onClick={resetTeam}
                disabled={teamConfirmed}
              >
                🔄 Reset
              </button>
            </div>
          </>
        )}
      </div>

      {mode === 'searching' ? (
        <div className="searching-container premium-card">
          <div className="searching-animation">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
            <div className="searching-icon">⚔️</div>
          </div>
          <h2 className="searching-title">Finding Opponent...</h2>
          <p className="searching-time">⏱️ {formatTime(searchTime)}</p>
          <p className="searching-hint">Looking for a worthy opponent...</p>
          <button className="btn-cancel-search" onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="matchmaking-options">
          <div className="match-option premium-card">
            <div className="option-icon">⚡</div>
            <h3 className="option-title">Quick Match</h3>
            <p className="option-desc">Find an opponent instantly</p>
            <button
              className="btn-quick-match premium-btn"
              onClick={handleQuickMatch}
              disabled={loading || cardCount < 10 || !teamConfirmed}
            >
              {loading ? 'Searching...' : 'Find Match'}
            </button>
            {!teamConfirmed && (
              <p className="option-warning">⚠️ Confirm team first</p>
            )}
          </div>

          <div className="match-option premium-card">
            <div className="option-icon">👑</div>
            <h3 className="option-title">Create Room</h3>
            <p className="option-desc">Host a battle & invite friends</p>

            {createdMatchCode ? (
              <div className="room-created-section">
                <div className="match-code-display">
                  <span className="code-label">Room Code</span>
                  <span className="code-value">{createdMatchCode}</span>
                </div>
                <div className="room-actions">
                  <button
                    className="premium-btn invite-btn"
                    onClick={() => setShowInviteDropdown(!showInviteDropdown)}
                    disabled={inviteLoading}
                  >
                    👥 Invite Friends
                  </button>
                  <button
                    className="premium-btn battle-btn"
                    onClick={goToBattle}
                  >
                    ⚔️ Enter Lobby
                  </button>
                </div>

                {showInviteDropdown && (
                  <div className="invite-dropdown-match">
                    {friends.length === 0 ? (
                      <div className="invite-empty-match">
                        <p>You don't have any friends yet.</p>
                        <p>Add friends from the Friends menu!</p>
                      </div>
                    ) : (
                      <div className="invite-list-match">
                        {friends.map((friend) => (
                          <div key={friend.id} className="invite-item-match">
                            <span className="invite-friend-name-match">
                              {friend.username}
                              <span className="invite-badge-match online">🟢 Online</span>
                            </span>
                            <button
                              className="invite-friend-btn-match"
                              onClick={() => handleInviteFriend(friend.userId, friend.username)}
                              disabled={inviteLoading}
                            >
                              {inviteLoading ? 'Sending...' : 'Invite'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {inviteMessage && (
                  <div className={`invite-message-match ${inviteMessage.includes('❌') ? 'error' : ''}`}>
                    {inviteMessage}
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn-create-match premium-btn"
                onClick={handleCreateRoom}
                disabled={loading || cardCount < 10 || !teamConfirmed}
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            )}
            {!teamConfirmed && !createdMatchCode && (
              <p className="option-warning">⚠️ Confirm team first</p>
            )}
          </div>
        </div>
      )}

      <div className="matchmaking-rules premium-card">
        <h4 className="rules-title">⚔️ Battle Rules</h4>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-icon">🃏</span>
            <span className="rule-text">10 cards per player</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⚡</span>
            <span className="rule-text">Higher power wins</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⏱️</span>
            <span className="rule-text">30 seconds per round</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🏆</span>
            <span className="rule-text">Best of 10 rounds</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🎯</span>
            <span className="rule-text">Winner steals 1 card</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">💎</span>
            <span className="rule-text">Duplicates = 25 Shards</span>
          </div>
        </div>
      </div>

      <div className="card-progress">
        <div className="progress-label">
          <span>Card Collection Progress</span>
          <span>{cardCount} / 10</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${cardCount >= 10 ? 'complete' : ''}`}
            style={{ width: `${Math.min((cardCount / 10) * 100, 100)}%` }}
          />
        </div>
        {cardCount < 10 && (
          <p className="progress-hint">
            🎯 Collect {10 - cardCount} more cards by playing the guessing game!
          </p>
        )}
      </div>
    </div>
  );
};

export default Matchmaking;
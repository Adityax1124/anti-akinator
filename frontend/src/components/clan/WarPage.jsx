import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import WarHeader from './WarHeader';
import TeamDisplay from './TeamDisplay';
import WarStats from './WarStats';
import WarActions from './WarActions';
import './WarPage.css';

const WarPage = ({ onWarAction, userRole }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warData, setWarData] = useState(null);
  const [attacking, setAttacking] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Fetch war status
  const fetchWarStatus = useCallback(async () => {
    try {
      const response = await api.get('/clan-war/status');
      
      if (response.data.success) {
        setWarData(response.data);
        setError('');
      } else {
        setError(response.data.message || 'Failed to fetch war status');
      }
    } catch (err) {
      console.error('Fetch war status error:', err);
      setError(err.response?.data?.message || 'Failed to fetch war status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch war status on mount
  useEffect(() => {
    fetchWarStatus();
    
    // Set up refresh interval (every 30 seconds)
    const interval = setInterval(() => {
      fetchWarStatus();
    }, 30000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchWarStatus]);

  // Handle attack
  const handleAttack = async (targetUserId) => {
    if (attacking) return;
    
    setAttacking(true);
    setError('');
    
    try {
      const response = await api.post('/clan-war/attack', {
        warId: warData?.war?.id,
        targetUserId: targetUserId
      });
      
      if (response.data.success) {
        // Refresh war data after attack
        await fetchWarStatus();
        
        // Show result message
        if (response.data.result === 'win') {
          setError('🎉 You won the battle!');
        } else {
          setError('💀 You lost the battle...');
        }
        
        // Clear message after 3 seconds
        setTimeout(() => setError(''), 3000);
      } else {
        setError(response.data.message || 'Attack failed');
      }
    } catch (err) {
      console.error('Attack error:', err);
      setError(err.response?.data?.message || 'Failed to attack');
    } finally {
      setAttacking(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchWarStatus();
  };

  // Handle cancel search
  const handleCancelSearch = async () => {
    if (!window.confirm('Are you sure you want to cancel the war search?')) return;
    
    setLoading(true);
    try {
      const response = await api.post('/clan-war/cancel-search');
      if (response.data.success) {
        await fetchWarStatus();
        setError('Search cancelled');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel search');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to history
  const handleViewHistory = () => {
    navigate('/clan/war/history');
  };

  // Navigate to leaderboard
  const handleViewLeaderboard = () => {
    navigate('/clan/war/leaderboard');
  };

  // Navigate to notifications
  const handleGoToNotifications = () => {
    navigate('/notifications');
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!warData?.war?.timers) return null;
    
    const { status, timers } = warData.war;
    
    if (status === 'searching') return null;
    
    let endTime;
    if (status === 'preparation') {
      endTime = timers.preparationEndsAt;
    } else if (status === 'battle') {
      endTime = timers.battleEndsAt;
    } else {
      return null;
    }
    
    if (!endTime) return null;
    
    const now = new Date();
    const end = new Date(endTime);
    const diff = Math.floor((end - now) / 1000);
    
    if (diff <= 0) return '00:00:00';
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // ✅ FIXED: Check if user is leader using passed userRole prop
  const isLeader = userRole === 'leader';

  // If no war, show empty state
  if (!loading && !warData?.hasWar) {
    return (
      <div className="war-page">
        <div className="war-empty">
          <div className="war-empty-icon">⚔️</div>
          <h2>No Active War</h2>
          <p>Your clan is not currently in a war.</p>
          <p className="war-empty-hint">
            {isLeader 
              ? 'As the leader, you can start a war from the clan members tab!' 
              : 'Wait for your clan leader to start a war!'}
          </p>
          <div className="war-empty-actions">
            <button className="empty-btn refresh" onClick={handleRefresh}>
              🔄 Refresh
            </button>
            <button className="empty-btn history" onClick={handleViewHistory}>
              📊 View History
            </button>
            {isLeader && (
              <button 
                className="empty-btn start-war"
                onClick={() => navigate('/clan')}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: '#fff'
                }}
              >
                ⚔️ Go to Members to Start War
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="war-page">
        <div className="war-loading">
          <div className="loading-spinner-large"></div>
          <p>Loading war data...</p>
        </div>
      </div>
    );
  }

  // Extract war data
  const war = warData?.war;
  if (!war) {
    return (
      <div className="war-page">
        <div className="war-error">
          <span className="error-icon">❌</span>
          <p>No war data available</p>
          <button className="error-btn" onClick={handleRefresh}>Refresh</button>
        </div>
      </div>
    );
  }

  const isComplete = war.status === 'completed';
  const isSearching = war.status === 'searching';
  const canCancel = isSearching && isLeader;

  return (
    <div className="war-page">
      {/* Background Effects */}
      <div className="war-bg-noise"></div>
      <div className="war-bg-grid"></div>
      <div className="war-aurora war-aurora-1"></div>
      <div className="war-aurora war-aurora-2"></div>

      {/* Error Message */}
      {error && (
        <div className={`war-alert ${error.includes('won') || error.includes('🎉') ? 'success' : 'error'}`}>
          {error}
        </div>
      )}

      {/* War Header */}
      <WarHeader
        clan1Name={war.userClan?.name || 'Your Clan'}
        clan2Name={war.opponent?.name || 'Opponent'}
        clan1Score={war.clan1Wins || 0}
        clan2Score={war.clan2Wins || 0}
        timeLeft={getTimeRemaining()}
        status={war.status}
        isComplete={isComplete}
        winner={war.winner}
      />

      {/* War Content */}
      <div className="war-content">
        {/* Our Team */}
        <div className="war-team-section our-team">
          <TeamDisplay
            teamName={`${war.userClan?.name || 'Your Clan'} (Our Team)`}
            players={war.userClanMembers || []}
            showCards={true}
            isOurTeam={true}
            currentUserId={user?._id}
            maxDisplay={10}
          />
        </div>

        {/* VS Divider */}
        {!isSearching && (
          <div className="war-vs-divider">
            <span className="vs-text">⚔️ VS ⚔️</span>
            {war.status === 'preparation' && (
              <span className="vs-subtext">Preparation Phase</span>
            )}
            {war.status === 'battle' && (
              <span className="vs-subtext battle">⚔️ Battle Phase</span>
            )}
          </div>
        )}

        {/* Opponent Team */}
        {!isSearching && (
          <div className="war-team-section opponent-team">
            <TeamDisplay
              teamName={war.opponent?.name || 'Opponent Team'}
              players={war.opponentMembers || []}
              showCards={false}
              isOurTeam={false}
              onAttack={handleAttack}
              canAttack={war.status === 'battle' && !isComplete}
              currentUserId={user?._id}
              maxDisplay={10}
            />
          </div>
        )}

        {/* Searching State */}
        {isSearching && (
          <div className="war-searching">
            <div className="searching-animation">
              <span className="searching-icon">🔍</span>
              <span className="searching-dot">.</span>
              <span className="searching-dot">.</span>
              <span className="searching-dot">.</span>
            </div>
            <h3>Searching for Opponent...</h3>
            <p>Looking for another clan to battle against.</p>
            <p className="searching-members">
              {war.userClanMembers?.length || 0}/10 members ready
            </p>
            {isLeader && (
              <p className="searching-hint">
                You can leave this page, we'll keep searching!
              </p>
            )}
          </div>
        )}
      </div>

      {/* War Stats */}
      {!isSearching && !isComplete && (
        <WarStats
          stats={{
            totalBattles: (war.clan1Wins || 0) + (war.clan2Wins || 0),
            totalWins: war.clan1Wins || 0,
            totalLosses: war.clan2Wins || 0,
            winRate: war.clan1Wins > 0 || war.clan2Wins > 0 
              ? Math.round(((war.clan1Wins || 0) / ((war.clan1Wins || 0) + (war.clan2Wins || 0))) * 100)
              : 0,
            clan1Wins: war.clan1Wins || 0,
            clan2Wins: war.clan2Wins || 0,
            clan1Name: war.userClan?.name || 'Your Clan',
            clan2Name: war.opponent?.name || 'Opponent',
            timeRemaining: getTimeRemaining(),
            phase: war.status
          }}
        />
      )}

      {/* War Actions */}
      <WarActions
        onRefresh={handleRefresh}
        onViewHistory={handleViewHistory}
        onViewLeaderboard={handleViewLeaderboard}
        onGoToNotifications={handleGoToNotifications}
        onCancelSearch={handleCancelSearch}
        isSearching={isSearching}
        isLeader={isLeader}
        isComplete={isComplete}
        canCancel={canCancel}
        loading={loading || attacking}
      />

      {/* War Complete Message */}
      {isComplete && (
        <div className="war-complete-banner">
          <div className="banner-content">
            <span className="banner-icon">🏁</span>
            <span className="banner-text">
              {war.winner === 'clan1' 
                ? `${war.userClan?.name || 'Your Clan'} Wins! 🏆` 
                : war.winner === 'clan2'
                  ? `${war.opponent?.name || 'Opponent'} Wins! 💀`
                  : 'Draw! 🤝'}
            </span>
          </div>
          <div className="banner-subtext">
            {war.winner === 'clan1' && (
              <span>🎁 Check your notifications for rewards!</span>
            )}
            {war.winner === 'clan2' && (
              <span>Better luck next time! 💪</span>
            )}
            {!war.winner && (
              <span>A close battle! 🤝</span>
            )}
          </div>
          <button 
            className="banner-btn"
            onClick={handleGoToNotifications}
          >
            🔔 Go to Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default WarPage;
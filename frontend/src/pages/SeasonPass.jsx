// /frontend/src/pages/SeasonPass.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PaymentQRModal from '../components/PaymentQRModal';
import './SeasonPass.css';

const SEASON_PASS_PRICE = 149; // ₹149 INR

const SeasonPass = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [seasonData, setSeasonData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // ✅ API_URL is already handled by axios baseURL
  // No changes needed here as axios uses the baseURL from its config

  const fetchSeasonPass = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/season-pass/active');
      if (response.data.success) {
        if (response.data.hasActiveSeason) {
          setSeasonData(response.data.season);
          setProgress(response.data.progress);
          setTiers(response.data.tiers || []);
        } else {
          setSeasonData(null);
          setProgress(null);
          setTiers([]);
        }
      }
    } catch (err) {
      console.error('Fetch season pass error:', err);
      setError('Failed to load season pass');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasonPass();
  }, [fetchSeasonPass]);

  const handleClaimReward = async (tier, rewardIndex) => {
    if (claiming) return;
    setClaiming(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/season-pass/claim/${tier}`, {
        rewardIndex: rewardIndex
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        await fetchSeasonPass();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim reward');
      setTimeout(() => setError(''), 3000);
    } finally {
      setClaiming(false);
    }
  };

  const handleQRPurchase = () => {
    if (!user) {
      setError('Please login to continue.');
      return;
    }
    setShowQRModal(true);
  };

  const handleQRSuccess = (data) => {
    setSuccess('✅ Season Pass purchase submitted! We will verify and activate your pass.');
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleQRError = (error) => {
    setError(error || 'Failed to submit payment verification. Please try again.');
    setTimeout(() => setError(''), 5000);
  };

  const getTierIcon = (tier) => {
    if (tier === 1) return '🥉';
    if (tier <= 25) return '⭐';
    if (tier <= 50) return '🌟';
    if (tier <= 75) return '✨';
    if (tier <= 99) return '💫';
    return '👑';
  };

  const getTierColor = (tier, totalTiers) => {
    const progress = tier / totalTiers;
    if (progress <= 0.25) return '#4a9eff';
    if (progress <= 0.50) return '#4ecdc4';
    if (progress <= 0.75) return '#a855f7';
    return '#f59e0b';
  };

  const getRewardIcon = (type) => {
    const icons = {
      'shards': '🎴',
      'gems': '💎',
      'card': '🃏',
      'title': '🏆',
      'banner': '🎨',
      'profilePhoto': '📸',
      'background': '🖼️'
    };
    return icons[type] || '🎁';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // ✅ FIX: Check both progress.active AND user's seasonPass.active
  const isSeasonPassActive = progress?.active === true || user?.seasonPass?.active === true;

  if (loading) {
    return (
      <div className="season-pass-page">
        <div className="season-pass-loading">
          <div className="loader"></div>
          <p>Loading Season Pass...</p>
        </div>
      </div>
    );
  }

  if (!seasonData) {
    return (
      <div className="season-pass-page">
        <div className="season-pass-empty">
          <span className="empty-icon">🎫</span>
          <h2>No Active Season</h2>
          <p>There is no active season pass right now.</p>
          <p className="empty-hint">Check back later for new seasons!</p>
        </div>
      </div>
    );
  }

  const totalTiers = seasonData.totalTiers || 100;
  const currentTier = progress?.currentTier || 1;
  const progressPercent = progress?.progress || 0;
  const isCompleted = progress?.isCompleted || false;
  const hasActivePass = isSeasonPassActive;

  return (
    <div className="season-pass-page">
      <div className="season-pass-bg-noise"></div>
      <div className="season-pass-bg-grid"></div>
      <div className="season-pass-aurora season-pass-aurora-1"></div>
      <div className="season-pass-aurora season-pass-aurora-2"></div>

      {/* Header */}
      <div className="season-pass-header">
        <div className="season-pass-header-content">
          <div className="season-pass-title">
            <span className="title-icon">🎫</span>
            <h1>{seasonData.seasonName || `Season ${seasonData.seasonNumber}`}</h1>
          </div>
          <div className="season-pass-meta">
            <span className="meta-item">
              ⏱️ {seasonData.timeRemaining || 'Ending soon'}
            </span>
            <span className="meta-item">
              📅 {formatDate(seasonData.startDate)} - {formatDate(seasonData.endDate)}
            </span>
          </div>
          <div className="season-pass-status">
            <span className={`status-badge ${hasActivePass ? 'active' : 'inactive'}`}>
              {hasActivePass ? '✅ Active' : '🔒 Not Purchased'}
            </span>
          </div>
        </div>
      </div>

      {/* Error/Success */}
      {error && <div className="season-pass-alert error">{error}</div>}
      {success && <div className="season-pass-alert success">{success}</div>}

      {/* Purchase Section - Show if no active pass */}
      {!hasActivePass && (
        <div className="season-pass-purchase">
          <div className="purchase-card">
            <div className="purchase-content">
              <div className="purchase-info">
                <h2>🎯 Unlock Premium Rewards</h2>
                <p>Get access to exclusive rewards, bonus shards, and premium content!</p>
                <div className="purchase-benefits">
                  <div className="benefit-item">
                    <span>🏆</span>
                    <span>{totalTiers}+ Tiers of Rewards</span>
                  </div>
                  <div className="benefit-item">
                    <span>🎴</span>
                    <span>Bonus Shards</span>
                  </div>
                  <div className="benefit-item">
                    <span>💎</span>
                    <span>Exclusive Gems</span>
                  </div>
                  <div className="benefit-item">
                    <span>🃏</span>
                    <span>Rare Cards</span>
                  </div>
                </div>
              </div>
              <div className="purchase-actions">
                <div className="price-display">
                  <span className="price-amount">₹{SEASON_PASS_PRICE}</span>
                  <span className="price-label">One-time purchase</span>
                </div>
                
                {/* ✅ Only QR Code payment option */}
                <div className="payment-methods-compact">
                  <button
                    className="payment-btn qr"
                    onClick={handleQRPurchase}
                    disabled={isPurchasing}
                  >
                    <span>📱</span>
                    Pay with QR Code (UPI)
                  </button>
                </div>
                <p className="purchase-note">✓ Manual verification within 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Section - Show only if pass is active */}
      {hasActivePass && (
        <div className="season-pass-progress">
          <div className="progress-header">
            <div className="progress-info">
              <span className="progress-tier">
                Tier {currentTier}/{totalTiers}
              </span>
              <span className="progress-guesses">
                🎯 {progress?.correctGuesses || 0} correct guesses
              </span>
              {isCompleted && (
                <span className="progress-completed">🏆 Completed!</span>
              )}
            </div>
            <div className="progress-percentage">{Math.round(progressPercent)}%</div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(progressPercent, 100)}%`,
                background: isCompleted
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)'
                  : 'linear-gradient(90deg, #4a9eff, #8b5cf6)'
              }}
            />
          </div>
          <div className="progress-hint">
            {isCompleted ? (
              '🎉 You completed the season pass!'
            ) : (
              `Need ${seasonData.correctGuessesPerTier || 2} correct guesses per tier`
            )}
          </div>
        </div>
      )}

      {/* Tiers Grid */}
      <div className="season-pass-tiers">
        <div className="tiers-header">
          <h2>🎯 Tiers</h2>
          <span className="tiers-count">
            {hasActivePass ? `${tiers.filter(t => t.isUnlocked).length}/${totalTiers} unlocked` : '🔒 Purchase to unlock'}
          </span>
        </div>

        <div className="tiers-grid">
          {tiers.map((tierData) => {
            const tierNumber = tierData.tier;
            const isUnlocked = hasActivePass && tierData.isUnlocked;
            const hasUnclaimed = hasActivePass && (tierData.hasUnclaimedRewards || false);
            const rewards = tierData.rewards || [];

            return (
              <div
                key={tierNumber}
                className={`tier-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                style={{
                  borderColor: isUnlocked ? getTierColor(tierNumber, totalTiers) : 'rgba(255,255,255,0.05)'
                }}
              >
                <div className="tier-header">
                  <span className="tier-number">
                    {getTierIcon(tierNumber)} Tier {tierNumber}
                  </span>
                  <span className="tier-status">
                    {isUnlocked ? '🔓' : '🔒'}
                  </span>
                </div>

                <div className="tier-rewards">
                  {rewards.length === 0 ? (
                    <div className="tier-no-rewards">No rewards</div>
                  ) : (
                    rewards.map((reward, index) => {
                      const isClaimed = hasActivePass && (reward.isClaimed || false);
                      const isClaimable = hasActivePass && isUnlocked && !isClaimed;

                      return (
                        <div
                          key={index}
                          className={`tier-reward ${isClaimed ? 'claimed' : ''} ${isClaimable ? 'claimable' : ''}`}
                        >
                          <span className="reward-icon">
                            {getRewardIcon(reward.type)}
                          </span>
                          <span className="reward-name">
                            {reward.itemName || reward.type}
                            {reward.amount && ` x${reward.amount}`}
                          </span>
                          {isClaimable && (
                            <button
                              className="reward-claim-btn"
                              onClick={() => handleClaimReward(tierNumber, index)}
                              disabled={claiming}
                            >
                              Claim
                            </button>
                          )}
                          {isClaimed && (
                            <span className="reward-claimed">✅</span>
                          )}
                          {!hasActivePass && (
                            <span className="reward-locked">🔒</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {hasUnclaimed && (
                  <div className="tier-unclaimed-badge">🎁 Unclaimed</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* QR Payment Modal */}
      {user && (
        <PaymentQRModal
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
          }}
          userId={user._id}
          itemType="seasonpass"
          itemName={seasonData?.seasonName || `Season ${seasonData?.seasonNumber}`}
          amount={SEASON_PASS_PRICE}
          itemDetails={{
            seasonId: seasonData?._id,
            seasonNumber: seasonData?.seasonNumber,
            durationDays: 30
          }}
          onSuccess={handleQRSuccess}
          onError={handleQRError}
        />
      )}
    </div>
  );
};

export default SeasonPass;
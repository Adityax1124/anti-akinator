import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './ReferralPage.css';

const ReferralPage = () => {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/referral/info');
      setReferralData(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching referral data:', error);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const message = `🎯 Join me on Anti-Akinator! Use my referral code: ${referralData?.referralCode}\n\n${referralData?.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="referral-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`referral-page ${isVisible ? 'visible' : ''}`}>
      <div className="bg-noise"></div>
      <div className="bg-grid"></div>

      <div className="referral-page-header">
        <div className="referral-badge">
          <span className="badge-dot"></span>
          Refer & Earn
        </div>
        <h1>Invite Friends, Earn Shards</h1>
        <p>Invite friends and earn <strong>50 Shards</strong> each!</p>
      </div>

      {error && <div className="referral-error">{error}</div>}

      <div className="referral-page-content">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>

        <div className="referral-code-section">
          <label>Your Referral Code</label>
          <div className="referral-code-box">
            <span className="referral-code">{referralData?.referralCode}</span>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(referralData?.referralCode)}
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div className="share-section">
          <label>Share with friends</label>
          <div className="share-buttons">
            <button className="share-btn whatsapp" onClick={shareOnWhatsApp}>
              📱 WhatsApp
            </button>
            <button
              className="share-btn copy-link"
              onClick={() => copyToClipboard(referralData?.referralLink)}
            >
              🔗 Copy Link
            </button>
          </div>
        </div>

        <div className="referral-stats">
          <h3>📊 Your Earnings</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{referralData?.stats?.totalReferrals || 0}</span>
              <span className="stat-label">Total Referrals</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{referralData?.stats?.completedReferrals || 0}</span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">🎴 {referralData?.stats?.shardsEarned || 0}</span>
              <span className="stat-label">Shards Earned</span>
            </div>
          </div>
        </div>

        <div className="how-it-works">
          <h3>📖 How it works</h3>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <span className="step-text">Share your referral code with friends</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span className="step-text">Friend registers with your code</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span className="step-text">Friend guesses 1 correct answer → <strong>You both get 50 Shards!</strong></span>
            </div>
          </div>
          <div className="total-reward">
            🎯 Total reward: <strong>50 Shards</strong> for you + <strong>50 Shards</strong> for your friend!
          </div>
        </div>

        {referralData?.recentReferrals?.length > 0 && (
          <div className="recent-referrals">
            <h3>🔄 Recent Referrals</h3>
            <div className="referral-list">
              {referralData.recentReferrals.map((ref, index) => (
                <div key={index} className="referral-item">
                  <span className="ref-username">{ref.username}</span>
                  <span className={`ref-status ${ref.status}`}>
                    {ref.status === 'completed' && '✅ Completed'}
                    {ref.status === 'registered' && '📝 Registered'}
                    {ref.status === 'pending' && '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralPage;
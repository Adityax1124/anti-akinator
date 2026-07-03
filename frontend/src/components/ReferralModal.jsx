import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import './ReferralModal.css';

const ReferralModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchReferralData();
    }
  }, [isOpen]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      console.log('📊 [REFERRAL MODAL] Fetching referral data...');
      const response = await api.get('/referral/info');
      console.log('📊 [REFERRAL MODAL] Response:', response.data);
      setReferralData(response.data);
      setError('');
    } catch (error) {
      console.error('❌ [REFERRAL MODAL] Error fetching referral data:', error);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', error.response?.data);
      
      if (error.response?.status === 404) {
        setError('Referral system is not set up yet. Please contact support.');
      } else if (error.response?.status === 401) {
        setError('Please login to view your referral info.');
      } else {
        setError('Failed to load referral data. Please try again.');
      }
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

  const shareOnTwitter = () => {
    const message = `🎯 Join me on Anti-Akinator! Use my referral code: ${referralData?.referralCode} to get free Shards!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralData?.referralLink)}`, '_blank');
  };

  const shareOnTelegram = () => {
    const message = `🎯 Join me on Anti-Akinator! Use my referral code: ${referralData?.referralCode}\n\n${referralData?.referralLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralData?.referralLink)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="referral-overlay" onClick={onClose}>
      <div className="referral-modal" onClick={(e) => e.stopPropagation()}>
        <button className="referral-close" onClick={onClose}>✕</button>
        
        <div className="referral-header">
          <h2>🤝 Refer & Earn</h2>
          <p>Invite friends and earn <strong>50 Shards</strong> each!</p>
        </div>

        {loading ? (
          <div className="referral-loading">
            <div className="loader"></div>
            <p>Loading your referral info...</p>
          </div>
        ) : error ? (
          <div className="referral-error">{error}</div>
        ) : (
          <>
            {/* Debug Info - Remove after testing */}
            <div className="debug-info" style={{ 
              background: 'rgba(255,255,255,0.05)', 
              padding: '8px 12px', 
              borderRadius: '8px', 
              marginBottom: '12px',
              fontSize: '11px',
              color: '#888',
              display: 'none' // Hidden by default, show for debugging
            }}>
              <div>✅ Referral Code: {referralData?.referralCode}</div>
              <div>📊 Total Referrals: {referralData?.stats?.totalReferrals || 0}</div>
              <div>🎴 Shards Earned: {referralData?.stats?.shardsEarned || 0}</div>
            </div>

            {/* Referral Code */}
            <div className="referral-code-section">
              <label>Your Referral Code</label>
              <div className="referral-code-box">
                <span className="referral-code">{referralData?.referralCode || 'Loading...'}</span>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(referralData?.referralCode || '')}
                  disabled={!referralData?.referralCode}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="share-section">
              <label>Share with friends</label>
              <div className="share-buttons">
                <button className="share-btn whatsapp" onClick={shareOnWhatsApp}>
                  📱 WhatsApp
                </button>
                <button className="share-btn telegram" onClick={shareOnTelegram}>
                  ✈️ Telegram
                </button>
                <button className="share-btn twitter" onClick={shareOnTwitter}>
                  🐦 Twitter
                </button>
                <button 
                  className="share-btn copy-link"
                  onClick={() => copyToClipboard(referralData?.referralLink || '')}
                  disabled={!referralData?.referralLink}
                >
                  🔗 Copy Link
                </button>
              </div>
            </div>

            {/* Referral Link */}
            <div className="referral-link-section">
              <label>Your Referral Link</label>
              <div className="referral-link-box">
                <span className="referral-link">{referralData?.referralLink || 'Generating...'}</span>
                <button 
                  className="copy-link-btn"
                  onClick={() => copyToClipboard(referralData?.referralLink || '')}
                  disabled={!referralData?.referralLink}
                >
                  {copied ? '✅' : '📋'}
                </button>
              </div>
            </div>

            {/* Stats */}
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

            {/* How it works */}
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
                  <span className="step-text">Friend wins their first game → <strong>You both get 50 Shards!</strong></span>
                </div>
              </div>
              <div className="total-reward">
                🎯 Total reward: <strong>50 Shards</strong> for you + <strong>50 Shards</strong> for your friend!
              </div>
            </div>

            {/* Recent Referrals */}
            {referralData?.recentReferrals?.length > 0 && (
              <div className="recent-referrals">
                <h3>🔄 Recent Referrals</h3>
                <div className="referral-list">
                  {referralData.recentReferrals.map((ref, index) => (
                    <div key={index} className="referral-item">
                      <span className="ref-username">{ref.username || 'Unknown'}</span>
                      <span className={`ref-status ${ref.status || 'pending'}`}>
                        {ref.status === 'completed' && '✅ Completed'}
                        {ref.status === 'registered' && '📝 Registered'}
                        {ref.status === 'pending' && '⏳ Pending'}
                        {!ref.status && '⏳ Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Referrals Yet */}
            {(!referralData?.recentReferrals || referralData?.recentReferrals?.length === 0) && (
              <div className="no-referrals">
                <p style={{ color: '#666', textAlign: 'center', fontSize: '14px', marginTop: '8px' }}>
                  No referrals yet. Share your code and start earning! 🚀
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReferralModal;
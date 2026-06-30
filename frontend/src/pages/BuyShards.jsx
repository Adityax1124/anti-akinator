import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './BuyShards.css';

const BuyShards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ UPDATED: Popular badge moved to 750 Shards (id: 4)
  const shardsPacks = [
    { id: 1, shards: 50, price: 35, label: 'Starter' },
    { id: 2, shards: 150, price: 105, label: 'Enthusiast' },  // ❌ Removed isPopular
    { id: 3, shards: 350, price: 210, label: 'Pro' },
    { id: 4, shards: 750, price: 375, label: '', isPopular: true },  // ✅ Added isPopular here
    { id: 5, shards: 1500, price: 750, label: 'Ultimate', isUltimate: true },
    { id: 6, shards: 3000, price: 1350, label: 'Legendary', isLegendary: true },
  ];

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSelectPack = (pack) => {
    setSelectedPack(pack);
    setError('');
  };

  const handlePurchase = async () => {
    if (!selectedPack) {
      setError('Please select a shards pack.');
      return;
    }

    if (!agreed) {
      setError('You must agree to the Terms & Conditions, Privacy Policy, and Refund Policy.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Create Razorpay order
      const orderResponse = await api.post('/payment/create-order', {
        amount: selectedPack.price,
        shards: selectedPack.shards,
        packId: selectedPack.id
      });

      const { orderId, amount, currency } = orderResponse.data;

      // Step 2: Initialize Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100, // Convert to paise
        currency: currency,
        name: 'Anti-Akinator',
        description: `${selectedPack.shards} Shards Pack - ${selectedPack.label}`,
        image: '/logo.png',
        order_id: orderId,
        handler: async (response) => {
          // Step 3: Verify payment
          try {
            const verifyResponse = await api.post('/payment/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              shards: selectedPack.shards
            });

            if (verifyResponse.data.success) {
              setSuccess(`✅ Successfully purchased ${selectedPack.shards} Shards!`);
              setSelectedPack(null);
              setAgreed(false);
              // Update user's shards in UI
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            setError('Payment verification failed. Please contact support.');
          }
          setLoading(false);
        },
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#7b2ffc',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled.');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  // Calculate hints for a pack
  const getHints = (shards) => {
    return Math.floor(shards / 50);
  };

  return (
    <div className="buy-shards-container fade-in">
      <div className="buy-shards-header">
        <h1>🎴 Buy Character Shards</h1>
        <p>Purchase shards to use hints and unlock premium features</p>
        <p className="current-shards">
          You have <strong>{user?.shards || 0}</strong> Shards
        </p>
      </div>

      {error && <div className="buy-shards-error">{error}</div>}
      {success && <div className="buy-shards-success">{success}</div>}

      <div className="shards-packs-grid">
        {shardsPacks.map((pack) => (
          <div
            key={pack.id}
            className={`shards-pack ${selectedPack?.id === pack.id ? 'selected' : ''}`}
            onClick={() => handleSelectPack(pack)}
          >
            {/* ✅ UPDATED: Popular badge shows on id: 4 with YELLOW color */}
            <div className={`pack-label ${pack.isPopular ? 'popular' : ''} ${pack.isUltimate ? 'ultimate' : ''} ${pack.isLegendary ? 'legendary' : ''}`}>
              {pack.label}
              {pack.isPopular && <span className="popular-badge">⭐ POPULAR</span>}
            </div>
            <div className="pack-shards">🎴 {pack.shards} Shards</div>
            <div className="pack-price">₹{pack.price} <span>INR</span></div>
            <div className="pack-hints">💡 <strong>{getHints(pack.shards)}</strong> Hints</div>
            {selectedPack?.id === pack.id && (
              <div className="pack-selected-badge">✓ Selected</div>
            )}
          </div>
        ))}
      </div>

      {selectedPack && (
        <div className="purchase-section">
          <div className="purchase-summary">
            <h3>📋 Order Summary</h3>
            <p>
              <span>Package:</span>
              <strong>{selectedPack.label} – {selectedPack.shards} Shards</strong>
            </p>
            <p>
              <span>Price:</span>
              <strong>₹{selectedPack.price}</strong>
            </p>
            <p>
              <span>Hints Included:</span>
              <strong>{getHints(selectedPack.shards)} hints</strong>
            </p>
          </div>

          {/* ===== AGREEMENT CHECKBOX ===== */}
          <div className="agreement-section">
            <label className="agreement-checkbox">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </a>
                ,{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                , and{' '}
                <a href="/refund" target="_blank" rel="noopener noreferrer">
                  Refund & Cancellation Policy
                </a>
                .
              </span>
            </label>
          </div>

          <button
            className="btn btn-primary purchase-btn"
            onClick={handlePurchase}
            disabled={!agreed || loading}
          >
            {loading ? 'Processing...' : `Buy ${selectedPack.shards} Shards ₹${selectedPack.price}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BuyShards;
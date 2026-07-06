import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './BuyShards.css';

const shardPackages = [
  { id: 1, name: 'STARTER', shards: 50, price: '₹36 INR', priceValue: 36, hints: 1, tag: null },
  { id: 2, name: 'ENTHUSIAST', shards: 150, price: '₹105 INR', priceValue: 105, hints: 3, tag: null },
  { id: 3, name: 'PRO', shards: 350, price: '₹210 INR', priceValue: 210, hints: 7, tag: null },
  { id: 4, name: 'POPULAR', shards: 750, price: '₹375 INR', priceValue: 375, hints: 15, tag: '⭐ Popular' },
  { id: 5, name: 'ULTIMATE', shards: 1500, price: '₹750 INR', priceValue: 750, hints: 30, tag: null },
  { id: 6, name: 'LEGENDARY', shards: 3000, price: '₹1350 INR', priceValue: 1350, hints: 60, tag: null },
];

const BuyShards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const purchaseRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      cancelAnimationFrame(frame);
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (selectedPack) {
      const frame = requestAnimationFrame(() => {
        setShowPurchase(true);
        purchaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setShowPurchase(false);
    }
  }, [selectedPack]);

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
      const orderResponse = await api.post('/payment/create-order', {
        amount: selectedPack.priceValue,
        shards: selectedPack.shards,
        packId: selectedPack.id,
      });

      const { orderId, amount, currency } = orderResponse.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: currency,
        name: 'Anti-Akinator',
        description: `${selectedPack.shards} Shards Pack - ${selectedPack.name}`,
        image: '/logo.png',
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await api.post('/payment/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              shards: selectedPack.shards,
            });

            if (verifyResponse.data.success) {
              setSuccess(`✅ Successfully purchased ${selectedPack.shards} Shards!`);
              setSelectedPack(null);
              setAgreed(false);
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              setError('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            setError('Payment verification failed. Please contact support.');
          }
          setLoading(false);
        },
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6c63ff',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={`buyshards-page ${isVisible ? 'visible' : ''}`}>
      <div className="bg-noise"></div>
      <div className="bg-grid"></div>

      <section className="buyshards-hero">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="buyshards-hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Power Up Your Collection
          </div>
          <h1 className="buyshards-title">
            <span className="buyshards-title-gradient">Buy Character Shards</span>
          </h1>
          <p className="buyshards-subtitle">Purchase shards to use hints and unlock premium features</p>
          <div className="shards-display">
            <span className="shards-icon">🎴</span>
            <span>You have</span>
            <strong>{user?.shards || 0}</strong>
            <span>Shards</span>
          </div>
        </div>
      </section>

      {error && <div className="buyshards-alert error">{error}</div>}
      {success && <div className="buyshards-alert success">{success}</div>}

      <div className="shards-packs-grid">
        {shardPackages.map((pack, index) => (
          <div
            key={pack.id}
            className={`shards-pack ${pack.tag ? 'popular' : ''} ${selectedPack?.id === pack.id ? 'selected' : ''} ${isVisible ? 'visible' : ''}`}
            style={{ animationDelay: `${0.15 + index * 0.08}s` }}
            onClick={() => handleSelectPack(pack)}
          >
            <div className="shards-pack-border"></div>
            {pack.tag && <div className="pack-tag">{pack.tag}</div>}
            {selectedPack?.id === pack.id && <div className="pack-selected-check">✓</div>}
            <div className="pack-name">{pack.name}</div>
            <div className="pack-shards">🎴 {pack.shards} Shards</div>
            <div className="pack-price">{pack.price}</div>
            <div className="pack-hints">💡 <strong>{pack.hints}</strong> Hints</div>
          </div>
        ))}
      </div>

      {selectedPack && (
        <div className={`purchase-section ${showPurchase ? 'visible' : ''}`} ref={purchaseRef}>
          <div className="purchase-summary">
            <h3>📋 Order Summary</h3>
            <p>
              <span>Package:</span>
              <strong>{selectedPack.name} – {selectedPack.shards} Shards</strong>
            </p>
            <p>
              <span>Price:</span>
              <strong className="price-highlight">{selectedPack.price}</strong>
            </p>
            <p>
              <span>Hints Included:</span>
              <strong>{selectedPack.hints} hints</strong>
            </p>
          </div>

          <div className="agreement-section">
            <label className="agreement-checkbox">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>,{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, and{' '}
                <a href="/refund" target="_blank" rel="noopener noreferrer">Refund & Cancellation Policy</a>.
              </span>
            </label>
          </div>

          <button
            className="purchase-btn"
            onClick={handlePurchase}
            disabled={!agreed || loading}
          >
            {loading ? 'Processing...' : `Buy ${selectedPack.shards} Shards · ${selectedPack.price}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BuyShards;
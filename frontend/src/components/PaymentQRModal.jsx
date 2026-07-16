// /frontend/src/components/PaymentQRModal.jsx
import React, { useState, useEffect } from 'react';
import './PaymentQRModal.css';

// Simple SVG Icons
const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const PaymentQRModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  itemType,
  itemName, 
  amount,
  itemDetails = {},
  onSuccess,
  onError
}) => {
  const [utrNumber, setUtrNumber] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('qr');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [utrError, setUtrError] = useState('');
  const [isUtrChecking, setIsUtrChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Lock body scroll when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setUtrNumber('');
      setPaidAmount('');
      setError('');
      setSuccess('');
      setUtrError('');
      setStep('qr');
      setLoading(false);
    }
  }, [isOpen]);

  const checkUtr = async (utr) => {
    if (!utr || utr.length < 6) {
      setUtrError('UTR must be at least 6 characters');
      return false;
    }

    setIsUtrChecking(true);
    setUtrError('');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUtrError('Please login to continue');
        return false;
      }

      const response = await fetch(`${API_URL}/api/transactions/check-utr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ utrNumber: utr })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Server responded with:', text);
        setUtrError(`Server error: ${response.status}. Please try again.`);
        return false;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        setUtrError('Server returned invalid response. Please try again.');
        return false;
      }

      if (!data.success) {
        setUtrError(data.message || 'Error checking UTR');
        return false;
      }

      if (!data.available) {
        setUtrError('This UTR number has already been used. Please check and try again.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking UTR:', error);
      setUtrError('Network error. Please check your connection and try again.');
      return false;
    } finally {
      setIsUtrChecking(false);
    }
  };

  const handleUtrChange = (e) => {
    const value = e.target.value.toUpperCase().trim();
    setUtrNumber(value);
    setUtrError('');
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!utrNumber || utrNumber.length < 6) {
      setError('Please enter a valid UTR number (minimum 6 characters)');
      return;
    }

    if (!paidAmount || parseFloat(paidAmount) < 1) {
      setError('Please enter a valid amount');
      return;
    }

    const isAvailable = await checkUtr(utrNumber);
    if (!isAvailable) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to continue');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/transactions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          utrNumber: utrNumber.toUpperCase(),
          paidAmount: parseFloat(paidAmount),
          expectedAmount: amount,
          itemType,
          itemName,
          itemDetails: {
            ...itemDetails,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Server error:', text);
        setError('Server error. Please try again.');
        setLoading(false);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        setError('Server returned invalid response. Please try again.');
        setLoading(false);
        return;
      }

      if (response.ok && data.success) {
        setSuccess('✅ Payment verification submitted successfully! We will verify and process your order within 24 hours.');
        setStep('qr');
        setUtrNumber('');
        setPaidAmount('');
        
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(data.data);
          }, 1000);
        }

        setTimeout(() => {
          onClose();
        }, 5000);
      } else {
        setError(data.message || 'Failed to submit payment verification. Please try again.');
        if (onError) onError(data.message);
      }
    } catch (error) {
      console.error('Error submitting transaction:', error);
      setError('Network error. Please check your connection and try again.');
      if (onError) onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyUpiId = () => {
    const upiId = 'adisinghx11@okaxis';
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const generateQRCode = () => {
    const upiId = 'adisinghx11@okaxis';
    const upiLink = `upi://pay?pa=${upiId}&pn=Anti-Akinator&am=${amount}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
  };

  const getFallbackQR = () => {
    const upiId = 'adisinghx11@okaxis';
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%231a1a2e"/%3E%3Ctext x="40" y="85" font-family="Arial" font-size="14" fill="%2394a3b8"%3EUPI ID:%3C/text%3E%3Ctext x="40" y="110" font-family="Arial" font-size="16" fill="%23ffffff"%3E${upiId}%3C/text%3E%3Ctext x="40" y="135" font-family="Arial" font-size="12" fill="%2364748b"%3EScan from UPI app%3C/text%3E%3Ctext x="40" y="160" font-family="Arial" font-size="11" fill="%2364748b"%3EAmount: ₹${amount}%3C/text%3E%3C/svg%3E`;
  };

  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={handleClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payment-modal-header">
          <h2 className="payment-modal-title">
            {step === 'qr' ? 'Pay with UPI' : 'Submit Payment Details'}
          </h2>
          <button 
            onClick={handleClose} 
            className="payment-modal-close"
            disabled={loading}
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="payment-modal-body">
          {step === 'qr' ? (
            // QR Code Step with Instructions
            <div className="qr-step">
              {/* Trust Badge */}
              <div className="trust-badge">
                <ShieldIcon />
                <span>100% Secure Payment</span>
                <span className="trust-dot">•</span>
                <span>Verified by Admin</span>
              </div>

              {/* Item Info */}
              <div className="item-info">
                <p className="item-name">{itemName}</p>
                <p className="item-amount">₹{amount}</p>
              </div>

              {/* Step Indicator */}
              <div className="step-indicator">
                <div className="step-dot active">1</div>
                <div className="step-line"></div>
                <div className="step-dot">2</div>
                <div className="step-line"></div>
                <div className="step-dot">3</div>
              </div>
              <div className="step-labels">
                <span className="step-label active">Pay</span>
                <span className="step-label">Submit</span>
                <span className="step-label">Verify</span>
              </div>

              {/* Instructions Box */}
              <div className="instructions-box">
                <div className="instruction-step">
                  <span className="instruction-number">1</span>
                  <span className="instruction-text">Scan QR code with your UPI app</span>
                </div>
                <div className="instruction-step">
                  <span className="instruction-number">2</span>
                  <span className="instruction-text">Pay <strong>₹{amount}</strong> via UPI</span>
                </div>
                <div className="instruction-step">
                  <span className="instruction-number">3</span>
                  <span className="instruction-text">Click <strong>"I've Made the Payment"</strong></span>
                </div>
              </div>

              {/* QR Code */}
              <div className="qr-container">
                <img 
                  src={generateQRCode()}
                  alt="Payment QR Code"
                  className="qr-image"
                  onError={(e) => {
                    e.target.src = getFallbackQR();
                  }}
                />
              </div>

              {/* UPI Details */}
              <div className="upi-details">
                <p className="upi-label">UPI ID:</p>
                <div className="upi-id-container">
                  <span className="upi-id">adisinghx11@okaxis</span>
                  <button onClick={copyUpiId} className="copy-btn">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="upi-hint">Scan QR code or copy UPI ID to pay</p>
                <p className="upi-hint" style={{ color: '#6b7280', marginTop: '4px' }}>
                  Amount: ₹{amount}
                </p>
              </div>

              {/* Trust Message */}
              <div className="trust-message">
                <InfoIcon />
                <span>Don't worry! Your payment will be verified within <strong>24 hours</strong> and you'll receive your item.</span>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setStep('form')}
                className="btn-primary"
              >
                I've Made the Payment
              </button>

              <button
                onClick={handleClose}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            // Form Step with Instructions
            <form onSubmit={handleSubmit} className="form-step">
              <button
                type="button"
                onClick={() => setStep('qr')}
                className="back-btn"
              >
                <ArrowLeftIcon />
                Back to QR
              </button>

              {/* Step Indicator */}
              <div className="step-indicator">
                <div className="step-dot done">✓</div>
                <div className="step-line"></div>
                <div className="step-dot active">2</div>
                <div className="step-line"></div>
                <div className="step-dot">3</div>
              </div>
              <div className="step-labels">
                <span className="step-label done">Pay</span>
                <span className="step-label active">Submit</span>
                <span className="step-label">Verify</span>
              </div>

              {/* Instruction */}
              <div className="form-instruction">
                <p>📋 Enter the UTR number and amount you paid. We'll verify and deliver your item within 24 hours.</p>
              </div>

              {/* Order Summary */}
              <div className="order-summary">
                <div className="summary-row">
                  <span className="summary-label">Item:</span>
                  <span className="summary-value">{itemName}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Expected Amount:</span>
                  <span className="summary-value highlight">₹{amount}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Status:</span>
                  <span className="status-badge">Pending Verification</span>
                </div>
              </div>

              {/* Form Fields */}
              <div className="form-group">
                <label htmlFor="utrNumber" className="form-label">
                  UTR Number <span className="required">*</span>
                </label>
                <input
                  id="utrNumber"
                  type="text"
                  value={utrNumber}
                  onChange={handleUtrChange}
                  placeholder="Enter UTR number from payment"
                  required
                  className={`form-input ${utrError ? 'error' : ''}`}
                  disabled={loading}
                  maxLength={20}
                />
                {utrError && (
                  <div className="error-message">
                    <AlertCircleIcon />
                    {utrError}
                  </div>
                )}
                <p className="input-hint">📱 Check your UPI app for UTR number (usually 12-20 characters)</p>
              </div>

              <div className="form-group">
                <label htmlFor="paidAmount" className="form-label">
                  Amount Paid (₹) <span className="required">*</span>
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`Enter the amount you paid`}
                  required
                  min="1"
                  step="1"
                  className="form-input"
                  disabled={loading}
                />
                <p className="input-hint">💵 Enter the exact amount you sent (should be ₹{amount})</p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="error-box">
                  <AlertCircleIcon />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="success-box">
                  <CheckIcon />
                  <span>{success}</span>
                </div>
              )}

              {/* Trust Message */}
              <div className="trust-message small">
                <ShieldIcon />
                <span>Your transaction is secure. Admin will verify and deliver within 24 hours.</span>
              </div>

              {/* Submit Buttons */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || isUtrChecking}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Submitting...
                    </>
                  ) : isUtrChecking ? (
                    <>
                      <span className="spinner"></span>
                      Checking UTR...
                    </>
                  ) : (
                    <>
                      <CreditCardIcon />
                      Submit Payment Details
                    </>
                  )}
                </button>
              </div>

              <p className="form-footer">
                🔒 Your submission will be verified within 24 hours. 
                You'll receive a confirmation once approved.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentQRModal;
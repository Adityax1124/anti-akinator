import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import './Auth.css';

const TwoFactorVerify = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.post('/2fa/verify-login', {
        email,
        code
      });

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🔐 2FA Verification</h1>
          <p>Enter the code from your authenticator app</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>6-Digit Code</label>
            <input
              type="text"
              className="form-control"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 6) setCode(value);
              }}
              maxLength={6}
              required
              autoFocus
              disabled={loading}
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
            />
            <small style={{ color: 'rgba(255,255,255,0.3)' }}>
              Enter the code from Google Authenticator, Authy, or use a backup code
            </small>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              Lost access? Use one of your <strong>backup codes</strong>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorVerify;
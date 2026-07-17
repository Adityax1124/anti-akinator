import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Auth.css';

const TwoFactorSetup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Show QR, 2: Verify, 3: Backup Codes
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState({ enabled: false });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/2fa/status');
      setStatus(response.data);
    } catch (error) {
    }
  };

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/2fa/setup');
      setSecret(response.data.secret);
      setQrCode(response.data.qrCode);
      setStep(2);
    } catch (error) {
      setError(error.response?.data?.message || 'Error setting up 2FA');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/2fa/verify', { code: verificationCode });
      setBackupCodes(response.data.backupCodes);
      setStep(3);
      setSuccess('2FA enabled successfully!');
      fetchStatus();
    } catch (error) {
      setError(error.response?.data?.message || 'Error verifying code');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    const code = prompt('Enter your 2FA code to disable:');
    if (!code) return;

    setLoading(true);
    try {
      await api.post('/2fa/disable', { code });
      setSuccess('2FA disabled successfully');
      fetchStatus();
      setStep(1);
    } catch (error) {
      setError(error.response?.data?.message || 'Error disabling 2FA');
    } finally {
      setLoading(false);
    }
  };

  if (status.enabled) {
    return (
      <div className="auth-container fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <h1>🔐 Two-Factor Authentication</h1>
            <p>2FA is currently <strong style={{ color: '#4caf50' }}>ENABLED</strong></p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="twofa-status">
            <p>✅ Your account is protected with 2FA</p>
            <p>Backup codes remaining: {status.backupCodesLeft || 0}</p>
          </div>

          <button
            className="btn btn-danger btn-block"
            onClick={disable2FA}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🔐 Two-Factor Authentication</h1>
          <p>Add an extra layer of security to your account</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {step === 1 && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
              2FA adds an extra layer of security to your account. 
              You'll need to enter a code from your authenticator app when logging in.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={startSetup}
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Start Setup'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <p>Scan this QR code with your authenticator app:</p>
              {qrCode && (
                <img 
                  src={qrCode} 
                  alt="QR Code" 
                  style={{ 
                    width: '200px', 
                    height: '200px', 
                    margin: '10px auto',
                    display: 'block'
                  }}
                />
              )}
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                Or enter this secret manually: <strong>{secret}</strong>
              </p>
            </div>

            <div className="form-group">
              <label>Enter 6-digit code from authenticator</label>
              <input
                type="text"
                className="form-control"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) setVerificationCode(value);
                }}
                maxLength={6}
                disabled={loading}
              />
            </div>

            <button
              className="btn btn-success btn-block"
              onClick={verifySetup}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>

            <button
              className="btn btn-secondary btn-block"
              onClick={() => setStep(1)}
              disabled={loading}
              style={{ marginTop: '10px' }}
            >
              Back
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <h2 style={{ color: '#4caf50' }}>✅ 2FA Enabled!</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                Your account is now protected with two-factor authentication.
              </p>

              <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '15px', 
                borderRadius: '8px',
                marginTop: '20px'
              }}>
                <p style={{ fontWeight: 'bold', color: '#ffd700' }}>
                  📋 Save these backup codes:
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '8px',
                  marginTop: '10px'
                }}>
                  {backupCodes.map((code, index) => (
                    <div key={index} style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '8px', 
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}>
                      {code}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>
                  ⚠️ These codes will only be shown once. Store them safely!
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                setStep(1);
                setSuccess('2FA enabled successfully!');
                fetchStatus();
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;
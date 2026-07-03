import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP: verifyOTPContext, resendOTP: resendOTPContext } = useAuth();

  useEffect(() => {
    const stateEmail = location.state?.email;
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (stateEmail) {
      setEmail(stateEmail);
      localStorage.setItem('pendingVerificationEmail', stateEmail);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate('/register');
    }
  }, [location, navigate]);

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const allFilled = otp.every(digit => digit !== '');
    if (allFilled && otp.length === 6) {
      handleVerify();
    }
  }, [otp]);

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, 6);
    
    if (digits) {
      const newOtp = [...otp];
      for (let i = 0; i < digits.length; i++) {
        newOtp[i] = digits[i];
      }
      setOtp(newOtp);
      
      const lastIndex = Math.min(digits.length - 1, 5);
      if (lastIndex < 5) {
        inputRefs.current[lastIndex + 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await verifyOTPContext(email, otpString);
      
      if (result.success) {
        setSuccess('✅ Email verified successfully!');
        localStorage.removeItem('pendingVerificationEmail');

        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(result.message || 'Failed to verify OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Failed to verify OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await resendOTPContext(email);
      
      if (result.success) {
        setSuccess('✅ New OTP sent to your email!');
        setTimer(300);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">📧</div>
          <h1>Verify Your Email</h1>
          <p>Enter the 6-digit code sent to</p>
          <p className="auth-email-display">{email}</p>
        </div>

        <div className="auth-form">
          <div className="otp-container">
            <div className="otp-inputs" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  disabled={loading || success}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="otp-timer">
            {timer > 0 ? (
              <p>⏳ Code expires in: <strong>{formatTime(timer)}</strong></p>
            ) : (
              <p className="expired">⌛ Code expired</p>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block verify-btn"
            onClick={handleVerify}
            disabled={loading || success || otp.some(d => d === '')}
          >
            {loading ? (
              <span className="loading-spinner">⏳ Verifying...</span>
            ) : (
              'Verify Email ✅'
            )}
          </button>

          <div className="otp-resend">
            {canResend || timer === 0 ? (
              <button
                type="button"
                className="resend-btn"
                onClick={handleResendOTP}
                disabled={loading}
              >
                🔄 Resend OTP
              </button>
            ) : (
              <p className="resend-text">Resend available in <strong>{formatTime(timer)}</strong></p>
            )}
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Wrong email? <Link to="/register" onClick={() => {
              localStorage.removeItem('pendingVerificationEmail');
            }}>Register again</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
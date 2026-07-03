import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [referralValid, setReferralValid] = useState(null);
  const [referralUsername, setReferralUsername] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ===== GET REFERRAL CODE FROM URL =====
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
      verifyReferralCode(refCode.toUpperCase());
    }
  }, [location.search]);

  // ===== VERIFY REFERRAL CODE =====
  const verifyReferralCode = async (code) => {
    if (!code || code.length < 6) return;
    
    setVerifying(true);
    try {
      const response = await api.post('/auth/verify-referral', { referralCode: code });
      if (response.data.success) {
        setReferralValid(true);
        setReferralUsername(response.data.referrer.username);
      }
    } catch (error) {
      setReferralValid(false);
      setReferralUsername('');
    } finally {
      setVerifying(false);
    }
  };

  const validateUsername = (username) => {
    const re = /^[a-zA-Z0-9_]+$/;
    return re.test(username) && username.length >= 3 && username.length <= 20;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'referralCode') {
      setReferralValid(null);
      setReferralUsername('');
      if (value.length >= 6) {
        verifyReferralCode(value);
      }
    }
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    const trimmedUsername = formData.username.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirmPassword = formData.confirmPassword.trim();
    const trimmedReferralCode = formData.referralCode.trim().toUpperCase();

    // Validate username
    if (!trimmedUsername) {
      newErrors.username = 'Username is required';
    } else if (trimmedUsername.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (trimmedUsername.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!validateUsername(trimmedUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Validate email
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate password
    if (!trimmedPassword) {
      newErrors.password = 'Password is required';
    } else if (trimmedPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/[A-Z]/.test(trimmedPassword)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(trimmedPassword)) {
      newErrors.password = 'Password must contain at least one number';
    }

    // Validate confirm password
    if (trimmedPassword !== trimmedConfirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // If there are errors, stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // ===== BUILD REGISTRATION DATA =====
      const registerData = {
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword
      };

      // ===== ✅ ONLY ADD REFERRAL CODE IF VALID =====
      if (trimmedReferralCode && trimmedReferralCode.length >= 6 && referralValid === true) {
        registerData.referralCode = trimmedReferralCode;
        console.log('📝 [Register] Sending referral code:', trimmedReferralCode);
      } else {
        console.log('ℹ️ [Register] No valid referral code provided');
      }

      const result = await register(registerData);
      
      if (result.success) {
        // Clear form data
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          referralCode: ''
        });
        navigate('/');
      } else {
        setErrors({ general: result.message || 'Registration failed. Please try again.' });
      }
    } catch (err) {
      if (err.message?.includes('Network')) {
        setErrors({ general: 'Network error. Please check your connection.' });
      } else if (err.response?.status === 429) {
        setErrors({ general: 'Too many registration attempts. Please wait.' });
      } else if (err.response?.status === 409) {
        setErrors({ general: 'User already exists with this email or username' });
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Join the Game! 🎮</h1>
          <p>Create your account and start guessing</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              className={`form-control ${errors.username ? 'is-invalid' : ''}`}
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={20}
              autoComplete="username"
              disabled={loading}
            />
            {errors.username && (
              <div className="auth-error" role="alert">
                {errors.username}
              </div>
            )}
            <small className="form-text text-muted">
              3-20 characters, letters, numbers, and underscores only
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              maxLength={100}
              disabled={loading}
            />
            {errors.email && (
              <div className="auth-error" role="alert">
                {errors.email}
              </div>
            )}
          </div>

          {/* ===== ✅ REFERRAL CODE FIELD ===== */}
          <div className="form-group">
            <label htmlFor="referralCode">Referral Code (Optional)</label>
            <input
              id="referralCode"
              type="text"
              name="referralCode"
              className={`form-control ${referralValid === false ? 'is-invalid' : ''} ${referralValid === true ? 'is-valid' : ''}`}
              placeholder="Enter referral code (e.g., JOHN-ABC1)"
              value={formData.referralCode}
              onChange={handleChange}
              maxLength={20}
              disabled={loading || verifying}
              autoCapitalize="characters"
              style={{ textTransform: 'uppercase' }}
            />
            {verifying && (
              <div className="auth-info">⏳ Verifying referral code...</div>
            )}
            {referralValid === true && (
              <div className="auth-success">✅ Referred by <strong>{referralUsername}</strong>! You'll both get 50 Shards when you win your first game! 🎉</div>
            )}
            {referralValid === false && formData.referralCode.length >= 6 && (
              <div className="auth-error">❌ Invalid referral code</div>
            )}
            <small className="form-text text-muted">
              Have a referral code? Enter it here to earn bonus Shards!
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              placeholder="Create a password (min 6 characters)"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
              disabled={loading}
            />
            {errors.password && (
              <div className="auth-error" role="alert">
                {errors.password}
              </div>
            )}
            <small className="form-text text-muted">
              Minimum 6 characters, at least 1 uppercase letter and 1 number
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
              disabled={loading}
            />
            {errors.confirmPassword && (
              <div className="auth-error" role="alert">
                {errors.confirmPassword}
              </div>
            )}
          </div>

          {errors.general && (
            <div className="auth-error" role="alert">
              {errors.general}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-secondary btn-block" 
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner">⏳ Creating Account...</span>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
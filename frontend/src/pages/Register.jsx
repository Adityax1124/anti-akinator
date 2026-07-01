import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  // ===== GET CSRF TOKEN =====
  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    if (token) {
      setCsrfToken(token);
    }
  }, []);

  // ===== VALIDATION FUNCTIONS =====
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
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // ===== FRONTEND VALIDATION =====
    const newErrors = {};
    const trimmedUsername = formData.username.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password.trim();
    const trimmedConfirmPassword = formData.confirmPassword.trim();

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
      const result = await register(
        trimmedUsername,
        trimmedEmail,
        trimmedPassword
      );
      
      if (result.success) {
        // Clear form data
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
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
              aria-label="Username"
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
              aria-label="Email address"
            />
            {errors.email && (
              <div className="auth-error" role="alert">
                {errors.email}
              </div>
            )}
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
              aria-label="Password"
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
              aria-label="Confirm password"
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

          {/* Hidden CSRF token field for form */}
          {csrfToken && (
            <input type="hidden" name="_csrf" value={csrfToken} />
          )}
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
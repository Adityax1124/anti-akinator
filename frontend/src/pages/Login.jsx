import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    if (token) {
      setCsrfToken(token);
    }
  }, []);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await login(trimmedEmail, trimmedPassword);

      if (result.success) {
        if (result.requires2FA) {
          navigate('/2fa-verify', {
            state: {
              email: result.email || trimmedEmail,
              userId: result.userId
            }
          });
          return;
        }

        setEmail('');
        setPassword('');
        navigate('/');
      } else {
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      if (err.message?.includes('Network')) {
        setError('Network error. Please check your connection.');
      } else if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 15 minutes.');
      } else if (err.response?.status === 423) {
        setError('Account is locked. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="aurora aurora-1"></div>
      <div className="aurora aurora-2"></div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">
            <span className="badge-dot"></span>
            Welcome Back
          </div>
          <h1>Anti-Akinator</h1>
          <p>Login to continue your anime journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              maxLength={100}
              disabled={loading}
              aria-label="Email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
              maxLength={100}
              disabled={loading}
              aria-label="Password"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner">⏳ Logging in...</span>
            ) : (
              'Login'
            )}
          </button>

          {csrfToken && (
            <input type="hidden" name="_csrf" value={csrfToken} />
          )}
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
          <p className="auth-links">
            <Link to="/forgot-password" className="forgot-link">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
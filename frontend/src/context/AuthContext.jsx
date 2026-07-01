import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

const SESSION_TIMEOUT = 30 * 60 * 1000;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [authError, setAuthError] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  
  const fetchUserRef = useRef(false);
  const sessionTimerRef = useRef(null);

  // ===== SET AUTH HEADER =====
  const setAuthHeader = useCallback((token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  // ===== LOGOUT =====
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout').catch(() => {});
    } catch (error) {
      // Ignore
    } finally {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      
      setToken(null);
      setUser(null);
      setAuthError(null);
      setSessionExpiry(null);
      
      console.log('🔴 Auth: Logged out successfully');
    }
  }, []);

  // ===== SESSION MANAGEMENT =====
  const resetSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
    }
    
    if (user && token) {
      const expiry = new Date(Date.now() + SESSION_TIMEOUT);
      setSessionExpiry(expiry);
      
      sessionTimerRef.current = setTimeout(() => {
        console.warn('🔐 Session expired due to inactivity');
        logout();
      }, SESSION_TIMEOUT);
    }
  }, [user, token, logout]);

  // ===== TRACK USER ACTIVITY =====
  useEffect(() => {
    if (!user) return;
    
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const resetTimer = () => resetSessionTimer();
    
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetSessionTimer();
    
    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    };
  }, [user, resetSessionTimer]);

  // ===== FETCH USER =====
  const fetchUser = useCallback(async () => {
    if (fetchUserRef.current) return;
    fetchUserRef.current = true;

    try {
      const response = await api.get('/auth/me', { params: { _t: Date.now() } });
      setUser(response.data.user);
      setAuthError(null);
      resetSessionTimer();
      return response.data.user;
    } catch (error) {
      console.error('🔴 Auth: Error fetching user:', error.message);
      if (error.response?.status === 401) {
        await logout();
      } else {
        setAuthError('Unable to fetch user data. Please try refreshing.');
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
      fetchUserRef.current = false;
    }
  }, [logout, resetSessionTimer]);

  // ===== REFRESH USER =====
  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return null;
    }
    
    setLoading(true);
    const userData = await fetchUser();
    setLoading(false);
    return userData;
  }, [token, fetchUser]);

  // ===== INITIALIZE AUTH =====
  useEffect(() => {
    if (token) {
      setAuthHeader(token);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, setAuthHeader, fetchUser]);

  // ===== LOGIN =====
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    try {
      const response = await api.post('/auth/login', { 
        email: email.trim().toLowerCase(), 
        password: password.trim() 
      });
      
      const data = response.data;

      if (data.requires2FA) {
        return {
          success: true,
          requires2FA: true,
          email: data.email,
          userId: data.userId,
          message: '2FA verification required'
        };
      }

      const { token, user } = data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', token);
      setToken(token);
      setAuthHeader(token);
      setUser(user);
      setAuthError(null);
      resetSessionTimer();
      
      console.log(`✅ Auth: ${user.username} logged in successfully`);
      
      return { 
        success: true,
        user: user
      };
    } catch (error) {
      console.error('❌ Auth: Login error:', error.message);
      
      let message = 'Login failed. Please try again.';
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            message = error.response.data?.message || 'Invalid email or password';
            break;
          case 401:
            message = error.response.data?.message || 'Invalid credentials';
            break;
          case 423:
            message = error.response.data?.message || 'Account is locked. Please try again later.';
            break;
          case 429:
            message = 'Too many login attempts. Please wait 15 minutes.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          default:
            message = error.response.data?.message || message;
        }
      } else if (error.message?.includes('Network')) {
        message = 'Network error. Please check your connection.';
      }
      
      setAuthError(message);
      
      return {
        success: false,
        message: message
      };
    }
  }, [setAuthHeader, resetSessionTimer]);

  // ===== REGISTER =====
  const register = useCallback(async (username, email, password) => {
    setAuthError(null);
    
    if (!username || !email || !password) {
      return {
        success: false,
        message: 'All fields are required'
      };
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return {
        success: false,
        message: 'Username can only contain letters, numbers, and underscores'
      };
    }

    if (username.length < 3 || username.length > 20) {
      return {
        success: false,
        message: 'Username must be 3-20 characters'
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: 'Please enter a valid email address'
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters'
      };
    }

    if (!/[A-Z]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one uppercase letter'
      };
    }

    if (!/[0-9]/.test(password)) {
      return {
        success: false,
        message: 'Password must contain at least one number'
      };
    }

    try {
      const response = await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim()
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', token);
      setToken(token);
      setAuthHeader(token);
      setUser(user);
      setAuthError(null);
      
      console.log(`✅ Auth: ${user.username} registered successfully`);
      
      return {
        success: true,
        user: user
      };
    } catch (error) {
      console.error('❌ Auth: Register error:', error.message);
      
      let message = 'Registration failed. Please try again.';
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            message = error.response.data?.message || 'Invalid registration data';
            break;
          case 409:
            message = error.response.data?.message || 'User already exists with this email or username';
            break;
          case 429:
            message = 'Too many registration attempts. Please wait.';
            break;
          case 500:
            message = 'Server error. Please try again later.';
            break;
          default:
            message = error.response.data?.message || message;
        }
      } else if (error.message?.includes('Network')) {
        message = 'Network error. Please check your connection.';
      }
      
      setAuthError(message);
      
      return {
        success: false,
        message: message
      };
    }
  }, [setAuthHeader]);

  // ===== CLEAR ERROR =====
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  // ===== CHECK AUTH STATUS =====
  const isAuthenticated = useCallback(() => {
    return !!user && !!token;
  }, [user, token]);

  // ===== GET AUTH HEADER =====
  const getAuthHeader = useCallback(() => {
    return token ? `Bearer ${token}` : null;
  }, [token]);

  // ===== SESSION INFO =====
  const getSessionTimeLeft = useCallback(() => {
    if (!sessionExpiry) return 0;
    return Math.max(0, sessionExpiry.getTime() - Date.now());
  }, [sessionExpiry]);

  const value = {
    user,
    loading,
    token,
    authError,
    sessionExpiry,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    isAuthenticated: isAuthenticated(),
    getAuthHeader,
    getSessionTimeLeft,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
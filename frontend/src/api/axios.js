import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ===== CSRF TOKEN HELPER =====
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// ===== SECURE CONNECTION CHECK =====
function isSecureConnection() {
  if (typeof window === 'undefined') return true;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  return window.location.protocol === 'https:';
}

// ===== CREATE AXIOS INSTANCE =====
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true,
  timeout: 30000,
  maxContentLength: 10 * 1024 * 1024
});

// ===== REQUEST INTERCEPTOR =====
api.interceptors.request.use(
  (config) => {
    // ===== Check secure connection =====
    if (!isSecureConnection() && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Insecure connection detected!');
      if (typeof window !== 'undefined') {
        window.location.href = window.location.href.replace('http://', 'https://');
      }
    }

    // ===== Add token =====
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ===== Add CSRF token =====
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCookie('XSRF-TOKEN') || getCookie('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // ===== Cache busting - ONLY for specific endpoints =====
    const skipCacheEndpoints = ['/team/room', '/team/join', '/team/create'];
    const shouldSkipCache = skipCacheEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (config.method?.toLowerCase() === 'get' && !shouldSkipCache) {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    // ===== ✅ FIX: Log request data for debugging =====
    const sanitizedUrl = config.url?.replace(/\/[0-9a-f]{24}\b/g, '/:id');
    console.log(`📤 ${config.method?.toUpperCase()} ${sanitizedUrl || config.url}`, config.data || '');

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error.message);
    return Promise.reject(error);
  }
);

// ===== RESPONSE INTERCEPTOR =====
api.interceptors.response.use(
  (response) => {
    const sanitizedUrl = response.config.url?.replace(/\/[0-9a-f]{24}\b/g, '/:id');
    console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${sanitizedUrl || response.config.url}`);
    return response;
  },
  (error) => {
    // ===== Network errors =====
    if (!error.response) {
      console.error('🌐 Network error:', error.message);
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection.'
      });
    }

    // ===== Timeout errors =====
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        ...error,
        message: 'Request timeout. Please try again.'
      });
    }

    // ===== ✅ FIX: Better error logging =====
    console.error('💥 Server error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });

    // ===== 401 Unauthorized =====
    if (error.response?.status === 401) {
      console.warn('🔑 Unauthorized - Token may be expired');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
      }
    }

    // ===== 403 Forbidden =====
    if (error.response?.status === 403) {
      console.warn('🚫 Access forbidden');
    }

    // ===== 429 Rate Limiting =====
    if (error.response?.status === 429) {
      console.warn('⏳ Rate limit exceeded');
    }

    // ===== 500 Server Error =====
    if (error.response?.status >= 500) {
      console.error('💥 Server error:', error.response?.data?.message || error.message);
    }

    // Sanitize error
    const sanitizedError = {
      ...error,
      message: error.response?.data?.message || error.message || 'An error occurred'
    };

    return Promise.reject(sanitizedError);
  }
);

// ===== HELPERS =====
api.clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; Secure; SameSite=Strict;';
};

api.setAuth = (token) => {
  localStorage.setItem('token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

api.isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

api.isSecure = () => {
  return isSecureConnection();
};

export default api;
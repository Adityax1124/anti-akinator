const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ===== AUTH MIDDLEWARE =====
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN'
        });
      }
      throw error;
    }

    // Get user from database
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('equipped.banner', 'gifUrl')
      .populate('equipped.title', 'displayName displayType')
      .populate('equipped.profilePhoto', 'imageUrl');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }

    // Check if user is active/banned (if you have such fields)
    // if (user.isBanned) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Your account has been suspended. Please contact support.'
    //   });
    // }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.'
    });
  }
};

// ===== ADMIN MIDDLEWARE =====
const adminMiddleware = async (req, res, next) => {
  try {
    // First ensure user is authenticated
    await authMiddleware(req, res, () => {});
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin verification failed.'
    });
  }
};

// ===== OPTIONAL: RATE LIMIT BY USER =====
// You can use this in routes that need stricter rate limiting per user
const userRateLimits = new Map();

const checkUserRateLimit = (userId, endpoint, maxRequests, timeWindow) => {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  
  if (!userRateLimits.has(key)) {
    userRateLimits.set(key, {
      timestamps: [now],
      count: 1
    });
    return true;
  }
  
  const data = userRateLimits.get(key);
  const timestamps = data.timestamps.filter(t => now - t < timeWindow);
  
  if (timestamps.length >= maxRequests) {
    return false;
  }
  
  timestamps.push(now);
  data.timestamps = timestamps;
  data.count = timestamps.length;
  userRateLimits.set(key, data);
  return true;
};

module.exports = { 
  authMiddleware, 
  adminMiddleware,
  checkUserRateLimit
};
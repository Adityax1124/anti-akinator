const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate the user via JWT token.
 * Attaches user object to req.user if valid token is provided.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        message: 'No token provided. Please authenticate.',
        success: false
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        message: 'User not found. Please authenticate.',
        success: false
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      message: 'Invalid or expired token. Please authenticate again.',
      success: false
    });
  }
};

/**
 * Middleware to check if the authenticated user is an admin.
 * Must be used after authMiddleware.
 */
const adminMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required.',
      success: false
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required.',
      success: false
    });
  }

  next();
};

module.exports = { authMiddleware, adminMiddleware };
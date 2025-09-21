const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query, getClient } = require('../config/database');
const i18n = require('../config/i18n');

const authenticateToken = async (req, res, next) => {
  try {
    // Add debugging for cover image route
    if (req.originalUrl && req.originalUrl.includes('/cover-image')) {
      console.log('🔐 Auth middleware for cover image:', {
        method: req.method,
        url: req.originalUrl,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderLength: req.headers.authorization?.length,
        contentType: req.headers['content-type'],
        timestamp: new Date().toISOString()
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.error('❌ No token provided for cover image upload:', {
        url: req.originalUrl,
        authHeader: authHeader ? 'exists but invalid format' : 'missing'
      });
      return res.status(401).json({
        success: false,
        message: req.t ? req.t('auth:token.required') : 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userResult = await query(
      'SELECT id, username, email, full_name, is_active, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: req.t ? req.t('auth:login.userNotFound') : 'User not found or inactive'
      });
    }

    req.user = {
      id: userResult.rows[0].id,
      username: userResult.rows[0].username,
      email: userResult.rows[0].email,
      fullName: userResult.rows[0].full_name,
      role: userResult.rows[0].role
    };

    // Set current user ID for Row Level Security policies
    try {
      await query('SELECT set_config($1, $2, true)', ['app.current_user_id', req.user.id]);
    } catch (rlsError) {
      console.warn('Failed to set RLS user context:', rlsError.message);
      // Continue anyway - this is not critical for basic functionality
    }

    next();

  } catch (error) {
    // Add debugging for cover image route errors
    if (req.originalUrl && req.originalUrl.includes('/cover-image')) {
      console.error('❌ Auth error for cover image:', {
        url: req.originalUrl,
        errorName: error.name,
        errorMessage: error.message,
        hasToken: !!req.headers.authorization,
        timestamp: new Date().toISOString()
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: req.t ? req.t('auth:token.invalid') : 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: req.t ? req.t('auth:token.expired') : 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: req.t ? req.t('common:errors.internalError') : 'Authentication error'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userResult = await query(
      'SELECT id, username, email, full_name, is_active, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      req.user = {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        email: userResult.rows[0].email,
        fullName: userResult.rows[0].full_name,
        role: userResult.rows[0].role
      };
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    req.user = null;
    next();
  }
};

const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: req.t ? req.t('common:errors.unauthorized') : 'Authentication required'
      });
    }

    if (roles.length === 0) {
      return next();
    }

    const userRole = req.user.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: req.t ? req.t('auth:permissions.insufficientPermissions') : 'Insufficient permissions'
      });
    }

    next();
  };
};

const rateLimitByUser = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => {
      return req.user ? `user_${req.user.id}` : req.ip;
    },
    message: (req, res) => ({
      success: false,
      message: req.t ? req.t('common:rateLimiting.tooManyRequests') : 'Too many requests from this user'
    })
  });
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  rateLimitByUser
};
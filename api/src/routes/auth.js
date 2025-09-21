const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { query, getClient } = require('../config/database');

const router = express.Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: (req, res) => ({
    success: false,
    message: req.t('common:rateLimiting.tooManyLoginAttempts')
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

function generateTokens(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });

  return { accessToken, refreshToken };
}

const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage((value, { req }) => req.t('validation:auth.usernameOrEmailRequired'))
    .isLength({ min: 1, max: 255 })
    .withMessage((value, { req }) => req.t('validation:general.valueTooLong')),
  body('password')
    .isLength({ min: 6 })
    .withMessage((value, { req }) => req.t('validation:auth.passwordLength')),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage((value, { req }) => req.t('validation:general.invalidFormat'))
];

router.post('/login', loginRateLimit, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: req.t('validation:general.validationFailed'),
        errors: errors.array()
      });
    }

    const { email: loginIdentifier, password, rememberMe = false } = req.body;

    // Try to find user by email OR username
    const userResult = await query(
      'SELECT id, username, password_hash, email, full_name, is_active, last_login_at, role FROM users WHERE (email = $1 OR username = $1) AND is_active = true',
      [loginIdentifier]
    );

    if (userResult.rows.length === 0) {
      // Record failed login attempt
      if (req.recordFailure) {
        req.recordFailure();
      }

      console.warn('🚨 Login attempt with invalid user:', {
        loginIdentifier,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        message: req.t('auth:login.failed')
      });
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Record failed login attempt
      if (req.recordFailure) {
        req.recordFailure();
      }

      console.warn('🚨 Login attempt with invalid password:', {
        userId: user.id,
        username: user.username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(401).json({
        success: false,
        message: req.t('auth:login.failed')
      });
    }

    // Clear failures on successful login
    if (req.clearFailures) {
      req.clearFailures();
    }

    console.log('✅ Successful login:', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    const { accessToken, refreshToken } = generateTokens(user);

    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
      
      await client.query(`
        INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        user.id,
        refreshTokenHash,
        req.ip,
        req.get('User-Agent'),
        new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000)
      ]);

      await client.query('COMMIT');

      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        lastLoginAt: user.last_login_at,
        role: user.role
      };

      res.status(200).json({
        success: true,
        message: req.t('auth:login.success'),
        user: userData,
        token: accessToken,
        refreshToken: refreshToken
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const sessionResult = await query(`
      SELECT us.*, u.username, u.email, u.full_name, u.is_active
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE u.id = $1 AND us.is_active = true AND us.expires_at > NOW()
    `, [decoded.userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const session = sessionResult.rows[0];
    const user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      full_name: session.full_name
    };

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, session.refresh_token_hash);
    if (!isRefreshTokenValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    await query(
      'UPDATE user_sessions SET last_activity_at = NOW() WHERE id = $1',
      [session.id]
    );

    res.status(200).json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.get('/me', async (req, res) => {
  try {
    console.log('🔍 /auth/me request:', {
      hasAuthHeader: !!req.headers.authorization,
      authHeaderLength: req.headers.authorization?.length,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error('❌ No token provided for /auth/me:', {
        authHeader: req.headers.authorization,
        hasAuthHeader: !!req.headers.authorization
      });
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('✅ Token decoded successfully for /auth/me:', {
      userId: decoded.userId,
      username: decoded.username
    });

    const userResult = await query(
      'SELECT id, username, email, full_name, is_active, last_login_at, created_at, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found for /auth/me:', {
        userId: decoded.userId,
        queryRowsReturned: userResult.rows.length
      });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ /auth/me error:', {
      errorName: error.name,
      errorMessage: error.message,
      hasAuthHeader: !!req.headers.authorization,
      authHeaderLength: req.headers.authorization?.length,
      timestamp: new Date().toISOString()
    });

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await query(
        'UPDATE user_sessions SET is_active = false WHERE refresh_token_hash = $1',
        [await bcrypt.hash(refreshToken, 12)]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.patch('/users/:userId/last-login', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'Last login updated'
    });

  } catch (error) {
    console.error('Update last login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update last login'
    });
  }
});

module.exports = router;
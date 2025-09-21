const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const middleware = require('i18next-http-middleware');
const { testConnection } = require('./config/database');
const i18n = require('./config/i18n');
const {
  logSecurityEvent,
  suspiciousActivityDetector,
  sanitizeInput,
  sessionSecurity,
  cspViolationHandler
} = require('./middleware/security');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Express to trust NGINX proxy
app.set('trust proxy', 1);

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Enhanced security middleware
app.use(helmet({
  // Content Security Policy - Strict policy for production security
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Tailwind CSS
      scriptSrc: ["'self'", "'strict-dynamic'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"], // Allow WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
    reportOnly: process.env.NODE_ENV === 'development', // Report only in dev
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Additional security headers
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  noSniff: true, // X-Content-Type-Options: nosniff
  xssFilter: true, // X-XSS-Protection: 1; mode=block
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Permission Policy (formerly Feature Policy)
  permittedCrossDomainPolicies: false,
}));

// Additional security headers for API responses
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // API-specific headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Prevent MIME type sniffing
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  next();
});

// CORS configuration for Hebrew RTL support and NGINX routing
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',  // Direct frontend development
      'http://localhost',       // NGINX development mode
      'http://localhost:80',    // NGINX explicit port
      process.env.FRONTEND_URL, // Custom frontend URL
      process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null, // Production domain
      process.env.DOMAIN ? `http://${process.env.DOMAIN}` : null   // Production domain HTTP
    ].filter(Boolean); // Remove null values

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept-Language'],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined'));

// Security monitoring and threat detection
app.use(suspiciousActivityDetector());

// CSP violation reporting
app.use(cspViolationHandler);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Internationalization middleware
app.use(middleware.handle(i18n));

// Session security (after authentication)
app.use(sessionSecurity);

// Enhanced rate limiting configuration
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests, // Don't count successful requests
    keyGenerator: (req) => {
      // Use user ID for authenticated requests, IP for anonymous
      return req.user ? `user_${req.user.id}` : req.ip;
    },
    handler: (req, res) => {
      console.warn('🚨 Rate limit exceeded:', {
        ip: req.ip,
        user: req.user?.id || 'anonymous',
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: typeof message === 'function' ? message(req, res) : message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Global API rate limiter - more restrictive
const globalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  50, // Reduced from 100 to 50 requests per 15 minutes
  (req, res) => req.t ? req.t('common:rateLimiting.tooManyRequests') : 'Too many requests, please try again later'
);

// Strict rate limiter for authentication endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // Only 5 login attempts per 15 minutes
  'Too many authentication attempts, please try again later',
  false // Count all requests including failed ones
);

// File upload rate limiter
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 file uploads per hour
  'Too many file uploads, please try again later'
);

// Progressive delay for repeated failures
const createProgressiveDelay = () => {
  const failures = new Map();

  return (req, res, next) => {
    const key = req.user ? `user_${req.user.id}` : req.ip;
    const failureCount = failures.get(key) || 0;

    if (failureCount > 0) {
      const delay = Math.min(1000 * Math.pow(2, failureCount - 1), 30000); // Max 30 seconds
      console.log(`⏰ Progressive delay applied: ${delay}ms for ${key}`);

      setTimeout(() => {
        next();
      }, delay);
    } else {
      next();
    }

    // Track failures (this should be called from auth middleware on failed login)
    req.recordFailure = () => {
      failures.set(key, failureCount + 1);
      setTimeout(() => {
        failures.delete(key);
      }, 15 * 60 * 1000); // Clear after 15 minutes
    };

    req.clearFailures = () => {
      failures.delete(key);
    };
  };
};

const progressiveDelay = createProgressiveDelay();

// Apply rate limiting
app.use('/api', globalLimiter);
app.use('/api/v1/auth/login', authLimiter, progressiveDelay);
app.use('/api/v1/auth/refresh', authLimiter);
app.use('/api/v1/events/*/cover-image', uploadLimiter);
app.use('/api/v1/steps/*/image', uploadLimiter);

// =============================================================================
// ROUTES
// =============================================================================

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/v1/auth', authRoutes);

// Guides management routes (authenticated)
const guidesRoutes = require('./routes/events');
app.use('/api/v1/guides', guidesRoutes);

// Events management routes (authenticated) - Same routes as guides for consistency
app.use('/api/v1/events', guidesRoutes);

// Steps management routes (authenticated)
const stepsRoutes = require('./routes/steps');
app.use('/api/v1/steps', stepsRoutes);

// Public access routes (no authentication required)
const publicRoutes = require('./routes/public');
app.use('/api/v1/public', publicRoutes);

// Image serving routes (no authentication required for serving images)
const imageRoutes = require('./routes/images');
app.use('/api/v1/images', imageRoutes);
// Backwards compatibility alias for uploads pattern
app.use('/api/v1/uploads', imageRoutes);

// Admin routes (authenticated admin access only)
const adminRoutes = require('./routes/admin');
app.use('/api/v1/admin', adminRoutes);

// Analytics routes (authenticated access only)
const analyticsRoutes = require('./routes/analytics');
app.use('/api/v1/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'TrailGuide API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    hebrew_support: true,
    rtl_ready: true
  });
});

// Security status endpoint (authenticated access only)
const { authenticateToken, requireRole } = require('./middleware/auth');
const { getSecurityStats } = require('./middleware/security');

app.get('/api/v1/security/status', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const securityStats = getSecurityStats();

    res.status(200).json({
      success: true,
      data: {
        security: securityStats,
        requestInfo: req.securityInfo || {},
        timestamp: new Date().toISOString()
      },
      message: 'Security status retrieved successfully'
    });
  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security status'
    });
  }
});

// API Info endpoint
app.get('/api/v1/info', (req, res) => {
  res.status(200).json({
    name: 'TrailGuide PWA API',
    version: '1.0.0',
    description: 'Visual navigation system for unmapped spaces',
    features: [
      'Hebrew RTL Support',
      'Visual Step-by-Step Navigation',
      'Organizer Dashboard',
      'Mobile PWA Optimized',
      'Offline Capability'
    ],
    languages: ['he', 'en'],
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      guides: '/api/v1/guides',
      events: '/api/v1/events',
      steps: '/api/v1/steps',
      uploads: '/api/v1/uploads'
    }
  });
});

// Welcome endpoint with Hebrew support
app.get('/api/v1/welcome', (req, res) => {
  const acceptLanguage = req.headers['accept-language'] || 'he';
  const isHebrew = acceptLanguage.includes('he');
  
  const messages = {
    he: {
      welcome: 'ברוכים הבאים לטריילגייד',
      description: 'מערכת ניווט חזותית עבור מרחבים לא ממופים',
      status: 'המערכת מוכנה לשימוש',
      direction: 'rtl'
    },
    en: {
      welcome: 'Welcome to TrailGuide',
      description: 'Visual navigation system for unmapped spaces',
      status: 'System is ready for use',
      direction: 'ltr'
    }
  };
  
  const language = isHebrew ? 'he' : 'en';
  
  res.status(200).json({
    ...messages[language],
    language,
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined routes
app.use('/api', (req, res) => {
  res.status(404).json({
    error: req.t ? req.t('common:errors.notFound') : 'Not found',
    message: req.t ? req.t('api:general.endpointNotFound') : 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'TrailGuide API Server',
    status: 'Running',
    documentation: '/api/v1/info'
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    error: req.t ? req.t('common:errors.internalError') : 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : (req.t ? req.t('api:general.serverError') : 'Server error'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: req.t ? req.t('common:errors.notFound') : 'Not found',
    message: req.t ? req.t('api:general.endpointNotFound') : 'Endpoint not found',
    path: req.path
  });
});

// =============================================================================
// SERVER START
// =============================================================================

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 TrailGuide API Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🇮🇱 Hebrew RTL Support: Enabled`);
  
  // Test database connection on startup
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log(`🗄️  Database: Connected to PostgreSQL`);
  } else {
    console.log(`⚠️  Database: Connection failed - check configuration`);
  }
  
  console.log(`⚡ Ready for development!`);
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration for Hebrew RTL support
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept-Language'],
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use('/api', limiter);

// =============================================================================
// ROUTES
// =============================================================================

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/v1/auth', authRoutes);

// Events management routes (authenticated)
const eventsRoutes = require('./routes/events');
app.use('/api/v1/events', eventsRoutes);

// Steps management routes (authenticated)
const stepsRoutes = require('./routes/steps');
app.use('/api/v1/steps', stepsRoutes);

// Public access routes (no authentication required)
const publicRoutes = require('./routes/public');
app.use('/api/v1/public', publicRoutes);

// Image serving routes (no authentication required for serving images)
const imageRoutes = require('./routes/images');
app.use('/api/v1/images', imageRoutes);

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
    error: 'API endpoint not found',
    message: 'The requested API endpoint does not exist',
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
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
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
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Security event logging
const securityLogDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(securityLogDir)) {
  fs.mkdirSync(securityLogDir, { recursive: true });
}

const securityLogFile = path.join(securityLogDir, 'security.log');

const logSecurityEvent = (event, details, req = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    request: req ? {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      sessionId: req.sessionID
    } : null
  };

  // Log to console
  console.log(`🔒 SECURITY EVENT [${event}]:`, logEntry);

  // Log to file
  fs.appendFileSync(securityLogFile, JSON.stringify(logEntry) + '\n');
};

// Suspicious activity detection
const suspiciousActivityDetector = () => {
  const activityMap = new Map(); // IP -> { requests: [], loginAttempts: [], suspicionScore: 0 }

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!activityMap.has(ip)) {
      activityMap.set(ip, {
        requests: [],
        loginAttempts: [],
        suspicionScore: 0,
        firstSeen: now
      });
    }

    const activity = activityMap.get(ip);

    // Clean old entries (older than 1 hour)
    activity.requests = activity.requests.filter(time => now - time < 3600000);
    activity.loginAttempts = activity.loginAttempts.filter(time => now - time < 3600000);

    // Track current request
    activity.requests.push(now);

    // Calculate suspicion score
    let suspicionScore = 0;

    // High request frequency
    if (activity.requests.length > 100) { // More than 100 requests per hour
      suspicionScore += 30;
    }

    // Rapid requests (more than 10 per minute)
    const recentRequests = activity.requests.filter(time => now - time < 60000);
    if (recentRequests.length > 10) {
      suspicionScore += 20;
    }

    // Multiple login attempts
    if (activity.loginAttempts.length > 3) {
      suspicionScore += 25;
    }

    // Suspicious user agents
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /perl/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      suspicionScore += 15;
    }

    // No user agent
    if (!userAgent) {
      suspicionScore += 10;
    }

    // Path traversal attempts
    if (req.path.includes('..') || req.path.includes('//')) {
      suspicionScore += 40;
      logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', {
        path: req.path,
        score: suspicionScore
      }, req);
    }

    // SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i, /or\s+1\s*=\s*1/i, /drop\s+table/i,
      /exec\s*\(/i, /script\s*>/i, /<\s*script/i
    ];

    const queryString = JSON.stringify(req.query) + JSON.stringify(req.body);
    if (sqlPatterns.some(pattern => pattern.test(queryString))) {
      suspicionScore += 50;
      logSecurityEvent('SQL_INJECTION_ATTEMPT', {
        query: req.query,
        body: req.body,
        score: suspicionScore
      }, req);
    }

    activity.suspicionScore = suspicionScore;

    // Log high suspicion activity
    if (suspicionScore > 50) {
      logSecurityEvent('HIGH_SUSPICION_ACTIVITY', {
        score: suspicionScore,
        requestCount: activity.requests.length,
        loginAttempts: activity.loginAttempts.length,
        userAgent
      }, req);

      // Block if extremely suspicious
      if (suspicionScore > 80) {
        logSecurityEvent('IP_BLOCKED', {
          score: suspicionScore,
          reason: 'Extremely suspicious activity'
        }, req);

        return res.status(403).json({
          success: false,
          error: 'SUSPICIOUS_ACTIVITY_DETECTED',
          message: 'Access denied due to suspicious activity'
        });
      }
    }

    // Track login attempts
    if (req.path.includes('/auth/login')) {
      activity.loginAttempts.push(now);
    }

    // Add activity info to request
    req.securityInfo = {
      suspicionScore,
      activitySummary: {
        requestCount: activity.requests.length,
        loginAttempts: activity.loginAttempts.length
      }
    };

    next();
  };
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Remove potentially dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove on* event handlers
      .replace(/data:(?!image\/[a-z]+;base64,)/gi, '') // Remove data: URLs except images
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  };

  // Sanitize request data
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Session security middleware
const sessionSecurity = (req, res, next) => {
  if (req.user) {
    // Check for session hijacking indicators
    const userAgent = req.get('User-Agent');
    const sessionKey = `session_${req.user.id}`;

    // Store user agent on first authenticated request
    if (!req.session.userAgent) {
      req.session.userAgent = userAgent;
      req.session.initialIP = req.ip;
    } else {
      // Check for user agent changes (potential session hijacking)
      if (req.session.userAgent !== userAgent) {
        logSecurityEvent('SESSION_HIJACKING_ATTEMPT', {
          userId: req.user.id,
          originalUserAgent: req.session.userAgent,
          currentUserAgent: userAgent,
          originalIP: req.session.initialIP,
          currentIP: req.ip
        }, req);

        // Invalidate session
        req.session.destroy();

        return res.status(401).json({
          success: false,
          error: 'SESSION_INVALID',
          message: 'Session invalidated due to security concerns'
        });
      }

      // Check for suspicious IP changes
      if (req.session.initialIP !== req.ip) {
        const ipDistance = calculateIPDistance(req.session.initialIP, req.ip);

        // If IPs are from very different locations, log it
        if (ipDistance > 1000) { // Arbitrary distance threshold
          logSecurityEvent('SUSPICIOUS_IP_CHANGE', {
            userId: req.user.id,
            originalIP: req.session.initialIP,
            currentIP: req.ip,
            estimatedDistance: ipDistance
          }, req);
        }
      }
    }

    // Update last activity
    req.session.lastActivity = Date.now();
  }

  next();
};

// Simple IP distance calculation (very basic)
const calculateIPDistance = (ip1, ip2) => {
  // This is a simplified calculation - in production you'd use a proper geolocation service
  const num1 = ip1.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet), 0);
  const num2 = ip2.split('.').reduce((acc, octet) => acc * 256 + parseInt(octet), 0);

  return Math.abs(num1 - num2) / 1000000; // Rough distance estimation
};

// Content Security Policy violation reporting
const cspViolationHandler = (req, res, next) => {
  if (req.path === '/api/v1/security/csp-violation-report') {
    logSecurityEvent('CSP_VIOLATION', {
      report: req.body
    }, req);

    return res.status(204).end();
  }
  next();
};

// Export security statistics
const getSecurityStats = () => {
  try {
    const logContent = fs.readFileSync(securityLogFile, 'utf8');
    const lines = logContent.trim().split('\n').filter(line => line);
    const events = lines.map(line => JSON.parse(line));

    const now = Date.now();
    const last24Hours = events.filter(event =>
      now - new Date(event.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const eventCounts = {};
    last24Hours.forEach(event => {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      last24Hours: last24Hours.length,
      eventTypes: eventCounts,
      lastEvent: events[events.length - 1]
    };
  } catch (error) {
    return {
      error: 'Failed to read security logs',
      totalEvents: 0,
      last24Hours: 0,
      eventTypes: {},
      lastEvent: null
    };
  }
};

module.exports = {
  logSecurityEvent,
  suspiciousActivityDetector,
  sanitizeInput,
  sessionSecurity,
  cspViolationHandler,
  getSecurityStats
};
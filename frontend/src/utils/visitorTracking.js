/**
 * Visitor Tracking Utility
 * Enhanced analytics system for accurate unique visitor identification
 *
 * Features:
 * - Browser fingerprinting for unique identification
 * - Persistent visitor IDs with privacy compliance
 * - Session tracking and management
 * - Device and browser information collection
 * - Returning visitor detection
 */

// Generate UUID v4 without external dependencies
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Storage keys
const VISITOR_ID_KEY = 'trailguide_visitor_id';
const SESSION_ID_KEY = 'trailguide_session_id';
const VISITOR_DATA_KEY = 'trailguide_visitor_data';
const LAST_VISIT_KEY = 'trailguide_last_visit';

// Configuration
const VISITOR_ID_EXPIRY_DAYS = 30; // Privacy-compliant expiry
const SESSION_TIMEOUT_MINUTES = 30;

/**
 * Generate a browser fingerprint for unique identification
 */
function generateFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Browser fingerprint', 2, 2);

  const fingerprint = {
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || navigator.userLanguage,
    platform: navigator.platform,
    userAgent: navigator.userAgent.substring(0, 100), // Truncated for privacy
    canvasFingerprint: canvas.toDataURL().substring(0, 50), // Truncated for privacy
    cookieEnabled: navigator.cookieEnabled,
    onlineStatus: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency || 1,
    pixelRatio: window.devicePixelRatio || 1
  };

  // Create a simple hash of the fingerprint
  const fingerprintString = JSON.stringify(fingerprint);
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return {
    hash: Math.abs(hash).toString(16),
    components: fingerprint
  };
}

/**
 * Detect device type and browser information
 */
function getDeviceInfo() {
  const userAgent = navigator.userAgent;

  // Device type detection
  let deviceType = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    deviceType = 'mobile';
  }

  // Browser detection
  let browserName = 'unknown';
  let browserVersion = 'unknown';

  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edge') === -1) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Safari\/(\d+)/)?.[1] || 'unknown';
  } else if (userAgent.indexOf('Edge') > -1) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'unknown';
  }

  // Operating system detection
  let osName = 'unknown';
  if (userAgent.indexOf('Windows') > -1) osName = 'Windows';
  else if (userAgent.indexOf('Mac') > -1) osName = 'macOS';
  else if (userAgent.indexOf('Linux') > -1) osName = 'Linux';
  else if (userAgent.indexOf('Android') > -1) osName = 'Android';
  else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) osName = 'iOS';

  return {
    deviceType,
    browserName,
    browserVersion,
    osName,
    screenSize: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupport: 'ontouchstart' in window
  };
}

/**
 * Check if stored data has expired
 */
function isDataExpired(timestamp, expiryDays) {
  if (!timestamp) return true;
  const expiryTime = new Date(timestamp).getTime() + (expiryDays * 24 * 60 * 60 * 1000);
  return Date.now() > expiryTime;
}

/**
 * Generate or retrieve visitor ID
 */
function getOrCreateVisitorId() {
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      return generateSessionVisitorId();
    }

    // Get existing visitor data
    const storedData = localStorage.getItem(VISITOR_DATA_KEY);
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);

    if (storedData && !isDataExpired(lastVisit, VISITOR_ID_EXPIRY_DAYS)) {
      const visitorData = JSON.parse(storedData);
      // Update last visit timestamp
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
      return visitorData.visitorId;
    }

    // Generate new visitor ID
    const fingerprint = generateFingerprint();
    const visitorId = `${fingerprint.hash}_${generateUUID().substring(0, 8)}`;
    const deviceInfo = getDeviceInfo();

    const visitorData = {
      visitorId,
      fingerprint: fingerprint.hash,
      deviceInfo,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    // Store visitor data
    localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(visitorData));
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());

    console.log('🔍 New visitor ID generated:', visitorId);
    return visitorId;

  } catch (error) {
    console.warn('Failed to use localStorage for visitor tracking:', error);
    return generateSessionVisitorId();
  }
}

/**
 * Generate session-based visitor ID (fallback)
 */
function generateSessionVisitorId() {
  const sessionKey = 'temp_visitor_id';
  let visitorId = sessionStorage.getItem(sessionKey);

  if (!visitorId) {
    const fingerprint = generateFingerprint();
    visitorId = `temp_${fingerprint.hash}_${Date.now()}`;
    sessionStorage.setItem(sessionKey, visitorId);
    console.log('🔍 Session visitor ID generated:', visitorId);
  }

  return visitorId;
}

/**
 * Generate or retrieve session ID
 */
function getOrCreateSessionId() {
  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

    if (!sessionId) {
      sessionId = generateUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      sessionStorage.setItem('session_start', new Date().toISOString());
      console.log('📊 New session started:', sessionId);
    }

    return sessionId;
  } catch (error) {
    // Fallback: generate temporary session ID
    return `temp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Check if this is a returning visitor
 */
function isReturningVisitor() {
  try {
    const storedData = localStorage.getItem(VISITOR_DATA_KEY);
    if (!storedData) return false;

    const visitorData = JSON.parse(storedData);
    const createdAt = new Date(visitorData.createdAt);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceCreation > 1; // Consider returning if visitor ID is older than 1 day
  } catch (error) {
    return false;
  }
}

/**
 * Get session duration in seconds
 */
function getSessionDuration() {
  try {
    const sessionStart = sessionStorage.getItem('session_start');
    if (!sessionStart) return 0;

    const startTime = new Date(sessionStart).getTime();
    return Math.floor((Date.now() - startTime) / 1000);
  } catch (error) {
    return 0;
  }
}

/**
 * Get visitor tracking data for analytics
 */
export function getVisitorTrackingData() {
  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const deviceInfo = getDeviceInfo();
  const isReturning = isReturningVisitor();
  const sessionDuration = getSessionDuration();

  return {
    visitorId,
    sessionId,
    deviceInfo,
    isReturningVisitor: isReturning,
    sessionDuration,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer || null
  };
}

/**
 * Initialize visitor tracking
 */
export function initializeVisitorTracking() {
  try {
    const trackingData = getVisitorTrackingData();
    console.log('🚀 Visitor tracking initialized:', {
      visitorId: trackingData.visitorId,
      sessionId: trackingData.sessionId,
      deviceType: trackingData.deviceInfo.deviceType,
      isReturning: trackingData.isReturningVisitor
    });

    return trackingData;
  } catch (error) {
    console.error('Failed to initialize visitor tracking:', error);
    return null;
  }
}

/**
 * Clean up expired visitor data (privacy compliance)
 */
export function cleanupExpiredVisitorData() {
  try {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (isDataExpired(lastVisit, VISITOR_ID_EXPIRY_DAYS)) {
      localStorage.removeItem(VISITOR_DATA_KEY);
      localStorage.removeItem(LAST_VISIT_KEY);
      console.log('🧹 Expired visitor data cleaned up');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to cleanup visitor data:', error);
    return false;
  }
}

/**
 * Get analytics headers for API requests
 */
export function getAnalyticsHeaders() {
  const trackingData = getVisitorTrackingData();

  return {
    'X-Visitor-ID': trackingData.visitorId,
    'X-Session-ID': trackingData.sessionId,
    'X-Device-Type': trackingData.deviceInfo.deviceType,
    'X-Browser-Info': `${trackingData.deviceInfo.browserName}/${trackingData.deviceInfo.browserVersion}`,
    'X-Is-Returning': trackingData.isReturningVisitor ? 'true' : 'false'
  };
}

/**
 * Export utility functions for testing
 */
export const VisitorTrackingUtils = {
  generateFingerprint,
  getDeviceInfo,
  isDataExpired,
  getSessionDuration,
  cleanupExpiredVisitorData
};
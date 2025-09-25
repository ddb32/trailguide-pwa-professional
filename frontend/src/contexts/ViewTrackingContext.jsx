/**
 * ViewTrackingContext - Professional view tracking with sessionStorage persistence
 *
 * This context provides bulletproof view tracking that:
 * - Survives component mount/unmount cycles
 * - Prevents duplicate view counting
 * - Works across all React lifecycle events
 * - Persists across browser refreshes (within same session)
 * - Provides enterprise-grade debugging
 */

import React, { createContext, useContext, useRef, useCallback } from 'react';

// Create the context
const ViewTrackingContext = createContext();

// SessionStorage key for persistence
const STORAGE_KEY = 'trailguide_view_tracking';

// View tracking utilities
class ViewTrackingManager {
  constructor() {
    this.sessionData = this.loadFromSession();
    this.requestHistory = new Map(); // In-memory request tracking
    this.isEnabled = true;
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Load view tracking data from sessionStorage
   */
  loadFromSession() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('⚠️ Failed to load view tracking from sessionStorage:', error);
      return {};
    }
  }

  /**
   * Save view tracking data to sessionStorage
   */
  saveToSession() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessionData));
    } catch (error) {
      console.warn('⚠️ Failed to save view tracking to sessionStorage:', error);
    }
  }

  /**
   * Generate a unique fingerprint for a view request
   */
  generateRequestFingerprint(guideId, userInfo = {}) {
    const fingerprint = {
      guideId,
      userId: userInfo.id || userInfo.username || 'anonymous',
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 50)
    };

    return `${fingerprint.guideId}_${fingerprint.userId}_${fingerprint.sessionId}`;
  }

  /**
   * Get or create a stable session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = sessionStorage.getItem('trailguide_session_id');
      if (!this.sessionId) {
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('trailguide_session_id', this.sessionId);
      }
    }
    return this.sessionId;
  }

  /**
   * Check if a view has already been tracked
   */
  isViewTracked(guideId, userInfo = {}) {
    const fingerprint = this.generateRequestFingerprint(guideId, userInfo);
    const tracked = !!this.sessionData[fingerprint];

    if (this.debugMode) {
      console.log('🔍 View tracking check:', {
        guideId,
        fingerprint,
        tracked,
        trackingData: this.sessionData[fingerprint] || null
      });
    }

    return tracked;
  }

  /**
   * Mark a view as tracked
   */
  markViewAsTracked(guideId, userInfo = {}, viewId = null) {
    const fingerprint = this.generateRequestFingerprint(guideId, userInfo);
    const now = Date.now();

    this.sessionData[fingerprint] = {
      guideId,
      viewId,
      timestamp: now,
      userInfo: {
        id: userInfo.id || null,
        username: userInfo.username || null
      },
      sessionId: this.getSessionId(),
      url: window.location.href
    };

    this.saveToSession();

    if (this.debugMode) {
      console.log('✅ View marked as tracked:', {
        guideId,
        fingerprint,
        viewId,
        timestamp: new Date(now).toISOString()
      });
    }

    return fingerprint;
  }

  /**
   * Check if a request is a duplicate within a time window
   */
  isDuplicateRequest(guideId, userInfo = {}, timeWindowMs = 5000) {
    const fingerprint = this.generateRequestFingerprint(guideId, userInfo);
    const now = Date.now();

    // Check in-memory request history first (for rapid duplicates)
    const lastRequest = this.requestHistory.get(fingerprint);
    if (lastRequest && (now - lastRequest) < timeWindowMs) {
      if (this.debugMode) {
        console.log('🛑 Duplicate request detected (in-memory):', {
          guideId,
          fingerprint,
          timeSinceLastRequest: now - lastRequest,
          threshold: timeWindowMs
        });
      }
      return true;
    }

    // Check sessionStorage for longer-term tracking
    const sessionData = this.sessionData[fingerprint];
    if (sessionData && (now - sessionData.timestamp) < timeWindowMs) {
      if (this.debugMode) {
        console.log('🛑 Duplicate request detected (session):', {
          guideId,
          fingerprint,
          timeSinceLastRequest: now - sessionData.timestamp,
          threshold: timeWindowMs
        });
      }
      return true;
    }

    // Record this request
    this.requestHistory.set(fingerprint, now);

    // Cleanup old entries to prevent memory leaks
    this.cleanupOldRequests();

    return false;
  }

  /**
   * Clean up old request history entries
   */
  cleanupOldRequests() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [fingerprint, timestamp] of this.requestHistory.entries()) {
      if (now - timestamp > maxAge) {
        this.requestHistory.delete(fingerprint);
      }
    }
  }

  /**
   * Get view tracking statistics for debugging
   */
  getTrackingStats() {
    return {
      totalViewsTracked: Object.keys(this.sessionData).length,
      activeRequestsInMemory: this.requestHistory.size,
      sessionId: this.getSessionId(),
      debugMode: this.debugMode,
      storageKey: STORAGE_KEY
    };
  }

  /**
   * Reset all tracking data (for testing/debugging)
   */
  resetTracking() {
    this.sessionData = {};
    this.requestHistory.clear();
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('trailguide_session_id');
    this.sessionId = null;

    if (this.debugMode) {
      console.log('🔄 View tracking data reset');
    }
  }
}

// ViewTrackingProvider component
export function ViewTrackingProvider({ children }) {
  const managerRef = useRef(new ViewTrackingManager());

  // API methods
  const isViewTracked = useCallback((guideId, userInfo) => {
    return managerRef.current.isViewTracked(guideId, userInfo);
  }, []);

  const markViewAsTracked = useCallback((guideId, userInfo, viewId) => {
    return managerRef.current.markViewAsTracked(guideId, userInfo, viewId);
  }, []);

  const isDuplicateRequest = useCallback((guideId, userInfo, timeWindowMs) => {
    return managerRef.current.isDuplicateRequest(guideId, userInfo, timeWindowMs);
  }, []);

  const getTrackingStats = useCallback(() => {
    return managerRef.current.getTrackingStats();
  }, []);

  const resetTracking = useCallback(() => {
    return managerRef.current.resetTracking();
  }, []);

  const contextValue = {
    isViewTracked,
    markViewAsTracked,
    isDuplicateRequest,
    getTrackingStats,
    resetTracking,
    isEnabled: managerRef.current.isEnabled
  };

  return (
    <ViewTrackingContext.Provider value={contextValue}>
      {children}
    </ViewTrackingContext.Provider>
  );
}

// Custom hook to use the view tracking context
export function useViewTracking() {
  const context = useContext(ViewTrackingContext);

  if (!context) {
    throw new Error('useViewTracking must be used within a ViewTrackingProvider');
  }

  return context;
}

export default ViewTrackingContext;
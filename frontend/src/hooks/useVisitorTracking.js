/**
 * useVisitorTracking Hook
 * React hook for managing visitor identification and session tracking
 *
 * Features:
 * - Automatic visitor ID initialization
 * - Session state management
 * - Page view tracking
 * - Analytics data collection
 * - Privacy-compliant tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeVisitorTracking,
  getVisitorTrackingData,
  getAnalyticsHeaders,
  cleanupExpiredVisitorData
} from '../utils/visitorTracking';

/**
 * Custom hook for visitor tracking and analytics
 */
export function useVisitorTracking(options = {}) {
  const [trackingData, setTrackingData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState(null);

  // Configuration options
  const {
    autoInit = true,
    trackPageViews = true,
    trackInteractions = false,
    enableConsoleLogging = process.env.NODE_ENV === 'development'
  } = options;

  // Refs for tracking
  const pageViewStartTime = useRef(null);
  const sessionStartTime = useRef(null);
  const interactionCount = useRef(0);

  /**
   * Initialize visitor tracking system
   */
  const initializeTracking = useCallback(async () => {
    try {
      if (enableConsoleLogging) {
        console.log('🚀 Initializing visitor tracking...');
      }

      // Clean up expired data first
      cleanupExpiredVisitorData();

      // Initialize tracking
      const data = initializeVisitorTracking();

      if (data) {
        setTrackingData(data);
        setIsInitialized(true);
        setSessionActive(true);
        setError(null);

        // Set timing references
        pageViewStartTime.current = Date.now();
        sessionStartTime.current = Date.now();

        if (enableConsoleLogging) {
          console.log('✅ Visitor tracking initialized successfully:', {
            visitorId: data.visitorId,
            sessionId: data.sessionId,
            deviceType: data.deviceInfo.deviceType,
            isReturning: data.isReturningVisitor
          });
        }
      } else {
        throw new Error('Failed to initialize tracking data');
      }

    } catch (err) {
      console.error('❌ Failed to initialize visitor tracking:', err);
      setError(err.message);
      setIsInitialized(false);
    }
  }, [enableConsoleLogging]);

  /**
   * Get current tracking data
   */
  const getCurrentTrackingData = useCallback(() => {
    if (!isInitialized) {
      return null;
    }

    try {
      return getVisitorTrackingData();
    } catch (err) {
      console.error('Failed to get current tracking data:', err);
      return trackingData;
    }
  }, [isInitialized, trackingData]);

  /**
   * Get analytics headers for API requests
   */
  const getHeaders = useCallback(() => {
    if (!isInitialized) {
      return {};
    }

    try {
      return getAnalyticsHeaders();
    } catch (err) {
      console.error('Failed to get analytics headers:', err);
      return {};
    }
  }, [isInitialized]);

  /**
   * Track a page view
   */
  const trackPageView = useCallback((path = window.location.pathname) => {
    if (!isInitialized || !trackPageViews) {
      return;
    }

    try {
      const currentData = getCurrentTrackingData();
      if (currentData && enableConsoleLogging) {
        console.log('📊 Page view tracked:', {
          path,
          visitorId: currentData.visitorId,
          sessionId: currentData.sessionId,
          timestamp: new Date().toISOString()
        });
      }

      // Reset page view timer
      pageViewStartTime.current = Date.now();

      return currentData;
    } catch (err) {
      console.error('Failed to track page view:', err);
      return null;
    }
  }, [isInitialized, trackPageViews, getCurrentTrackingData, enableConsoleLogging]);

  /**
   * Track user interaction
   */
  const trackInteraction = useCallback((interactionType, details = {}) => {
    if (!isInitialized || !trackInteractions) {
      return;
    }

    try {
      interactionCount.current += 1;

      const currentData = getCurrentTrackingData();
      const interactionData = {
        ...currentData,
        interactionType,
        interactionCount: interactionCount.current,
        details,
        timestamp: new Date().toISOString()
      };

      if (enableConsoleLogging) {
        console.log('👆 Interaction tracked:', interactionData);
      }

      return interactionData;
    } catch (err) {
      console.error('Failed to track interaction:', err);
      return null;
    }
  }, [isInitialized, trackInteractions, getCurrentTrackingData, enableConsoleLogging]);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback(() => {
    if (!isInitialized || !sessionStartTime.current) {
      return null;
    }

    const now = Date.now();
    const sessionDuration = Math.floor((now - sessionStartTime.current) / 1000);
    const pageViewDuration = pageViewStartTime.current
      ? Math.floor((now - pageViewStartTime.current) / 1000)
      : 0;

    return {
      sessionDuration,
      pageViewDuration,
      interactionCount: interactionCount.current,
      isActive: sessionActive
    };
  }, [isInitialized, sessionActive]);

  /**
   * End current session
   */
  const endSession = useCallback(() => {
    if (!isInitialized) {
      return;
    }

    try {
      const sessionStats = getSessionStats();

      if (enableConsoleLogging) {
        console.log('🔚 Session ended:', sessionStats);
      }

      setSessionActive(false);

      return {
        ...getCurrentTrackingData(),
        sessionStats
      };
    } catch (err) {
      console.error('Failed to end session:', err);
      return null;
    }
  }, [isInitialized, getSessionStats, getCurrentTrackingData, enableConsoleLogging]);

  /**
   * Refresh tracking data
   */
  const refreshTrackingData = useCallback(() => {
    if (!isInitialized) {
      return;
    }

    try {
      const freshData = getCurrentTrackingData();
      setTrackingData(freshData);
      return freshData;
    } catch (err) {
      console.error('Failed to refresh tracking data:', err);
      return null;
    }
  }, [isInitialized, getCurrentTrackingData]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInit && !isInitialized) {
      initializeTracking();
    }
  }, [autoInit, isInitialized, initializeTracking]);

  // Handle page visibility changes for session management
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (enableConsoleLogging) {
          console.log('📱 Page hidden - session paused');
        }
      } else {
        if (enableConsoleLogging) {
          console.log('📱 Page visible - session resumed');
        }
        // Refresh tracking data when page becomes visible
        refreshTrackingData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized, enableConsoleLogging, refreshTrackingData]);

  // Handle beforeunload for session cleanup
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const handleBeforeUnload = () => {
      endSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isInitialized, endSession]);

  return {
    // State
    trackingData,
    isInitialized,
    sessionActive,
    error,

    // Data getters
    getCurrentTrackingData,
    getHeaders,
    getSessionStats,

    // Actions
    initializeTracking,
    trackPageView,
    trackInteraction,
    endSession,
    refreshTrackingData,

    // Status checks
    hasVisitorId: !!(trackingData?.visitorId),
    hasSessionId: !!(trackingData?.sessionId),
    isReturningVisitor: !!(trackingData?.isReturningVisitor),
    hasError: !!error,

    // Device info (if available)
    deviceType: trackingData?.deviceInfo?.deviceType || 'unknown',
    browserName: trackingData?.deviceInfo?.browserName || 'unknown',
    isMobile: trackingData?.deviceInfo?.deviceType === 'mobile',
    isTablet: trackingData?.deviceInfo?.deviceType === 'tablet',
    isDesktop: trackingData?.deviceInfo?.deviceType === 'desktop'
  };
}

/**
 * Hook for simplified analytics headers
 * Useful when you just need headers for API calls
 */
export function useAnalyticsHeaders() {
  const { getHeaders, isInitialized } = useVisitorTracking({
    autoInit: true,
    trackPageViews: false,
    trackInteractions: false
  });

  return {
    headers: getHeaders(),
    isReady: isInitialized
  };
}
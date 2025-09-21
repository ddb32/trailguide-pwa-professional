import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';

/**
 * Custom hook for managing admin analytics data
 * Provides platform-wide analytics, feedback data, and usage patterns
 */
export function useAdminAnalytics(options = {}) {
  const [platformStats, setPlatformStats] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default options
  const {
    days = 30,
    feedbackLimit = 100,
    auto_refresh_interval = null // Optional auto-refresh in milliseconds
  } = options;

  /**
   * Fetch all admin analytics data from the API
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [
        platformResponse,
        feedbackResponse,
        usageResponse
      ] = await Promise.all([
        adminService.getPlatformAnalytics({ days }),
        adminService.getFeedbackAnalytics({ days, limit: feedbackLimit }),
        adminService.getUsageAnalytics({ days })
      ]);

      if (platformResponse.success) {
        setPlatformStats(platformResponse.data.summary);
      }


      if (feedbackResponse.success) {
        setFeedbackStats({
          feedback: feedbackResponse.data.feedback,
          statistics: feedbackResponse.data.statistics,
          totalCount: feedbackResponse.data.total_count
        });
      }

      if (usageResponse.success) {
        setUsageStats(usageResponse.data);
      }

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      console.error('Failed to fetch admin analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [days, feedbackLimit]);

  /**
   * Refresh analytics data
   */
  const refreshAnalytics = useCallback(() => {
    return fetchAnalytics();
  }, [fetchAnalytics]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Export analytics data
   */
  const exportAnalytics = useCallback(async (format = 'json') => {
    try {
      const response = await adminService.exportAnalytics({ days, format });
      return response;
    } catch (err) {
      console.error('Failed to export analytics:', err);
      throw err;
    }
  }, [days]);

  // Auto-fetch analytics when hook is initialized
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh if interval is specified
  useEffect(() => {
    if (!auto_refresh_interval) return;

    const interval = setInterval(fetchAnalytics, auto_refresh_interval);
    return () => clearInterval(interval);
  }, [fetchAnalytics, auto_refresh_interval]);

  return {
    // Data
    platformStats,
    feedbackStats,
    usageStats,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchAnalytics,
    refreshAnalytics,
    clearError,
    exportAnalytics,
    
    // Status checks
    hasPlatformStats: !!platformStats,
    hasFeedbackStats: !!feedbackStats,
    hasUsageStats: !!usageStats,
    hasError: !!error,
    
    // Computed values
    topPerformingGuides: platformStats?.top_performing_guides || [],
    deviceDistribution: usageStats?.device_stats || [],
    geographicStats: usageStats?.geographic_stats || [],
    dailyUsagePattern: usageStats?.daily_usage || []
  };
}


import { useState, useEffect, useCallback } from 'react';
import analyticsService from '../services/analyticsService';

export function useAnalytics(initialTimeRange = '30d') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [overview, setOverview] = useState(null);
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideDetails, setGuideDetails] = useState(null);
  const [entrepreneurData, setEntrepreneurData] = useState(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyticsService.getOverview(
        timeRange,
        customDateRange.start,
        customDateRange.end
      );

      if (result.success) {
        setOverview(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch analytics overview';
      setError(errorMessage);

      // Only log detailed errors in development
      if (import.meta.env?.DEV) {
        console.error('Overview fetch error:', err);
      } else {
        // In production, log only essential error info
        console.error('Analytics overview failed:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange, customDateRange]);

  const fetchGuides = useCallback(async (limit = 50) => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyticsService.getGuides(
        timeRange,
        customDateRange.start,
        customDateRange.end,
        limit
      );

      if (result.success) {
        setGuides(result.data.guides || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch guide analytics';
      setError(errorMessage);

      // Only log detailed errors in development
      if (import.meta.env?.DEV) {
        console.error('Guides fetch error:', err);
      } else {
        // In production, log only essential error info
        console.error('Analytics guides failed:', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange, customDateRange]);

  const changeTimeRange = useCallback((newTimeRange) => {
    setTimeRange(newTimeRange);
    setCustomDateRange({ start: null, end: null });
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOverview(), fetchGuides()]);
  }, [fetchOverview, fetchGuides]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchOverview();
    fetchGuides();
  }, [fetchOverview, fetchGuides]);

  // Set up auto-refresh interval (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only log in development mode
      if (import.meta.env?.DEV) {
        console.log('🔄 Auto-refreshing analytics data...');
      }
      fetchOverview();
      fetchGuides();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchOverview, fetchGuides]);

  return {
    loading,
    error,
    timeRange,
    overview,
    guides,
    selectedGuide,
    guideDetails,
    entrepreneurData,
    fetchOverview,
    fetchGuides,
    changeTimeRange,
    refreshAll,
    setSelectedGuide,
    formatNumber: analyticsService.formatNumber,
    formatPercentage: analyticsService.formatPercentage,
    formatDuration: analyticsService.formatDuration,
    getTimeRangeOptions: analyticsService.getTimeRangeOptions,
    clearError: () => setError(null)
  };
}

export default useAnalytics;
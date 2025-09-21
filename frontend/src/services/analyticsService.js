/**
 * Analytics Service
 * Handles API calls for analytics dashboard data
 */

import { authService } from './authService';

class AnalyticsService {
  constructor() {
    this.baseURL = '/api/v1/analytics';
    this.axiosInstance = authService.axiosInstance;
  }

  /**
   * Get analytics overview for the authenticated user
   */
  async getOverview(timeRange = '30d', startDate = null, endDate = null) {
    try {
      // Validate parameters
      const validTimeRanges = ['1d', '7d', '30d', '90d', 'all'];
      if (timeRange && !validTimeRanges.includes(timeRange)) {
        return {
          success: false,
          error: `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`
        };
      }

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await this.axiosInstance.get(`${this.baseURL}/overview?${params.toString()}`);

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch analytics overview'
        };
      }
    } catch (error) {
      console.error('Analytics overview error:', error);

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || 'Server error';

        if (status === 401) {
          return { success: false, error: 'Authentication required. Please log in again.' };
        } else if (status === 403) {
          return { success: false, error: 'Access denied. Insufficient permissions.' };
        } else if (status >= 500) {
          return { success: false, error: 'Server error. Please try again later.' };
        }

        return { success: false, error: message };
      } else if (error.request) {
        // Network error
        return { success: false, error: 'Network error. Please check your connection.' };
      } else {
        // Other error
        return { success: false, error: 'An unexpected error occurred.' };
      }
    }
  }

  /**
   * Get analytics for all guides
   */
  async getGuides(timeRange = '30d', startDate = null, endDate = null, limit = 50) {
    try {
      // Validate parameters
      const validTimeRanges = ['1d', '7d', '30d', '90d', 'all'];
      if (timeRange && !validTimeRanges.includes(timeRange)) {
        return {
          success: false,
          error: `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`
        };
      }

      if (limit && (limit < 1 || limit > 1000)) {
        return {
          success: false,
          error: 'Limit must be between 1 and 1000'
        };
      }

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (limit) params.append('limit', limit.toString());

      const response = await this.axiosInstance.get(`${this.baseURL}/guides?${params.toString()}`);

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch guide analytics'
        };
      }
    } catch (error) {
      console.error('Guide analytics error:', error);
      return this._handleError(error, 'guide analytics');
    }
  }

  /**
   * Get detailed analytics for a specific guide
   */
  async getGuideDetails(guideId, timeRange = '30d', startDate = null, endDate = null) {
    try {
      // Validate guideId
      if (!guideId) {
        return {
          success: false,
          error: 'Guide ID is required'
        };
      }

      // Validate other parameters
      const validation = this._validateParams(timeRange);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await this.axiosInstance.get(`${this.baseURL}/guides/${guideId}?${params.toString()}`);

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to fetch guide details'
        };
      }
    } catch (error) {
      return this._handleError(error, 'guide details');
    }
  }


  /**
   * Export analytics data for a specific guide
   */
  async exportGuideData(guideId, timeRange = 'all', startDate = null, endDate = null, format = 'json') {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (format) params.append('format', format);

      const response = await this.axiosInstance.get(`${this.baseURL}/export/${guideId}?${params.toString()}`);

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to export analytics data'
        };
      }
    } catch (error) {
      console.error('Analytics export error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Network error while exporting analytics data'
      };
    }
  }

  /**
   * Download CSV export for a guide
   */
  async downloadCSVExport(guideId, timeRange = 'all', startDate = null, endDate = null) {
    try {
      const params = new URLSearchParams();
      if (timeRange) params.append('timeRange', timeRange);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('format', 'csv');

      const response = await this.axiosInstance.get(`${this.baseURL}/export/${guideId}?${params.toString()}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `guide_${guideId}_analytics.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return { success: true, message: 'CSV downloaded successfully' };
    } catch (error) {
      console.error('CSV download error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to download CSV'
      };
    }
  }

  /**
   * Format numbers for display
   */
  formatNumber(value) {
    if (value === null || value === undefined) return 'N/A';
    const num = this._safeParseInt(value);
    return num.toLocaleString();
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value) {
    if (value === null || value === undefined) return 'N/A';
    const num = this._safeParseFloat(value);
    return `${num.toFixed(1)}%`;
  }

  /**
   * Format time duration for display
   */
  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const totalSeconds = this._safeParseInt(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = Math.floor(totalSeconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  /**
   * Get time range options for filter dropdown
   */
  getTimeRangeOptions() {
    return [
      { value: '1d', label: 'Last 24 Hours', labelHe: 'היום האחרון' },
      { value: '7d', label: 'Last 7 Days', labelHe: '7 ימים אחרונים' },
      { value: '30d', label: 'Last 30 Days', labelHe: '30 ימים אחרונים' },
      { value: '90d', label: 'Last 90 Days', labelHe: '90 ימים אחרונים' },
      { value: 'all', label: 'All Time', labelHe: 'כל הזמן' }
    ];
  }

  /**
   * Parse and format analytics data for charts
   */
  formatChartData(dailyTrends) {
    if (!dailyTrends || !Array.isArray(dailyTrends)) return [];

    return dailyTrends.map(day => {
      // Ensure date is valid
      const date = day.date ? new Date(day.date) : new Date();
      const formattedDate = isNaN(date) ? new Date().toLocaleDateString('he-IL') : date.toLocaleDateString('he-IL');

      return {
        date: formattedDate,
        views: this._safeParseInt(day.views),
        uniqueVisitors: this._safeParseInt(day.unique_visitors),
        completions: this._safeParseInt(day.completions)
      };
    }).filter(item => item.date); // Filter out invalid entries
  }

  /**
   * Calculate analytics insights
   */
  calculateInsights(overview) {
    const insights = [];

    if (overview) {
      const totalViews = this._safeParseInt(overview.total_views);
      const uniqueVisitors = this._safeParseInt(overview.unique_visitors);
      const completionRate = this._safeParseFloat(overview.completion_rate);

      if (totalViews > uniqueVisitors && uniqueVisitors > 0) {
        const repeatViewsRatio = ((totalViews - uniqueVisitors) / totalViews * 100).toFixed(1);
        insights.push({
          type: 'engagement',
          message: `${repeatViewsRatio}% of views are from returning visitors`,
          messageHe: `${repeatViewsRatio}% מהצפיות הן ממבקרים חוזרים`
        });
      }

      if (completionRate > 50) {
        insights.push({
          type: 'success',
          message: 'High completion rate indicates strong user engagement',
          messageHe: 'שיעור השלמה גבוה מעיד על מעורבות משתמשים חזקה'
        });
      } else if (completionRate < 20) {
        insights.push({
          type: 'warning',
          message: 'Low completion rate suggests content optimization needed',
          messageHe: 'שיעור השלמה נמוך מעיד על צורך באופטימיזציה של התוכן'
        });
      }
    }

    return insights;
  }

  /**
   * Centralized error handling helper
   */
  _handleError(error, context = 'analytics') {
    console.error(`${context} error:`, error);

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || 'Server error';

      if (status === 401) {
        return { success: false, error: 'Authentication required. Please log in again.' };
      } else if (status === 403) {
        return { success: false, error: 'Access denied. Insufficient permissions.' };
      } else if (status === 404) {
        return { success: false, error: 'Data not found.' };
      } else if (status >= 500) {
        return { success: false, error: 'Server error. Please try again later.' };
      }

      return { success: false, error: message };
    } else if (error.request) {
      // Network error
      return { success: false, error: 'Network error. Please check your connection.' };
    } else {
      // Other error
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }

  /**
   * Validate common parameters
   */
  _validateParams(timeRange, limit) {
    const validTimeRanges = ['1d', '7d', '30d', '90d', 'all'];

    if (timeRange && !validTimeRanges.includes(timeRange)) {
      return {
        valid: false,
        error: `Invalid time range. Must be one of: ${validTimeRanges.join(', ')}`
      };
    }

    if (limit !== undefined && (limit < 1 || limit > 1000)) {
      return {
        valid: false,
        error: 'Limit must be between 1 and 1000'
      };
    }

    return { valid: true };
  }

  /**
   * Safely parse integer values, return 0 for invalid inputs
   */
  _safeParseInt(value) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : Math.max(0, parsed); // Ensure non-negative
  }

  /**
   * Safely parse float values, return 0 for invalid inputs
   */
  _safeParseFloat(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.max(0, parsed); // Ensure non-negative
  }
}

// Create and export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance for admin API calls
const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Handle admin access denied
      console.error('Admin access denied:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export const adminService = {
  /**
   * Get platform-wide analytics overview
   */
  async getPlatformAnalytics(params = {}) {
    try {
      const { days = 30 } = params;
      const response = await adminApi.get('/analytics/overview', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Get platform analytics error:', error);
      throw error;
    }
  },


  /**
   * Get platform-wide feedback analysis with dual feedback support
   */
  async getFeedbackAnalytics(params = {}) {
    try {
      const { days = 7, limit = 100, type } = params;
      const response = await adminApi.get('/analytics/feedback', {
        params: { days, limit, ...(type && { type }) }
      });
      return response.data;
    } catch (error) {
      console.error('Get feedback analytics error:', error);
      throw error;
    }
  },

  /**
   * Get usage patterns and trends
   */
  async getUsageAnalytics(params = {}) {
    try {
      const { days = 30 } = params;
      const response = await adminApi.get('/analytics/usage', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Get usage analytics error:', error);
      throw error;
    }
  },

  /**
   * Export analytics data
   */
  async exportAnalytics(params = {}) {
    try {
      const { days = 30, format = 'json' } = params;
      const response = await adminApi.get('/analytics/export', {
        params: { days, format },
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trailguide-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'CSV file downloaded successfully' };
      } else {
        return response.data;
      }
    } catch (error) {
      console.error('Export analytics error:', error);
      throw error;
    }
  },

  /**
   * Check if current user has admin access
   */
  async checkAdminAccess() {
    try {
      const response = await adminApi.get('/analytics/overview?days=1');
      return { hasAccess: true, user: response.data };
    } catch (error) {
      if (error.response?.status === 403) {
        return { hasAccess: false, error: 'Admin access required' };
      }
      throw error;
    }
  }
};
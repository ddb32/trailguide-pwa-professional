/**
 * TypeScript declarations for useAnalytics hook
 * Provides comprehensive type safety for analytics data management
 */

export interface AnalyticsMetrics {
  totalViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversionRate?: number;
  [key: string]: number | undefined;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsData {
  metrics: AnalyticsMetrics;
  timeSeries: TimeSeriesData[];
  topEvents?: Array<{
    id: string;
    name: string;
    views: number;
    engagement: number;
  }>;
  userSegments?: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
}

export interface AnalyticsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  eventId?: string;
  userSegment?: string;
  [key: string]: any;
}

export interface UseAnalyticsReturn {
  // Data
  data: AnalyticsData | null;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAnalytics: (filters?: AnalyticsFilters) => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  clearError: () => void;
  
  // Utilities
  exportData: (format: 'csv' | 'json' | 'pdf') => Promise<void>;
  
  // Status checks
  hasData: boolean;
  isEmpty: boolean;
  hasError: boolean;
}

/**
 * Custom hook for analytics data management
 * Provides comprehensive analytics functionality with filtering and export capabilities
 */
export declare function useAnalytics(initialFilters?: AnalyticsFilters): UseAnalyticsReturn;
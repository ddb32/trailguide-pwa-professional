/**
 * TypeScript declarations for useEvents hooks
 * Provides comprehensive type safety for events data management
 */

export interface EventStats {
  totalGuides: number;
  activeGuides: number;
  totalViews: number;
  thisMonth: number;
  _reliability?: {
    isReliable: boolean;
    hasIssues: boolean;
    lastValidated: string;
    issuesSummary: {
      high: number;
      medium: number;
    };
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FormattedEvent {
  id: string;
  event_id?: string;
  event_name: string;
  description?: string;
  location?: string;
  status: 'draft' | 'published' | 'expired' | 'archived';
  created: string;
  updated_at?: string;
  stepsCount: number;
  steps?: Array<any>;
  _reliability?: {
    isReliable: boolean;
    hasIssues: boolean;
    lastValidated: string;
    issues: Array<any>;
  };
}

export interface UseEventsOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export interface UseEventsReturn {
  // Data
  events: FormattedEvent[];
  stats: EventStats;
  pagination: PaginationInfo;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchEvents: (fetchOptions?: Partial<UseEventsOptions>) => Promise<void>;
  refreshEvents: () => Promise<void>;
  clearError: () => void;
  
  // Computed values
  recentEvents: FormattedEvent[];
  activeEvents: FormattedEvent[];
  draftEvents: FormattedEvent[];
  expiredEvents: FormattedEvent[];
  
  // Utilities
  getRecentEvents: (limit?: number) => FormattedEvent[];
  getEventsByStatus: (status: string) => FormattedEvent[];
  
  // Status checks
  hasEvents: boolean;
  isEmpty: boolean;
  hasError: boolean;
}

export interface UseEventReturn {
  event: FormattedEvent | null;
  isLoading: boolean;
  error: string | null;
  fetchEvent: () => Promise<void>;
  clearError: () => void;
  hasError: boolean;
}

/**
 * Custom hook for managing events data and state
 * Provides loading states, error handling, and data fetching functionality
 */
export declare function useEvents(options?: UseEventsOptions): UseEventsReturn;

/**
 * Hook for managing a single event
 */
export declare function useEvent(eventId: string): UseEventReturn;
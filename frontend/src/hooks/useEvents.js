import { useState, useEffect, useCallback } from 'react';
import { eventsService } from '../services/eventsService';

/**
 * Custom hook for managing events data and state
 * Provides loading states, error handling, and data fetching functionality
 */
export function useEvents(options = {}) {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalGuides: 0,
    activeGuides: 0,
    totalViews: 0,
    thisMonth: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  /**
   * Fetch events from the API
   */
  const fetchEvents = useCallback(async (fetchOptions = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      const queryOptions = {
        page: options.page || 1,
        limit: options.limit || 20, // Get more for dashboard
        status: options.status,
        ...fetchOptions
      };

      const response = await eventsService.getEvents(queryOptions);
      
      if (response.success) {
        const eventsData = response.data.events || [];
        const paginationData = response.data.pagination || {};

        // Format events for display
        const formattedEvents = eventsData.map(event => 
          eventsService.formatEventForDisplay(event)
        );

        setEvents(formattedEvents);
        setPagination(paginationData);

        // Calculate stats from the events data
        const calculatedStats = eventsService.calculateStats(eventsData);
        setStats(calculatedStats);
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.page, options.limit, options.status]);

  /**
   * Refresh events data
   */
  const refreshEvents = useCallback(() => {
    return fetchEvents();
  }, [fetchEvents]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get recent events (for dashboard display)
   */
  const getRecentEvents = useCallback((limit = 5) => {
    return events
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, limit);
  }, [events]);

  /**
   * Get events by status
   */
  const getEventsByStatus = useCallback((status) => {
    return events.filter(event => event.status === status);
  }, [events]);

  // Auto-fetch events when hook is initialized
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    // Data
    events,
    stats,
    pagination,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchEvents,
    refreshEvents,
    clearError,
    
    // Computed values
    recentEvents: getRecentEvents(),
    activeEvents: getEventsByStatus('active'),
    draftEvents: getEventsByStatus('draft'),
    expiredEvents: getEventsByStatus('expired'),
    
    // Utilities
    getRecentEvents,
    getEventsByStatus,
    
    // Status checks
    hasEvents: events.length > 0,
    isEmpty: events.length === 0 && !isLoading,
    hasError: !!error
  };
}

/**
 * Hook for managing a single event
 */
export function useEvent(eventId) {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await eventsService.getEvent(eventId);
      
      if (response.success) {
        const formattedEvent = eventsService.formatEventForDisplay(response.data);
        setEvent(formattedEvent);
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch event:', err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId, fetchEvent]);

  return {
    event,
    isLoading,
    error,
    fetchEvent,
    clearError,
    hasError: !!error
  };
}
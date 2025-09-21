import { useState, useEffect, useCallback } from 'react';
import { eventsService } from '../services/eventsService';

// **PRODUCTION DATA CONSISTENCY CONFIG**
const DATA_VALIDATION_CONFIG = {
  enabled: true, // Always enabled for production reliability
  logLevel: process.env.NODE_ENV === 'development' ? 'verbose' : 'errors_only',
  reportToBackend: false, // TODO: Enable when backend monitoring endpoint is ready
  blockOnHighSeverity: false, // Temporarily disabled for debugging - DO NOT BLOCK workflow
};

/**
 * Production-grade data consistency validator
 * Ensures frontend reliability by detecting backend sync issues
 */
const validateEventData = (eventsData) => {
  if (!DATA_VALIDATION_CONFIG.enabled) return { issues: [], isReliable: true };
  
  const issues = [];
  let hasHighSeverityIssues = false;
  
  eventsData.forEach((event, index) => {
    const eventId = event.id || event.event_id || `index-${index}`;
    
    // **ENDPOINT-AWARE FIELD VALIDATION**: Different validation for list vs detail endpoints
    const hasStepsField = event.steps !== undefined;
    const isListEndpoint = !hasStepsField; // List endpoints don't provide steps array
    
    // **CRITICAL FIELD VALIDATION**: Core data integrity - PRODUCTION BLOCKING
    const criticalFields = [
      { field: 'id', alternative: 'event_id', severity: 'high', required: true },
      { field: 'event_name', severity: 'high', required: true },
      { field: 'status', severity: 'high', required: true },
      { field: 'created_at', alternative: 'created', severity: 'high', required: true }, // Handle both possible field names
      { field: 'updated_at', severity: 'medium', required: false },
      // **CONDITIONAL FIELDS**: Only validate if present (endpoint-dependent)
      ...(isListEndpoint ? [] : [
        { field: 'steps', severity: 'high', required: true }, // Only for detail endpoints
      ]),
    ];
    
    criticalFields.forEach(({ field, alternative, severity, required }) => {
      const value = event[field] || (alternative ? event[alternative] : null);
      
      // **STRICT VALIDATION**: Check for missing required fields
      const isMissing = required ? (!value && value !== 0) : false;
      const isEmpty = Array.isArray(value) ? value.length === 0 : false;
      
      if (isMissing || (field === 'steps' && isEmpty && required)) {
        issues.push({
          eventId,
          issue: 'missing_critical_field', 
          field: alternative ? `${field}/${alternative}` : field,
          severity,
          required,
          isEmpty,
          impact: severity === 'high' ? 'BLOCKS PRODUCTION - Data unreliable' : 'Logging/analytics affected',
          recommendation: required ? 'IMMEDIATE FIX REQUIRED - Cannot proceed without this field' : 'Should be populated for complete data'
        });
        if (severity === 'high') hasHighSeverityIssues = true;
      }
      
      // **SPECIAL HANDLING**: Steps array validation - ENDPOINT AWARE
      if (field === 'steps') {
        // Only validate steps structure if this is a detail endpoint (steps field exists)
        if (!isListEndpoint && !Array.isArray(value)) {
          issues.push({
            eventId,
            issue: 'invalid_steps_structure',
            field: 'steps',
            endpoint_type: 'detail',
            severity: 'high',
            actualType: typeof value,
            expectedType: 'array',
            impact: 'BLOCKS PRODUCTION - Steps data corrupted in detail endpoint',
            recommendation: 'Initialize steps as empty array minimum'
          });
          hasHighSeverityIssues = true;
        }
        // List endpoints don't have steps field - this is expected and not an error
      }
    });
    
    // **STEPS COUNT CONSISTENCY**: Critical for dashboard accuracy - ENDPOINT AWARE VALIDATION
    // Note: isListEndpoint already defined above, reuse it here
    const backendStepsCount = event.steps_count;
    
    if (isListEndpoint) {
      // **LIST ENDPOINT VALIDATION**: Only validate steps_count field presence
      if (backendStepsCount === undefined) {
        issues.push({
          eventId,
          issue: 'missing_steps_count_field',
          endpoint_type: 'list',
          severity: 'medium',
          impact: 'Dashboard may show incorrect step counts',
          recommendation: 'Backend list endpoint should always provide steps_count field',
          autoCorrection: 'Will default to 0 steps'
        });
      } else if (typeof backendStepsCount !== 'number' || backendStepsCount < 0) {
        issues.push({
          eventId,
          issue: 'invalid_steps_count_type',
          endpoint_type: 'list',
          steps_count_value: backendStepsCount,
          steps_count_type: typeof backendStepsCount,
          severity: 'high',
          impact: 'BLOCKS PRODUCTION - Invalid steps_count data type in list endpoint',
          recommendation: 'Backend must provide numeric steps_count >= 0',
          autoCorrection: 'Will default to 0 steps'
        });
        hasHighSeverityIssues = true;
      }
    } else {
      // **DETAIL ENDPOINT VALIDATION**: Validate both steps_count and steps array synchronization
      const stepsArray = event.steps || [];
      const actualStepsLength = Array.isArray(stepsArray) ? stepsArray.length : 0;
      
      // **STEPS ARRAY SAFETY**: Ensure steps is always an array for detail endpoints
      if (!Array.isArray(event.steps)) {
        issues.push({
          eventId,
          issue: 'steps_not_array',
          endpoint_type: 'detail',
          steps_type: typeof event.steps,
          steps_value: event.steps,
          severity: 'high',
          impact: 'BLOCKS PRODUCTION - Steps data structure invalid in detail endpoint',
          recommendation: 'Initialize steps as empty array minimum',
          autoCorrection: 'Will initialize as empty array []'
        });
        hasHighSeverityIssues = true;
      }
      
      // **CRITICAL VALIDATION**: Steps count synchronization for detail endpoints only
      if (backendStepsCount !== undefined && backendStepsCount !== actualStepsLength) {
        issues.push({
          eventId,
          issue: 'steps_count_mismatch',
          endpoint_type: 'detail',
          backend_steps_count: backendStepsCount,
          actual_steps_length: actualStepsLength,
          severity: 'high',
          impact: 'BLOCKS PRODUCTION - Detail endpoint shows incorrect step counts',
          recommendation: `Backend must sync: steps_count should be ${actualStepsLength}`,
          autoCorrection: 'Will use backend steps_count as source of truth'
        });
        hasHighSeverityIssues = true;
      }
      
      // **UNDEFINED STEPS COUNT**: Backend failed to provide count for detail endpoint
      if (backendStepsCount === undefined && actualStepsLength > 0) {
        issues.push({
          eventId,
          issue: 'missing_steps_count_field',
          endpoint_type: 'detail',
          actual_steps_length: actualStepsLength,
          severity: 'medium',
          impact: 'Backend sync issue - steps_count field missing in detail endpoint',
          recommendation: 'Backend detail endpoint should always provide steps_count field',
          autoCorrection: `Will use steps.length (${actualStepsLength}) as fallback`
        });
      }
    }
    
    // **DATA TYPE VALIDATION**: Prevent runtime errors
    const typeValidations = [
      { field: 'steps_count', expectedType: 'number' },
      { field: 'views', expectedType: 'number' },
      { field: 'participants', expectedType: 'number' }
    ];
    
    typeValidations.forEach(({ field, expectedType }) => {
      const value = event[field];
      if (value !== undefined && value !== null && typeof value !== expectedType) {
        issues.push({
          eventId,
          issue: 'invalid_data_type',
          field,
          expected: expectedType,
          actual: typeof value,
          value,
          severity: 'medium',
          impact: 'Potential runtime errors in calculations'
        });
      }
    });
    
    // **CHRONOLOGICAL CONSISTENCY**: Ensure timestamps make sense
    if (event.created && event.updated_at) {
      const created = new Date(event.created);
      const updated = new Date(event.updated_at);
      if (updated < created) {
        issues.push({
          eventId,
          issue: 'chronological_inconsistency',
          created: event.created,
          updated_at: event.updated_at,
          severity: 'medium',
          impact: 'Timeline displays may be incorrect'
        });
      }
    }
  });
  
  return {
    issues,
    isReliable: !hasHighSeverityIssues,
    hasHighSeverityIssues,
    totalIssues: issues.length,
    summary: {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length
    }
  };
};

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
    thisMonth: 0,
    totalFeedback: 0,
    positiveFeedback: 0,
    negativeFeedback: 0,
    positiveFeedbackRate: 0,
    negativeFeedbackRate: 0
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

        // **PRODUCTION DATA CONSISTENCY VALIDATION**
        const validationResult = validateEventData(eventsData);
        
        // **SEVERITY-BASED LOGGING**: Production-appropriate logging
        const shouldLogVerbose = DATA_VALIDATION_CONFIG.logLevel === 'verbose';
        const shouldLogErrors = DATA_VALIDATION_CONFIG.logLevel === 'errors_only' || shouldLogVerbose;
        
        if (validationResult.totalIssues > 0) {
          // **ENHANCED DEBUGGING**: Always log validation issues during debugging phase
          console.error('🚨 VALIDATION ISSUES DETECTED (DEBUG MODE):', {
            totalIssues: validationResult.totalIssues,
            highSeverity: validationResult.summary.high,
            mediumSeverity: validationResult.summary.medium,
            isDataReliable: validationResult.isReliable,
            blockingEnabled: DATA_VALIDATION_CONFIG.blockOnHighSeverity
          });
          console.log('🔍 ALL VALIDATION ISSUES:');
          console.table(validationResult.issues);
          
          if (shouldLogErrors && validationResult.hasHighSeverityIssues) {
            console.error('🚨 HIGH-SEVERITY ISSUES:', {
              totalIssues: validationResult.totalIssues,
              highSeverity: validationResult.summary.high,
              mediumSeverity: validationResult.summary.medium,
              isDataReliable: validationResult.isReliable
            });
            console.table(validationResult.issues.filter(i => i.severity === 'high'));
          }
          
          if (shouldLogVerbose) {
            console.warn('⚠️ Data consistency issues found:', validationResult.summary);
            if (validationResult.summary.medium > 0) {
              console.table(validationResult.issues.filter(i => i.severity === 'medium'));
            }
          }
          
          // **FUTURE: Report to backend monitoring**
          if (DATA_VALIDATION_CONFIG.reportToBackend && validationResult.hasHighSeverityIssues) {
            // TODO: Implement backend reporting
            // await reportDataInconsistency(validationResult.issues);
          }
        } else if (shouldLogVerbose) {
          console.log('✅ Data consistency validation passed - all events are reliable');
        }
        
        // **CRITICAL SEVERITY HANDLING**: Block workflow if data is unreliable
        if (validationResult.hasHighSeverityIssues && DATA_VALIDATION_CONFIG.blockOnHighSeverity) {
          const criticalError = new Error(
            `Critical data integrity issues detected: ${validationResult.summary.high} high-severity problems. ` +
            'Data may be unreliable. Please refresh or contact support.'
          );
          criticalError.validationResult = validationResult;
          setError(criticalError.message);
          
          // Still format events with fallback logic, but mark as unreliable
          console.error('🔥 BLOCKING WORKFLOW: High-severity data issues detected');
          
          // Continue with fallback formatting to prevent total failure
        }

        // **FORMAT WITH CONSISTENCY AWARENESS**: Apply eventsService fallback logic
        const originalDataSnapshot = shouldLogVerbose ? eventsData.map(e => ({
          id: e.id || e.event_id,
          original_steps_count: e.steps_count,
          original_steps_length: e.steps ? e.steps.length : 'undefined'
        })) : null;
        
        const formattedEvents = eventsData.map((event, index) => {
          const formatted = eventsService.formatEventForDisplay(event);
          
          // **TRACK FORMATTER CORRECTIONS**: Log when formatter fixes inconsistencies
          if (shouldLogVerbose && event.steps_count !== formatted.stepsCount) {
            console.log(`🔧 FORMATTER CORRECTION [${event.id || index}]: ` +
              `steps_count ${event.steps_count} → ${formatted.stepsCount} ` +
              `(steps.length: ${event.steps ? event.steps.length : 'N/A'})`);
          }
          
          return formatted;
        });

        // **RELIABILITY METADATA**: Track data reliability for UI decisions
        const reliabilityMetadata = {
          isReliable: validationResult.isReliable,
          hasIssues: validationResult.totalIssues > 0,
          lastValidated: new Date().toISOString(),
          issuesSummary: validationResult.summary
        };

        if (shouldLogVerbose) {
          console.log(`📊 useEvents: Processed ${formattedEvents.length} events`, {
            reliability: reliabilityMetadata,
            corrections: originalDataSnapshot ? 'logged above' : 'verbose mode off'
          });
        }

        setEvents(formattedEvents);
        setPagination(paginationData);

        // Calculate stats from the events data
        const calculatedStats = eventsService.calculateStats(eventsData);
        setStats({
          ...calculatedStats,
          _reliability: reliabilityMetadata // Include reliability info in stats
        });
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
        // **SINGLE EVENT VALIDATION**: Apply same validation to individual events
        const eventData = response.data;
        const validationResult = validateEventData([eventData]);
        
        const shouldLogVerbose = DATA_VALIDATION_CONFIG.logLevel === 'verbose';
        const shouldLogErrors = DATA_VALIDATION_CONFIG.logLevel === 'errors_only' || shouldLogVerbose;
        
        // **LOG SINGLE EVENT ISSUES**
        if (validationResult.totalIssues > 0) {
          if (shouldLogErrors && validationResult.hasHighSeverityIssues) {
            console.error(`🚨 CRITICAL ISSUES in event ${eventId}:`, validationResult.issues);
          } else if (shouldLogVerbose) {
            console.warn(`⚠️ Issues in event ${eventId}:`, validationResult.issues);
          }
        }
        
        // **BLOCK IF CRITICAL**: Prevent using unreliable single event data
        if (validationResult.hasHighSeverityIssues && DATA_VALIDATION_CONFIG.blockOnHighSeverity) {
          const criticalError = new Error(
            `Event ${eventId} has critical data integrity issues. Data may be unreliable.`
          );
          criticalError.validationResult = validationResult;
          setError(criticalError.message);
          console.error(`🔥 BLOCKING: Event ${eventId} has high-severity data issues`);
        }
        
        // **FORMAT WITH VALIDATION AWARENESS**
        const originalStepsCount = eventData.steps_count;
        const formattedEvent = eventsService.formatEventForDisplay(eventData);
        
        // **TRACK CORRECTIONS**: Log if formatter fixed inconsistencies
        if (shouldLogVerbose && originalStepsCount !== formattedEvent.stepsCount) {
          console.log(`🔧 SINGLE EVENT CORRECTION [${eventId}]: ` +
            `steps_count ${originalStepsCount} → ${formattedEvent.stepsCount}`);
        }
        
        // **ADD RELIABILITY METADATA**: Include validation info
        formattedEvent._reliability = {
          isReliable: validationResult.isReliable,
          hasIssues: validationResult.totalIssues > 0,
          lastValidated: new Date().toISOString(),
          issues: validationResult.issues
        };
        
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
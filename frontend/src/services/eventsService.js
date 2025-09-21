import { authService } from './authService';
import axios from 'axios';

// **PRODUCTION-SAFE LOGGING CONFIG**
const PAYLOAD_LOGGING_CONFIG = {
  enabled: process.env.NODE_ENV === 'development', // Only enabled in development by default
  enableInProduction: false, // Explicit flag for production logging if needed
  logLevel: process.env.NODE_ENV === 'development' ? 'verbose' : 'errors_only',
  trackDataConsistency: true, // Always track consistency - minimal performance impact
  maxPayloadSize: process.env.NODE_ENV === 'development' ? 5000 : 500,
  
  // **SENSITIVE DATA PROTECTION**: Fields to mask in production logs
  sensitiveFields: ['token', 'password', 'email', 'phone', 'personal_info'],
  
  // **PERFORMANCE SETTINGS**
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableStructuredLogging: false, // TODO: Enable when proper logging service is available
};

/**
 * Production-safe logging utilities
 */
const LoggingUtils = {
  isEnabled() {
    return PAYLOAD_LOGGING_CONFIG.enabled || 
           (process.env.NODE_ENV === 'production' && PAYLOAD_LOGGING_CONFIG.enableInProduction);
  },
  
  shouldLogVerbose() {
    return this.isEnabled() && PAYLOAD_LOGGING_CONFIG.logLevel === 'verbose';
  },
  
  shouldLogErrors() {
    return PAYLOAD_LOGGING_CONFIG.logLevel === 'errors_only' || this.shouldLogVerbose();
  },
  
  shouldLogConsistency() {
    return PAYLOAD_LOGGING_CONFIG.trackDataConsistency;
  },
  
  /**
   * Mask sensitive data from payloads before logging
   */
  maskSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const masked = { ...data };
    PAYLOAD_LOGGING_CONFIG.sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = '[MASKED]';
      }
    });
    
    return masked;
  },
  
  /**
   * Truncate large payloads for production logging
   */
  truncatePayload(data) {
    if (!data) return data;
    
    const jsonStr = JSON.stringify(data);
    if (jsonStr.length > PAYLOAD_LOGGING_CONFIG.maxPayloadSize) {
      return {
        ...data,
        _truncated: true,
        _originalSize: jsonStr.length,
        _maxSize: PAYLOAD_LOGGING_CONFIG.maxPayloadSize
      };
    }
    return data;
  },
  
  /**
   * Safe console logging that respects configuration
   */
  log(level, message, data = null) {
    if (!PAYLOAD_LOGGING_CONFIG.enableConsoleLogging) return;
    
    const logData = data ? this.truncatePayload(this.maskSensitiveData(data)) : null;
    
    switch (level) {
      case 'error':
        console.error(message, logData);
        break;
      case 'warn':
        console.warn(message, logData);
        break;
      case 'info':
      default:
        console.log(message, logData);
        break;
    }
    
    // **FUTURE: Route to structured logging service**
    if (PAYLOAD_LOGGING_CONFIG.enableStructuredLogging) {
      // TODO: Send to proper logging service (Winston, Pino, etc.)
      // this.sendToLoggingService(level, message, logData);
    }
  }
};

/**
 * Lightweight payload logger for data consistency tracking
 * Production-safe with configurable logging levels and sensitive data protection
 */
const createPayloadLogger = (operation) => {
  if (!LoggingUtils.isEnabled() && !LoggingUtils.shouldLogConsistency()) {
    // Return no-op logger if logging is completely disabled
    return {
      logRequest: () => null,
      logResponse: () => {},
      logDataComparison: () => {},
      sessionId: null
    };
  }
  
  const startTime = Date.now();
  const sessionId = Math.random().toString(36).substr(2, 9);
  
  return {
    logRequest: (method, url, payload = null, metadata = {}) => {
      if (!LoggingUtils.shouldLogVerbose()) return sessionId;
      
      LoggingUtils.log('info', `📤 [${sessionId}] ${operation} REQUEST:`, {
        method,
        url,
        timestamp: new Date().toISOString(),
        hasPayload: !!payload,
        payloadSize: payload ? JSON.stringify(payload).length : 0,
        ...metadata
      });
      
      if (payload) {
        LoggingUtils.log('info', `📋 [${sessionId}] REQUEST PAYLOAD:`, payload);
      }
      
      return sessionId;
    },
    
    logResponse: (success, responseData = null, error = null, metadata = {}) => {
      const duration = Date.now() - startTime;
      
      // Always log errors, even in production
      if (!success && LoggingUtils.shouldLogErrors()) {
        LoggingUtils.log('error', `🚨 [${sessionId}] ${operation} FAILED (${duration}ms):`, {
          error: error?.message || 'Unknown error',
          status: error?.response?.status,
          duration,
          ...metadata
        });
        return;
      }
      
      // Log successful responses only in verbose mode
      if (success && LoggingUtils.shouldLogVerbose()) {
        LoggingUtils.log('info', `📥 [${sessionId}] ${operation} SUCCESS (${duration}ms):`, {
          duration,
          hasData: !!responseData,
          dataSize: responseData ? JSON.stringify(responseData).length : 0,
          ...metadata
        });
        
        if (responseData) {
          LoggingUtils.log('info', `📋 [${sessionId}] RESPONSE DATA:`, responseData);
        }
      }
    },
    
    logDataComparison: (originalData, updatedData, comparisonType = 'save/load') => {
      if (!LoggingUtils.shouldLogConsistency()) return;
      
      // **ALWAYS TRACK CONSISTENCY**: This is critical for data integrity
      if (originalData && updatedData) {
        const keyFields = ['id', 'event_id', 'event_name', 'status', 'steps_count'];
        const inconsistencies = [];
        
        keyFields.forEach(field => {
          const original = originalData[field];
          const updated = updatedData[field];
          if (original !== updated) {
            inconsistencies.push({
              field,
              original,
              updated,
              type: typeof original !== typeof updated ? 'type_change' : 'value_change'
            });
          }
        });
        
        if (inconsistencies.length > 0) {
          // **CRITICAL**: Always log data inconsistencies, even in production
          LoggingUtils.log('warn', `⚠️ [${sessionId}] DATA INCONSISTENCY (${comparisonType}):`, {
            inconsistencies,
            comparisonType,
            timestamp: new Date().toISOString()
          });
        } else if (LoggingUtils.shouldLogVerbose()) {
          LoggingUtils.log('info', `✅ [${sessionId}] Data consistency verified (${comparisonType})`);
        }
      }
    },
    
    sessionId
  };
};

/**
 * Events Service - Handles all event/guide-related API calls
 * Extends the existing auth service axios instance for consistency
 */
class EventsService {
  constructor() {
    // Use the same axios instance as auth service for consistency
    this.axiosInstance = authService.axiosInstance;

    // Create separate public axios instance without auth interceptors
    this.publicAxiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get events for the authenticated user
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 10)
   * @param {string} options.status - Filter by status ('draft', 'published', 'expired', 'archived')
   * @returns {Promise<Object>} Events list with pagination info
   */
  async getEvents(options = {}) {
    const logger = createPayloadLogger('GET_EVENTS');
    
    try {
      // Pre-request authentication check
      const token = localStorage.getItem('token');
      if (!token) {
        const error = new Error('Authentication required. Please log in again.');
        logger.logResponse(false, null, error);
        throw error;
      }
      
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.status) params.append('status', options.status);

      const url = `/events?${params.toString()}`;
      
      // **LOG REQUEST**: Track API call parameters
      logger.logRequest('GET', url, null, {
        options,
        hasToken: !!token,
        paramCount: params.toString().split('&').filter(p => p).length
      });

      const response = await this.axiosInstance.get(url);
      const responseData = response.data.data;
      
      // **LOG RESPONSE**: Track successful response
      logger.logResponse(true, responseData, null, {
        eventCount: responseData?.events?.length || 0,
        paginationInfo: responseData?.pagination || null
      });
      
      return {
        success: true,
        data: responseData,
        message: response.data.message
      };
    } catch (error) {
      // **LOG ERROR**: Always track failures for debugging
      logger.logResponse(false, null, error, {
        hasToken: !!localStorage.getItem('token')
      });
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get a specific event by ID with all its steps
   * @param {string} eventId - UUID of the event
   * @returns {Promise<Object>} Event details with steps
   */
  async getEvent(eventId) {
    const logger = createPayloadLogger('GET_EVENT');
    
    try {
      // Pre-request authentication check
      const token = localStorage.getItem('token');
      if (!token) {
        const error = new Error('Authentication required. Please log in again.');
        logger.logResponse(false, null, error);
        throw error;
      }
      
      const url = `/events/${eventId}`;
      
      // **LOG REQUEST**: Track individual event fetch
      logger.logRequest('GET', url, null, {
        eventId,
        hasToken: !!token
      });

      const response = await this.axiosInstance.get(url);
      const eventData = response.data.data;
      
      // **LOG RESPONSE**: Track successful event load with data consistency info
      logger.logResponse(true, eventData, null, {
        hasData: !!eventData,
        stepCount: eventData?.steps?.length || 0,
        stepsCountField: eventData?.steps_count,
        hasStepsCountMismatch: eventData?.steps_count !== eventData?.steps?.length
      });
      
      return {
        success: true,
        data: eventData,
        message: response.data.message
      };
    } catch (error) {
      // **LOG ERROR**: Track failed event loads
      logger.logResponse(false, null, error, {
        eventId,
        hasToken: !!localStorage.getItem('token')
      });
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      
      return {
        success: false,
        data: null,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Get event for organizer preview (always accessible regardless of expiration)
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Event data for preview
   */
  async getEventPreview(eventId) {
    const logger = createPayloadLogger('GET_EVENT_PREVIEW');

    try {
      // Pre-request authentication check
      const token = localStorage.getItem('token');
      if (!token) {
        const error = new Error('Authentication required. Please log in again.');
        logger.logResponse(false, null, error);
        throw error;
      }

      const url = `/events/${eventId}/preview`;

      // **LOG REQUEST**: Track preview request
      logger.logRequest('GET', url, null, {
        eventId,
        hasToken: !!token,
        previewMode: true
      });

      const response = await this.axiosInstance.get(url);
      const eventData = response.data.data;

      // **LOG RESPONSE**: Track successful preview load
      logger.logResponse(true, eventData, null, {
        hasData: !!eventData,
        stepCount: eventData?.steps?.length || 0,
        previewMode: true
      });

      return {
        success: true,
        data: eventData,
        message: response.data.message
      };
    } catch (error) {
      // **LOG ERROR**: Track failed preview loads
      logger.logResponse(false, null, error, {
        eventId,
        hasToken: !!localStorage.getItem('token'),
        previewMode: true
      });

      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }

      return {
        success: false,
        data: null,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Create a new event (text-only, reliable for both draft and published)
   * @param {Object} eventData - Event data
   * @param {string} eventData.event_name - Name of the event
   * @param {string} eventData.description - Event description (optional)
   * @param {string} eventData.location - Event location (optional)  
   * @param {string} eventData.status - Event status (draft/published)
   * @param {string} eventData.expiration_date - ISO date string (optional)
   * @returns {Promise<Object>} Created event data
   */
  async createEventTextOnly(eventData) {
    const logger = createPayloadLogger('CREATE_EVENT_TEXT_ONLY');
    
    try {
      // **CRITICAL VALIDATION GATE**: Block invalid data before API call
      const validationErrors = [];
      
      if (!eventData.event_name || typeof eventData.event_name !== 'string' || !eventData.event_name.trim()) {
        validationErrors.push('CRITICAL: event_name is required and must be a non-empty string');
      }
      
      if (!eventData.status || !['draft', 'published'].includes(eventData.status)) {
        validationErrors.push('CRITICAL: status must be either "draft" or "published"');
      }
      
      if (eventData.description !== undefined && typeof eventData.description !== 'string') {
        validationErrors.push('CRITICAL: description must be a string if provided');
      }
      
      if (eventData.location !== undefined && typeof eventData.location !== 'string') {
        validationErrors.push('CRITICAL: location must be a string if provided');
      }
      
      // **IMMEDIATE BLOCK**: Stop API call if validation fails
      if (validationErrors.length > 0) {
        const error = new Error(`VALIDATION GATE BLOCKED: ${validationErrors.join('; ')}`);
        logger.logResponse(false, null, error, { 
          validationErrors,
          receivedData: eventData 
        });
        throw error;
      }
      
      console.log('✅ VALIDATION GATE PASSED: Data is valid for API submission');
      
      const payload = {
        event_name: eventData.event_name.trim(), // Ensure trimmed
        description: eventData.description?.trim() || '', // Safe default
        location: eventData.location?.trim() || '', // Safe default
        status: eventData.status,
        expiration_date: eventData.expiration_date,
        expiration_hours: eventData.expiration_hours
      };

      // **LOG REQUEST**: Track create payload
      logger.logRequest('POST', '/events/text-only', payload, {
        hasDescription: !!eventData.description,
        hasLocation: !!eventData.location,
        hasExpiration: !!eventData.expiration_date
      });

      const response = await this.axiosInstance.post('/events/text-only', payload);
      const createdEventData = response.data.data;
      
      // **LOG RESPONSE**: Track successful creation
      logger.logResponse(true, createdEventData, null, {
        createdId: createdEventData?.id,
        createdName: createdEventData?.event_name,
        createdStatus: createdEventData?.status
      });
      
      // **CRITICAL DATA COMPARISON**: Verify save/load consistency
      logger.logDataComparison(payload, createdEventData, 'create_response');
      
      return {
        success: true,
        data: createdEventData,
        message: response.data.message
      };
    } catch (error) {
      // **LOG ERROR**: Track creation failures
      logger.logResponse(false, null, error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // REMOVED: createEventWithImage - fragile single-phase approach
  // Now using unified two-phase approach via createEventWithSteps for all cases

  /**
   * Update an existing event
   * @param {string} eventId - UUID of the event
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Updated event data
   */
  async updateEvent(eventId, eventData) {
    const logger = createPayloadLogger('UPDATE_EVENT');
    
    try {
      // **CRITICAL VALIDATION GATE**: Block invalid data before API call
      const validationErrors = [];
      
      if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
        validationErrors.push('CRITICAL: eventId is required and must be a non-empty string');
      }
      
      if (eventData.event_name !== undefined) {
        if (!eventData.event_name || typeof eventData.event_name !== 'string' || !eventData.event_name.trim()) {
          validationErrors.push('CRITICAL: event_name must be a non-empty string if provided');
        }
      }
      
      if (eventData.status !== undefined && !['draft', 'published', 'expired', 'archived'].includes(eventData.status)) {
        validationErrors.push('CRITICAL: status must be valid if provided (draft/published/expired/archived)');
      }
      
      // **IMMEDIATE BLOCK**: Stop API call if validation fails
      if (validationErrors.length > 0) {
        const error = new Error(`UPDATE VALIDATION GATE BLOCKED: ${validationErrors.join('; ')}`);
        logger.logResponse(false, null, error, { 
          validationErrors,
          eventId,
          receivedData: eventData 
        });
        throw error;
      }
      
      console.log('✅ UPDATE VALIDATION GATE PASSED: Data is valid for API submission');
      
      // **LOG REQUEST**: Track update payload
      logger.logRequest('PUT', `/events/${eventId}`, eventData, {
        eventId,
        updateFields: Object.keys(eventData).length,
        validationPassed: true
      });

      const response = await this.axiosInstance.put(`/events/${eventId}`, eventData);
      const updatedEventData = response.data.data;
      
      // **LOG RESPONSE**: Track successful update
      logger.logResponse(true, updatedEventData, null, {
        eventId,
        updatedFields: Object.keys(eventData)
      });
      
      // **CRITICAL DATA COMPARISON**: Verify update consistency
      logger.logDataComparison(eventData, updatedEventData, 'update_response');
      
      return {
        success: true,
        data: updatedEventData,
        message: response.data.message
      };
    } catch (error) {
      // **LOG ERROR**: Track update failures
      logger.logResponse(false, null, error, { eventId });
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Update cover image for an existing event
   * @param {string} eventId - UUID of the event
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<Object>} Updated event data
   */
  async updateEventCoverImage(eventId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('coverImage', imageFile);

      // Unified upload pattern (identical to step images)
      const response = await this.axiosInstance.put(`/events/${eventId}/cover-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Delete an event
   * @param {string} eventId - UUID of the event
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteEvent(eventId) {
    try {
      const response = await this.axiosInstance.delete(`/events/${eventId}`);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Calculate dashboard statistics from events data
   * @param {Array} events - Array of events
   * @returns {Object} Statistics object
   */
  calculateStats(events) {
    if (!Array.isArray(events)) {
      return {
        totalGuides: 0,
        activeGuides: 0,
        totalViews: 0,
        thisMonth: 0
      };
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = events.reduce((acc, event) => {
      // Count all guides
      acc.totalGuides++;

      // Count active (published and not expired) guides
      if (event.status === 'published') {
        const expirationDate = event.expiration_date ? new Date(event.expiration_date) : null;
        if (!expirationDate || expirationDate > now) {
          acc.activeGuides++;
        }
      }

      // Sum total views
      acc.totalViews += event.clicks_count || 0;

      // Count guides created this month
      const createdDate = new Date(event.created_at);
      if (createdDate >= thisMonth) {
        acc.thisMonth++;
      }

      return acc;
    }, {
      totalGuides: 0,
      activeGuides: 0,
      totalViews: 0,
      thisMonth: 0
    });

    return stats;
  }

  /**
   * Format event data for display in components with enhanced data synchronization
   * @param {Object} event - Raw event data from API
   * @returns {Object} Formatted event data with consistency validation
   */
  formatEventForDisplay(event) {
    if (!event) return null;
    
    // **CRITICAL AUTO-CORRECTION**: Ensure event has required fields - PRODUCTION SAFETY
    const correctedEvent = {
      ...event,
      // **AUTO-FIX**: Ensure steps is always an array (NEVER undefined) - BUT ONLY IF PROVIDED
      // List endpoints may not include steps array, only steps_count
      steps: event.steps !== undefined ? (Array.isArray(event.steps) ? event.steps : []) : undefined,
      // **AUTO-FIX**: Ensure critical fields exist with defaults
      id: event.id || event.event_id || `auto-id-${Date.now()}`,
      event_name: event.event_name || 'Untitled Event',
      status: event.status || 'draft', 
      created: event.created || new Date().toISOString(),
      updated_at: event.updated_at || event.created || new Date().toISOString()
    };
    
    // **ENHANCED STEPS COUNT LOGIC**: Handle list vs detail endpoint differences
    let stepsCount = 0;
    let dataConsistencyIssue = false;
    let isListEndpoint = correctedEvent.steps === undefined; // List endpoints don't provide steps array
    
    // **DIFFERENTIATE ENDPOINTS**: List vs Detail endpoint handling
    if (isListEndpoint) {
      // **LIST ENDPOINT**: Only has steps_count, no steps array (this is expected)
      if (typeof correctedEvent.steps_count === 'number' && correctedEvent.steps_count >= 0) {
        stepsCount = correctedEvent.steps_count;
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 List endpoint data - using steps_count:', {
            guideId: correctedEvent.id,
            guideName: correctedEvent.event_name,
            stepsCount: stepsCount,
            source: 'list_endpoint_steps_count'
          });
        }
      } else {
        stepsCount = 0;
        console.warn('📊 List endpoint missing steps_count field:', {
          guideId: correctedEvent.id,
          guideName: correctedEvent.event_name,
          fallbackStepsCount: 0
        });
      }
    } else {
      // **DETAIL ENDPOINT**: Has both steps_count and steps array - validate synchronization
      const stepsArray = correctedEvent.steps || [];
      
      // Trust backend steps_count if available
      if (typeof correctedEvent.steps_count === 'number' && correctedEvent.steps_count >= 0) {
        stepsCount = correctedEvent.steps_count;
      } else {
        stepsCount = stepsArray.length;
        console.warn('📊 Detail endpoint fallback: Using steps.length for missing steps_count', {
          guideId: correctedEvent.id,
          guideName: correctedEvent.event_name,
          calculatedStepsCount: stepsCount,
          backendStepsCount: correctedEvent.steps_count,
          stepsArrayLength: stepsArray.length
        });
      }
      
      // **DATA CONSISTENCY VALIDATION**: Only validate for detail endpoints with both fields
      if (correctedEvent.steps_count !== undefined && stepsArray.length !== correctedEvent.steps_count) {
        dataConsistencyIssue = true;
        console.error('🚨 DATA INCONSISTENCY DETECTED - DETAIL ENDPOINT MISMATCH:', {
          guideId: correctedEvent.id,
          guideName: correctedEvent.event_name,
          backendStepsCount: correctedEvent.steps_count,
          stepsArrayLength: stepsArray.length,
          message: 'Detail endpoint: Backend steps_count does not match steps array length',
          autoCorrection: 'Using backend steps_count as source of truth for display',
          timestamp: new Date().toISOString()
        });
        
        // **AUTO-CORRECTION**: Use backend steps_count as source of truth for detail endpoints
        stepsCount = correctedEvent.steps_count;
      }
    }
    
    // **COMPREHENSIVE LOGGING**: Track dashboard data with endpoint awareness
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Dashboard format data (ENDPOINT-AWARE):', {
        guideId: correctedEvent.id,
        guideName: correctedEvent.event_name,
        endpointType: isListEndpoint ? 'list' : 'detail',
        backendStepsCount: correctedEvent.steps_count,
        stepsArrayLength: correctedEvent.steps ? correctedEvent.steps.length : 'N/A (list endpoint)',
        finalStepsCount: stepsCount,
        hasConsistencyIssue: dataConsistencyIssue,
        autoCorrectionsApplied: {
          stepsInitialized: event.steps !== undefined && !Array.isArray(event.steps),
          fieldsDefaulted: !event.id || !event.event_name || !event.status || !event.created
        },
        timestamp: new Date().toISOString()
      });
    }

    return {
      id: correctedEvent.id,
      name: correctedEvent.event_name,
      slug: correctedEvent.slug,
      status: this.mapEventStatus(correctedEvent.status, correctedEvent.expiration_date),
      views: correctedEvent.clicks_count || 0,
      completion_count: correctedEvent.completion_count || 0,
      created: this.formatDate(correctedEvent.created_at || correctedEvent.created),
      expires: correctedEvent.expiration_date ? this.formatDate(correctedEvent.expiration_date) : null,
      expiration_date: correctedEvent.expiration_date, // Preserve original field for real-time components
      stepsCount: stepsCount, // Enhanced with fallback logic and validation
      metadata: correctedEvent.metadata || {},
      description: correctedEvent.metadata?.description, // Extract description for DataTable
      steps: stepsCount, // Legacy field for compatibility
      
      // **DEBUG INFO**: Add consistency tracking for development with endpoint awareness
      _dataConsistency: {
        endpointType: isListEndpoint ? 'list' : 'detail',
        backendStepsCount: correctedEvent.steps_count,
        calculatedStepsCount: correctedEvent.steps ? correctedEvent.steps.length : 'N/A (list endpoint)',
        hasStepsArray: correctedEvent.steps !== undefined,
        isConsistent: !dataConsistencyIssue,
        source: isListEndpoint ? 'list_endpoint_steps_count' : 
                (typeof correctedEvent.steps_count === 'number' ? 'backend_steps_count' : 'calculated_from_array'),
        autoCorrectionApplied: (event.steps !== undefined && !Array.isArray(event.steps)) || !event.id || !event.event_name,
        isProductionSafe: !dataConsistencyIssue || isListEndpoint // List endpoints are safe by design
      }
    };
  }

  /**
   * Map API event status to display status (considering expiration)
   * @param {string} status - API status
   * @param {string} expirationDate - ISO date string
   * @returns {string} Display status
   */
  mapEventStatus(status, expirationDate) {
    if (status === 'published' && expirationDate) {
      const expiration = new Date(expirationDate);
      const now = new Date();
      
      if (expiration <= now) {
        return 'expired';
      }
    }
    
    // Map 'published' to 'active' for display
    return status === 'published' ? 'active' : status;
  }

  /**
   * Format date for display (supports Hebrew RTL)
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    
    // Use Hebrew locale if available, otherwise fallback to default
    try {
      return date.toLocaleDateString('he-IL', options);
    } catch (error) {
      return date.toLocaleDateString('en-US', options);
    }
  }

  /**
   * Extract error message from API response
   * @param {Error} error - Axios error object
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.status === 401) {
      return 'Authentication required. Please log in again.';
    }
    
    if (error.response?.status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    }
    
    if (error.response?.status === 404) {
      return 'Requested resource not found.';
    }
    
    if (error.response?.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      return 'Network connection error. Please check your internet connection.';
    }
    
    return error.message || 'An unexpected error occurred';
  }

  /**
   * Create a single step for an event
   * @param {string} eventId - UUID of the event
   * @param {Object} stepData - Step data
   * @param {number} stepData.step_order - Order of the step (1, 2, 3, etc.)
   * @param {string} stepData.description - Step description
   * @param {string} stepData.image_url - Optional image URL
   * @param {string} stepData.image_alt - Optional image alt text
   * @param {Object} stepData.metadata - Optional metadata (wazeLink, etc.)
   * @returns {Promise<Object>} Created step data
   */
  async createStep(eventId, stepData) {
    try {
      const response = await this.axiosInstance.post(`/steps/${eventId}/steps`, stepData);
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Upload image for a specific step
   * @param {string} stepId - UUID of the step
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<Object>} Updated step data with image URL
   */
  async uploadStepImage(stepId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('stepImage', imageFile);

      const response = await this.axiosInstance.post(`/steps/${stepId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      // Enhanced error handling for image upload scenarios
      if (error.response && error.response.data) {
        const { data } = error.response;
        
        // Handle specific backend error codes
        if (data.error === 'FILE_TOO_LARGE') {
          throw new Error('File size too large. Maximum size is 5MB.');
        }
        
        if (data.error === 'INVALID_FILE_TYPE') {
          throw new Error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.');
        }
        
        if (data.error === 'TOO_MANY_FILES') {
          throw new Error('Only one image file is allowed.');
        }
      }
      
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Create event with steps in a two-phase process
   * @param {Object} eventData - Complete event data including steps
   * @returns {Promise<Object>} Created event with all steps
   */
  async createEventWithSteps(eventData) {
    let createdEventId = null;
    
    try {
      console.log('🚀 Starting two-phase event creation:', {
        hasNewCoverImage: eventData.coverImage && eventData.coverImage instanceof File,
        coverImageName: eventData.coverImage?.name,
        status: eventData.status,
        hasSteps: eventData.steps?.length > 0
      });

      // Phase 1: Create the event (text-only, reliable for both draft/published)
      const eventResult = await this.createEventTextOnly(eventData);
      
      if (!eventResult.success) {
        throw new Error(eventResult.message || 'Failed to create event');
      }

      createdEventId = eventResult.data.id;
      let finalEventData = eventResult.data;

      // Initialize image upload results for consistent tracking
      let imageUploadResults = {
        total: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Phase 2: Upload cover image if provided - with proper error tracking
      let coverImageStatus = { success: true, error: null };
      
      if (eventData.coverImage && eventData.coverImage instanceof File) {
        console.log('🖼️ Uploading cover image after event creation...', {
          eventId: createdEventId,
          filename: eventData.coverImage.name,
          size: `${Math.round(eventData.coverImage.size / 1024)} KB`
        });
        
        try {
          const coverImageResult = await this.updateEventCoverImage(createdEventId, eventData.coverImage);
          
          if (coverImageResult.success) {
            finalEventData = coverImageResult.data;
            console.log('✅ Cover image uploaded successfully for new event');
          } else {
            coverImageStatus = { 
              success: false, 
              error: `Cover image upload failed: ${coverImageResult.error || 'Unknown error'}` 
            };
            console.error('❌ Cover image upload failed:', coverImageResult.error);
          }
        } catch (coverImageError) {
          coverImageStatus = { 
            success: false, 
            error: `Cover image upload error: ${coverImageError.message}` 
          };
          console.error('❌ Cover image upload error:', {
            eventId: createdEventId,
            filename: eventData.coverImage.name,
            error: coverImageError.message
          });
        }
      } else {
        console.log('ℹ️ No cover image to upload for new event');
      }

      // Phase 3: Create steps if provided
      if (eventData.steps && eventData.steps.length > 0) {
        const createdSteps = [];
        const imageUploadResults = {
          total: 0,
          successful: 0,
          failed: 0,
          errors: []
        };
        
        for (let i = 0; i < eventData.steps.length; i++) {
          const step = eventData.steps[i];
          const stepData = {
            step_order: i + 1,
            description: step.description || '',
            metadata: {}
          };

          // Only include image fields if they have actual values
          // Don't send null values as they fail backend validation
          if (step.image_url && typeof step.image_url === 'string') {
            stepData.image_url = step.image_url;
            stepData.image_alt = step.description ? `Step ${i + 1} image` : '';
          }

          // Store image reference for later upload (after step creation)
          let stepImageFile = null;
          if (step.image && step.image instanceof File) {
            stepImageFile = step.image;
            stepData.metadata.hasImage = true;
            stepData.metadata.imageName = step.image.name;
            stepData.metadata.imageSize = step.image.size;
            stepData.metadata.imageType = step.image.type;
          }

          // Add wazeLink to metadata if provided
          if (step.wazeLink) {
            stepData.metadata.wazeLink = step.wazeLink;
          }

          // Add any other metadata
          if (step.metadata) {
            stepData.metadata = { ...stepData.metadata, ...step.metadata };
          }

          try {
            const stepResult = await this.createStep(createdEventId, stepData);
            if (stepResult.success && stepResult.data) {
              let createdStep = stepResult.data;
              
              // Upload step image if one was provided
              if (stepImageFile) {
                imageUploadResults.total++;
                try {
                  console.log(`📤 Uploading image for step ${i + 1}:`, {
                    filename: stepImageFile.name,
                    size: stepImageFile.size,
                    type: stepImageFile.type,
                    stepId: createdStep.id
                  });
                  
                  const uploadResult = await this.uploadStepImage(createdStep.id, stepImageFile);
                  
                  if (uploadResult.success && uploadResult.data) {
                    // Update step data with uploaded image information
                    createdStep = {
                      ...createdStep,
                      image_url: uploadResult.data.image_url,
                      image_alt: uploadResult.data.image_alt,
                      updated_at: uploadResult.data.updated_at
                    };
                    imageUploadResults.successful++;
                    console.log(`✅ Successfully uploaded image for step ${i + 1}:`, uploadResult.data.image_url);
                  }
                } catch (uploadError) {
                  // Track failed uploads
                  imageUploadResults.failed++;
                  imageUploadResults.errors.push({
                    step: i + 1,
                    filename: stepImageFile.name,
                    size: stepImageFile.size,
                    type: stepImageFile.type,
                    error: uploadError.message
                  });
                  
                  // Log warning but don't fail entire guide creation
                  console.warn(`❌ Failed to upload image for step ${i + 1}:`, {
                    filename: stepImageFile.name,
                    size: `${Math.round(stepImageFile.size / 1024)} KB`,
                    error: uploadError.message
                  });
                  // Keep the step without image - graceful degradation
                }
              }
              
              createdSteps.push(createdStep);
            } else {
              console.error(`Step ${i + 1} creation returned unsuccessful result:`, stepResult);
              throw new Error(`Step ${i + 1} creation failed: ${stepResult.message || 'Unknown error'}`);
            }
          } catch (stepError) {
            console.error(`Failed to create step ${i + 1}:`, stepError);
            
            // For now, throw the error to make the failure visible
            // This will prevent showing success when steps fail
            throw new Error(`Failed to create step ${i + 1}: ${stepError.message || stepError}`);
          }
        }

        // Add image upload summary
        if (imageUploadResults.total > 0) {
          console.log(`📊 Image Upload Summary: ${imageUploadResults.successful}/${imageUploadResults.total} successful`);
          if (imageUploadResults.failed > 0) {
            console.warn(`⚠️ Failed image uploads:`, imageUploadResults.errors);
          }
        }
        
        // Update the final result to include created steps and upload stats
        finalEventData.steps = createdSteps;
      }
      
      // Prepare final result with comprehensive info including cover image status
      const finalResult = {
        success: true,
        data: finalEventData,
        message: 'Guide created successfully',
        stepsCreated: eventData.steps?.length || 0,
        totalSteps: eventData.steps?.length || 0,
        imageUploads: imageUploadResults || { total: 0, successful: 0, failed: 0 },
        coverImage: coverImageStatus // Include cover image upload status
      };

      console.log('🎉 Event creation completed:', {
        eventId: finalEventData.id,
        status: finalEventData.status,
        hasCoverImage: !!finalEventData.cover_image_url,
        coverImageUpload: coverImageStatus,
        stepsCreated: finalResult.stepsCreated
      });

      return finalResult;

    } catch (error) {
      // If event creation itself failed, createdEventId will be null
      // If step creation failed, we already logged it above
      throw error;
    }
  }

  /**
   * Get a public event by ID (no authentication required)
   * Used for shareable guide links that can be viewed by anyone
   * @param {string} eventId - UUID of the event 
   * @returns {Promise<Object>} Event data with steps
   */
  async getPublicEvent(eventId, analyticsHeaders = {}) {
    try {
      // Enhanced visitor tracking: Include analytics headers if provided
      const headers = {
        ...analyticsHeaders
      };

      const response = await this.publicAxiosInstance.get(`/api/v1/public/events/${eventId}`, {
        headers
      });

      return {
        success: true,
        data: response.data.data.event,
        analytics: response.data.data.analytics,
        message: response.data.message
      };
    } catch (error) {
      console.error('Service get public event error:', error);
      
      // Handle specific public access errors
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Guide not found or not published',
          errorType: 'not_found',
          notFound: true
        };
      }
      
      if (error.response?.status === 410) {
        // Handle expired guide response
        const responseData = error.response.data;
        return {
          success: false,
          error: responseData.message || 'This guide has expired',
          errorType: 'expired',
          isExpired: true,
          expiredAt: responseData.expired_at,
          eventName: responseData.event_name
        };
      }
      
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Get a public event by slug (no authentication required)
   * Used for SEO-friendly shareable URLs
   * @param {string} slug - URL slug of the event
   * @returns {Promise<Object>} Event data with steps
   */
  async getPublicEventBySlug(slug, analyticsHeaders = {}) {
    try {
      // Enhanced visitor tracking: Include analytics headers if provided
      const headers = {
        ...analyticsHeaders
      };

      const response = await this.publicAxiosInstance.get(`/api/v1/public/events/slug/${slug}`, {
        headers
      });

      return {
        success: true,
        data: response.data.data.event,
        analytics: response.data.data.analytics,
        message: response.data.message
      };
    } catch (error) {
      console.error('Service get public event by slug error:', error);
      
      // Handle specific public access errors
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Guide not found or not published',
          errorType: 'not_found',
          notFound: true
        };
      }
      
      if (error.response?.status === 410) {
        // Handle expired guide response
        const responseData = error.response.data;
        return {
          success: false,
          error: responseData.message || 'This guide has expired',
          errorType: 'expired',
          isExpired: true,
          expiredAt: responseData.expired_at,
          eventName: responseData.event_name
        };
      }
      
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Submit feedback for a completed guide with enhanced validation and duplicate prevention
   * @param {string} eventId - UUID of the event
   * @param {string} viewId - UUID of the event view session
   * @param {Object} feedbackData - Feedback data
   * @param {string} feedbackData.feedback_type - Type: 'guide' or 'founder'
   * @param {boolean} feedbackData.helpful - Helpful/not helpful rating (guide feedback)
   * @param {boolean} feedbackData.conceptLiked - App concept liked rating (guide feedback)
   * @param {string} feedbackData.overall_rating - Overall experience rating (founder feedback)
   * @param {string} feedbackData.concept_rating - Concept rating (founder feedback)
   * @param {string} feedbackData.presentation_rating - Presentation rating (founder feedback)
   * @param {string} feedbackData.recommend_rating - Recommendation rating (founder feedback)
   * @param {string} feedbackData.feedback_text - Text feedback (optional)
   * @returns {Promise<Object>} Feedback submission result
   */
  async submitFeedback(eventId, viewId, feedbackData) {
    const logger = createPayloadLogger('SUBMIT_FEEDBACK');

    try {
      // **CRITICAL VALIDATION GATE**: Client-side validation before API call
      const validationErrors = [];

      if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
        validationErrors.push('CRITICAL: eventId is required and must be a non-empty string');
      }

      if (!viewId || typeof viewId !== 'string' || !viewId.trim()) {
        validationErrors.push('CRITICAL: viewId is required and must be a non-empty string');
      }

      if (!feedbackData || typeof feedbackData !== 'object') {
        validationErrors.push('CRITICAL: feedbackData is required and must be an object');
      }

      if (!feedbackData.feedback_type || !['guide', 'founder'].includes(feedbackData.feedback_type)) {
        validationErrors.push('CRITICAL: feedback_type must be either "guide" or "founder"');
      }

      // Validate feedback content based on type
      const isGuideFeedback = feedbackData.feedback_type === 'guide';
      const isFounderFeedback = feedbackData.feedback_type === 'founder';

      if (isGuideFeedback) {
        const hasHelpful = feedbackData.helpful !== null && feedbackData.helpful !== undefined;
        const hasConceptLiked = feedbackData.conceptLiked !== null && feedbackData.conceptLiked !== undefined;
        const hasTextFeedback = feedbackData.feedback_text && feedbackData.feedback_text.trim();

        if (!hasHelpful && !hasConceptLiked && !hasTextFeedback) {
          validationErrors.push('CRITICAL: Guide feedback must include at least one rating (helpful, conceptLiked) or text comment');
        }
      }

      if (isFounderFeedback) {
        const hasAnyRating = feedbackData.overall_rating || feedbackData.concept_rating ||
                            feedbackData.presentation_rating || feedbackData.recommend_rating;
        const hasTextFeedback = feedbackData.feedback_text && feedbackData.feedback_text.trim();

        if (!hasAnyRating && !hasTextFeedback) {
          validationErrors.push('CRITICAL: Founder feedback must include at least one rating or text comment');
        }
      }

      if (feedbackData.feedback_text && feedbackData.feedback_text.length > 1000) {
        validationErrors.push('CRITICAL: feedback_text must not exceed 1000 characters');
      }

      // **IMMEDIATE BLOCK**: Stop API call if validation fails
      if (validationErrors.length > 0) {
        const error = new Error(`FEEDBACK VALIDATION GATE BLOCKED: ${validationErrors.join('; ')}`);
        logger.logResponse(false, null, error, {
          validationErrors,
          receivedData: feedbackData
        });
        throw error;
      }

      console.log('✅ FEEDBACK VALIDATION GATE PASSED: Data is valid for submission');

      const requestBody = {
        viewId,
        feedback_type: feedbackData.feedback_type,
        feedback_text: feedbackData.feedback_text || null
      };

      // Add guide-specific fields with new structure (helpful + conceptLiked)
      if (isGuideFeedback) {
        requestBody.helpful = feedbackData.helpful !== undefined ? feedbackData.helpful : null;
        // Map conceptLiked to the expected backend field for now (liked)
        // TODO: Update backend to support conceptLiked field specifically
        requestBody.liked = feedbackData.conceptLiked !== undefined ? feedbackData.conceptLiked : null;
      }

      // Add founder-specific fields
      if (isFounderFeedback) {
        requestBody.overall_rating = feedbackData.overall_rating || null;
        requestBody.concept_rating = feedbackData.concept_rating || null;
        requestBody.presentation_rating = feedbackData.presentation_rating || null;
        requestBody.recommend_rating = feedbackData.recommend_rating || null;
      }

      // **LOG REQUEST**: Track feedback submission attempt
      logger.logRequest('POST', `/api/v1/public/events/${eventId}/feedback`, requestBody, {
        eventId,
        viewId,
        feedbackType: feedbackData.feedback_type,
        hasHelpful: isGuideFeedback && feedbackData.helpful !== null,
        hasConceptLiked: isGuideFeedback && feedbackData.conceptLiked !== null,
        hasTextFeedback: !!feedbackData.feedback_text,
        validationPassed: true
      });

      const response = await this.publicAxiosInstance.post(`/api/v1/public/events/${eventId}/feedback`, requestBody);

      // **LOG SUCCESS**: Track successful feedback submission
      logger.logResponse(true, response.data, null, {
        feedbackId: response.data.data?.feedbackId,
        submittedAt: response.data.data?.submittedAt
      });

      console.log('✅ Feedback submitted successfully:', response.data);

      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      // **ENHANCED ERROR HANDLING**: Handle specific duplicate submission cases
      if (error.response?.status === 409) {
        // Duplicate submission detected by backend
        const duplicateError = new Error('Feedback has already been submitted for this guide session. Each guide can only be rated once.');
        logger.logResponse(false, null, duplicateError, {
          errorType: 'duplicate_submission',
          eventId,
          viewId,
          originalError: error.response.data?.message
        });
        throw duplicateError;
      }

      if (error.response?.status === 400) {
        // Validation error from backend
        const validationError = new Error(error.response.data?.message || 'Invalid feedback data provided.');
        logger.logResponse(false, null, validationError, {
          errorType: 'validation_error',
          eventId,
          viewId,
          backendErrors: error.response.data?.errors
        });
        throw validationError;
      }

      // **LOG ERROR**: Track all other feedback submission failures
      logger.logResponse(false, null, error, {
        eventId,
        viewId,
        errorType: 'submission_failed'
      });

      console.error('❌ Feedback submission failed:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get analytics summary for the authenticated organizer
   * @param {Object} options - Analytics options
   * @param {number} options.days - Number of days to analyze (default: 30)
   * @param {boolean} options.include_deleted - Include deleted guides (default: false)
   * @returns {Promise<Object>} Analytics summary data
   */
  async getAnalyticsSummary(options = {}) {
    try {
      const { days = 30, include_deleted = false } = options;
      
      const params = new URLSearchParams();
      if (days !== 30) params.append('days', days.toString());
      if (include_deleted) params.append('include_deleted', 'true');

      const response = await this.axiosInstance.get(`/events/analytics/summary?${params.toString()}`); 
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get analytics summary error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get detailed analytics for a specific event
   * @param {string} eventId - UUID of the event
   * @param {Object} options - Analytics options  
   * @param {number} options.days - Number of days to analyze (default: 30)
   * @returns {Promise<Object>} Detailed event analytics data
   */
  async getEventAnalytics(eventId, options = {}) {
    try {
      const { days = 30 } = options;
      
      const params = new URLSearchParams();
      if (days !== 30) params.append('days', days.toString());

      const response = await this.axiosInstance.get(`/events/${eventId}/analytics?${params.toString()}`); 
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get event analytics error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get recent feedback for the authenticated organizer
   * @param {Object} options - Feedback options
   * @param {number} options.limit - Number of feedback entries to retrieve (default: 20)
   * @param {number} options.days - Number of days to look back (default: 7)
   * @returns {Promise<Object>} Recent feedback data
   */
  async getRecentFeedback(options = {}) {
    try {
      const { limit = 20, days = 7 } = options;
      
      const params = new URLSearchParams();
      if (limit !== 20) params.append('limit', limit.toString());
      if (days !== 7) params.append('days', days.toString());

      const response = await this.axiosInstance.get(`/events/analytics/feedback/recent?${params.toString()}`); 
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Get recent feedback error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Update event with steps (simplified version for edit functionality)
   * @param {string} eventId - UUID of the event to update
   * @param {Object} eventData - Complete event data including steps
   * @returns {Promise<Object>} Updated event data
   */
  async updateEventWithSteps(eventId, eventData) {
    try {
      console.log(`🔄 Updating event: ${eventId} (${eventData.steps?.length || 0} steps)`);
      
      // Phase 1: Update the event basic info (without cover image)
      const updateData = {
        event_name: eventData.event_name,
        metadata: {
          description: eventData.description,
          location: eventData.location
        },
        status: eventData.status,
        expiration_hours: eventData.expiration_hours
      };

      const eventResult = await this.updateEvent(eventId, updateData);
      
      if (!eventResult.success) {
        throw new Error(eventResult.message || 'Failed to update event');
      }

      let finalEventData = eventResult.data;

      // Phase 2: Handle cover image updates - with proper error tracking
      let coverImageStatus = { success: true, error: null, action: 'none' };
      
      if (eventData.coverImage && eventData.coverImage instanceof File) {
        // User uploaded a NEW cover image
        coverImageStatus.action = 'upload';
        console.log('🖼️ Uploading new cover image...', {
          eventId,
          filename: eventData.coverImage.name,
          size: `${Math.round(eventData.coverImage.size / 1024)} KB`
        });
        
        try {
          const coverImageResult = await this.updateEventCoverImage(eventId, eventData.coverImage);
          
          if (coverImageResult.success) {
            finalEventData = coverImageResult.data;
            console.log('✅ New cover image uploaded successfully');
          } else {
            coverImageStatus = { 
              success: false, 
              error: `Cover image upload failed: ${coverImageResult.error || 'Unknown error'}`,
              action: 'upload'
            };
            console.error('❌ New cover image upload failed:', coverImageResult.error);
          }
        } catch (coverImageError) {
          coverImageStatus = { 
            success: false, 
            error: `Cover image upload error: ${coverImageError.message}`,
            action: 'upload'
          };
          console.error('❌ New cover image upload error:', {
            eventId,
            filename: eventData.coverImage.name,
            error: coverImageError.message
          });
        }
      } else if (eventData.hasExistingCoverImage) {
        // User kept existing cover image - no action needed
        coverImageStatus.action = 'keep';
        console.log('ℹ️ Keeping existing cover image:', eventData.existingCoverImageUrl);
      } else {
        // No cover image at all
        coverImageStatus.action = 'none';
        console.log('ℹ️ No cover image (new or existing)');
      }

      // Phase 3: Handle step reconciliation (full snapshot approach)
      if (eventData.steps && eventData.steps.length > 0) {
        console.log('🔄 Processing step reconciliation...');
        const updatedSteps = [];
        const stepUpdateResults = {
          total: eventData.steps.length,
          updated: 0,
          created: 0,
          deleted: 0,
          imageUploads: { successful: 0, failed: 0 },
          errors: []
        };

        // Step 1: Get current steps from database for reconciliation
        const currentStepsResult = await this.axiosInstance.get(`/events/${eventId}`);
        const currentStepsInDB = currentStepsResult.data.data?.steps || [];
        
        // Step 2: Determine which steps to delete (exist in DB but not in frontend)
        const frontendStepIds = eventData.steps
          .filter(step => step.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(step.id))
          .map(step => step.id);
        
        const stepsToDelete = currentStepsInDB.filter(dbStep => !frontendStepIds.includes(dbStep.id));
        
        // Step 3: Delete removed steps
        for (const stepToDelete of stepsToDelete) {
          try {
            await this.axiosInstance.delete(`/steps/${stepToDelete.id}`);
            stepUpdateResults.deleted++;
            console.log(`🗑️ Deleted step ${stepToDelete.step_order} (ID: ${stepToDelete.id})`);
          } catch (deleteError) {
            stepUpdateResults.errors.push({
              step: stepToDelete.step_order,
              type: 'step_deletion',
              error: deleteError.message
            });
            console.error(`❌ Failed to delete step ${stepToDelete.step_order}:`, deleteError.message);
          }
        }
        
        // Step 4: Create/Update remaining steps (full snapshot reconciliation)
        for (let i = 0; i < eventData.steps.length; i++) {
          const step = eventData.steps[i];
          
          // Process step ${i + 1}
          
          try {
            // Prepare step data for update/create
            const stepData = {
              step_order: i + 1,
              description: step.description || '',
              metadata: {}
            };

            // Add Waze link to metadata if provided
            if (step.wazeLink) {
              stepData.metadata.wazeLink = step.wazeLink;
            }

            let updatedStep;
            // Check if step has valid UUID (existing) vs numeric/temporary ID (new)
            const isExistingStep = step.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(step.id);
            
            if (isExistingStep) {
              // Update existing step (has valid UUID from database)
              console.log(`🔄 Updating existing step ${i + 1} with UUID:`, step.id);
              const updateResult = await this.axiosInstance.put(`/steps/${step.id}`, stepData);
              updatedStep = updateResult.data.data;
              stepUpdateResults.updated++;
            } else {
              // Create new step (no ID or temporary numeric ID)
              console.log(`✨ Creating new step ${i + 1} (temp ID: ${step.id})`);
              const createResult = await this.axiosInstance.post(`/events/${eventId}/steps`, stepData);
              updatedStep = createResult.data.data;
              stepUpdateResults.created++;
            }

            // Handle new image upload if provided
            if (step.image && step.image instanceof File) {
              console.log(`📤 Step ${i + 1} uploading new image:`, step.image.name);
              try {
                const imageFormData = new FormData();
                imageFormData.append('stepImage', step.image);
                
                const imageUploadResult = await this.axiosInstance.post(
                  `/steps/${updatedStep.id}/image`, 
                  imageFormData,
                  { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                
                if (imageUploadResult.data.success) {
                  // Update step data with new image info
                  updatedStep = {
                    ...updatedStep,
                    image_url: imageUploadResult.data.data.image_url,
                    image_alt: imageUploadResult.data.data.image_alt
                  };
                  stepUpdateResults.imageUploads.successful++;
                  console.log(`✅ Step ${i + 1} image uploaded successfully`);
                }
              } catch (imageError) {
                stepUpdateResults.imageUploads.failed++;
                stepUpdateResults.errors.push({
                  step: i + 1,
                  type: 'image_upload',
                  error: imageError.message
                });
                console.error(`❌ Step ${i + 1} image upload failed:`, imageError.message);
                // Continue with step update even if image upload fails
              }
            }

            updatedSteps.push(updatedStep);

          } catch (stepError) {
            stepUpdateResults.errors.push({
              step: i + 1,
              type: 'step_update',
              error: stepError.message
            });
            console.error(`❌ Step ${i + 1} update failed:`, stepError.message);
            // Continue with other steps even if one fails
          }
        }
        
        console.log('📊 Step update results:', stepUpdateResults);
        
        // Add step info to final result
        finalEventData.steps = updatedSteps;
        finalEventData.stepUpdateResults = stepUpdateResults;
      } else {
        // Handle case where all steps were deleted (empty steps array)
        console.log('🔄 No steps provided - deleting all existing steps');
        const stepUpdateResults = {
          total: 0,
          updated: 0,
          created: 0,
          deleted: 0,
          imageUploads: { successful: 0, failed: 0 },
          errors: []
        };

        // Get current steps from database and delete them all
        const currentStepsResult = await this.axiosInstance.get(`/events/${eventId}`);
        const currentStepsInDB = currentStepsResult.data.data?.steps || [];
        
        for (const stepToDelete of currentStepsInDB) {
          try {
            await this.axiosInstance.delete(`/steps/${stepToDelete.id}`);
            stepUpdateResults.deleted++;
            console.log(`🗑️ Deleted step ${stepToDelete.step_order} (ID: ${stepToDelete.id})`);
          } catch (deleteError) {
            stepUpdateResults.errors.push({
              step: stepToDelete.step_order,
              type: 'step_deletion',
              error: deleteError.message
            });
            console.error(`❌ Failed to delete step ${stepToDelete.step_order}:`, deleteError.message);
          }
        }

        // Add empty step info to final result
        finalEventData.steps = [];
        finalEventData.stepUpdateResults = stepUpdateResults;
      }

      return {
        success: true,
        data: finalEventData,
        message: 'Guide updated successfully',
        coverImage: coverImageStatus // Include cover image status for updates too
      };

    } catch (error) {
      console.error('Update event with steps error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }
}

export const eventsService = new EventsService();
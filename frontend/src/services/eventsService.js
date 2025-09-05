import { authService } from './authService';

/**
 * Events Service - Handles all event/guide-related API calls
 * Extends the existing auth service axios instance for consistency
 */
class EventsService {
  constructor() {
    // Use the same axios instance as auth service for consistency
    this.axiosInstance = authService.axiosInstance;
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
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.status) params.append('status', options.status);

      const response = await this.axiosInstance.get(`/events?${params.toString()}`);
      
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
   * Get a specific event by ID with all its steps
   * @param {string} eventId - UUID of the event
   * @returns {Promise<Object>} Event details with steps
   */
  async getEvent(eventId) {
    try {
      const response = await this.axiosInstance.get(`/events/${eventId}`);
      
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
   * Create a new event (deprecated - use createEventWithImage instead)
   * @param {Object} eventData - Event data
   * @param {string} eventData.event_name - Name of the event
   * @param {Object} eventData.metadata - Additional metadata
   * @param {string} eventData.expiration_date - ISO date string (optional)
   * @returns {Promise<Object>} Created event data
   */
  async createEvent(eventData) {
    try {
      const response = await this.axiosInstance.post('/events', eventData);
      
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
   * Create a new event with optional image upload
   * @param {Object} eventData - Event data
   * @param {string} eventData.event_name - Name of the event (required)
   * @param {string} eventData.description - Event description (optional)
   * @param {string} eventData.location - Event location (optional)
   * @param {string} eventData.status - Event status: 'draft' or 'published' (default: 'draft')
   * @param {string} eventData.expiration_date - ISO date string (optional)
   * @param {File} eventData.coverImage - Image file for upload (optional)
   * @returns {Promise<Object>} Created event data with success flag
   */
  async createEventWithImage(eventData) {
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add required fields
      if (!eventData.event_name || eventData.event_name.trim() === '') {
        throw new Error('Event name is required');
      }
      formData.append('event_name', eventData.event_name.trim());
      
      // Add optional text fields
      if (eventData.description) {
        formData.append('description', eventData.description.trim());
      }
      
      if (eventData.location) {
        formData.append('location', eventData.location.trim());
      }
      
      if (eventData.status) {
        formData.append('status', eventData.status);
      }
      
      if (eventData.expiration_date) {
        formData.append('expiration_date', eventData.expiration_date);
      }
      
      // Add image file if provided
      if (eventData.coverImage instanceof File) {
        formData.append('coverImage', eventData.coverImage);
      }

      // Make request with FormData (axios will automatically set Content-Type: multipart/form-data)
      const response = await this.axiosInstance.post('/events', formData, {
        headers: {
          // Don't set Content-Type manually - let axios handle it for FormData
        },
        // Optional: track upload progress
        onUploadProgress: eventData.onUploadProgress || undefined
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
        
        if (data.message && data.message.includes('already exists')) {
          throw new Error('An event with this name already exists. Please choose a different name.');
        }
      }
      
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Update an existing event
   * @param {string} eventId - UUID of the event
   * @param {Object} eventData - Updated event data
   * @returns {Promise<Object>} Updated event data
   */
  async updateEvent(eventId, eventData) {
    try {
      const response = await this.axiosInstance.put(`/events/${eventId}`, eventData);
      
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
   * Format event data for display in components
   * @param {Object} event - Raw event data from API
   * @returns {Object} Formatted event data
   */
  formatEventForDisplay(event) {
    return {
      id: event.id,
      name: event.event_name,
      slug: event.slug,
      status: this.mapEventStatus(event.status, event.expiration_date),
      views: event.clicks_count || 0,
      completion_count: event.completion_count || 0,
      created: this.formatDate(event.created_at),
      expires: event.expiration_date ? this.formatDate(event.expiration_date) : null,
      stepsCount: event.steps_count || 0,
      metadata: event.metadata || {}
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
}

export const eventsService = new EventsService();
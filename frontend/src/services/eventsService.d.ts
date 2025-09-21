/**
 * TypeScript declarations for eventsService
 * Provides comprehensive type safety for all event/guide-related API calls
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface EventData {
  id?: string;
  event_id?: string;
  event_name: string;
  description?: string;
  location?: string;
  status: 'draft' | 'published' | 'expired' | 'archived';
  expiration_date?: string;
  expiration_hours?: number;
  created?: string;
  updated_at?: string;
  steps_count?: number;
  steps?: StepData[];
  coverImage?: File | string;
  cover_image_url?: string;
}

export interface StepData {
  id?: string;
  step_order: number;
  description: string;
  image?: File;
  image_url?: string;
  image_alt?: string;
  metadata?: Record<string, any>;
}

export interface EventsListResponse {
  events: EventData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GetEventsOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export interface EventStats {
  totalGuides: number;
  activeGuides: number;
  totalViews: number;
  thisMonth: number;
}

export interface FormattedEventForDisplay {
  id: string;
  event_id?: string;
  eventName: string;
  description?: string;
  location?: string;
  status: string;
  created: string;
  updated: string;
  stepsCount: number;
  hasSteps: boolean;
  statusColor: string;
  statusLabel: string;
  createdFormatted: string;
  updatedFormatted: string;
  isExpired: boolean;
  daysUntilExpiration?: number;
}

export interface ImageUploadResults {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    stepIndex: number;
    error: string;
  }>;
}

declare class EventsService {
  /**
   * Get events for the authenticated user
   */
  getEvents(options?: GetEventsOptions): Promise<ApiResponse<EventsListResponse>>;

  /**
   * Get a specific event by ID with all its steps
   */
  getEvent(eventId: string): Promise<ApiResponse<EventData>>;

  /**
   * Create a new event (text-only, reliable for both draft and published)
   */
  createEventTextOnly(eventData: Partial<EventData>): Promise<ApiResponse<EventData>>;

  /**
   * Update an existing event
   */
  updateEvent(eventId: string, eventData: Partial<EventData>): Promise<ApiResponse<EventData>>;

  /**
   * Update cover image for an existing event
   */
  updateEventCoverImage(eventId: string, imageFile: File): Promise<ApiResponse<EventData>>;

  /**
   * Delete an event
   */
  deleteEvent(eventId: string): Promise<ApiResponse<any>>;

  /**
   * Create a step for an event
   */
  createStep(eventId: string, stepData: Partial<StepData>): Promise<ApiResponse<StepData>>;

  /**
   * Update step image
   */
  updateStepImage(eventId: string, stepId: string, imageFile: File): Promise<ApiResponse<StepData>>;

  /**
   * Delete a step
   */
  deleteStep(eventId: string, stepId: string): Promise<ApiResponse<any>>;

  /**
   * Create event with steps (comprehensive two-phase approach)
   */
  createEventWithSteps(eventData: Partial<EventData>): Promise<ApiResponse<{
    event: EventData;
    steps: StepData[];
    imageUploadResults: ImageUploadResults;
  }>>;

  /**
   * Format event data for display with consistent UI-friendly structure
   */
  formatEventForDisplay(event: EventData): FormattedEventForDisplay;

  /**
   * Calculate statistics from events data
   */
  calculateStats(events: EventData[]): EventStats;

  /**
   * Extract error message from various error formats
   */
  getErrorMessage(error: any): string;
}

export declare const eventsService: EventsService;
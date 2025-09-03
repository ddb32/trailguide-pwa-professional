# Analytics Specification - TrailGuide PWA MVP

## 1. Executive Summary

This document defines a comprehensive analytics system for TrailGuide PWA that enables real-time user behavior tracking, conversion analysis, and data-driven decision making from MVP launch. The analytics architecture is designed to be privacy-compliant, performant, and actionable for organizers.

### Key Objectives
- **User Behavior Validation**: Track complete user journey from link click to completion
- **Concept Validation**: Measure engagement, completion rates, and user satisfaction
- **Product Optimization**: Identify drop-off points and optimization opportunities
- **Organizer Value**: Provide actionable insights through intuitive dashboards

### Success Metrics Target
- **Data Collection**: 99.9% event capture rate with <50ms tracking overhead
- **Real-time Processing**: Analytics available within 5 minutes of user interaction
- **Dashboard Performance**: <2 second load times for analytics views
- **Privacy Compliance**: 100% GDPR/CCPA compliant data handling

## 2. Event Tracking Requirements

### 2.1 Core User Journey Events

#### Link Access Events
```typescript
interface LinkAccessEvent {
  event_type: 'link_access';
  timestamp: string;           // ISO 8601 format
  event_id: string;           // UUID of the guidance event
  visitor_id: string;         // Anonymous visitor identifier
  session_id: string;         // Session identifier
  referrer: string | null;    // Source of the link click
  user_agent: string;         // Browser/device information
  ip_address: string;         // For geolocation (anonymized)
  utm_parameters?: {          // Marketing attribution
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
}
```

**Tracking Triggers:**
- User clicks shared guidance link (SMS, WhatsApp, QR code, etc.)
- Direct URL access in browser
- PWA launch from home screen icon

#### Navigation Start Events
```typescript
interface NavigationStartEvent {
  event_type: 'navigation_start';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  total_steps: number;        // Total steps in guidance
  estimated_duration: number | null; // Estimated completion time (seconds)
}
```

**Tracking Triggers:**
- User clicks "Start Navigation" button
- User restarts completed guidance flow

#### Step Progression Events
```typescript
interface StepProgressionEvent {
  event_type: 'step_progression';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  step_order: number;         // Current step number (1-based)
  step_id: string;           // UUID of current step
  previous_step_order: number | null; // Previous step (null for first step)
  time_on_previous_step: number | null; // Time spent on previous step (seconds)
  navigation_method: 'next_button' | 'previous_button' | 'swipe_right' | 'swipe_left' | 'keyboard' | 'voice';
}
```

**Tracking Triggers:**
- User advances to next step
- User returns to previous step
- User jumps to specific step (future feature)

#### Step Interaction Events
```typescript
interface StepInteractionEvent {
  event_type: 'step_interaction';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  step_order: number;
  step_id: string;
  interaction_type: 'image_zoom' | 'image_tap' | 'text_select' | 'share_step' | 'help_request';
  interaction_duration: number; // Duration of interaction (seconds)
  interaction_data?: any;     // Additional context data
}
```

**Tracking Triggers:**
- User zooms/taps step image
- User highlights step text
- User shares individual step
- User requests help/support

#### Completion Events
```typescript
interface CompletionEvent {
  event_type: 'guidance_completion';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  total_duration: number;     // Total time from start to completion (seconds)
  steps_completed: number;    // Number of steps actually visited
  completion_method: 'sequential' | 'partial' | 'restart';
  user_rating?: number;       // Optional 1-5 star rating
  feedback_text?: string;     // Optional user feedback
}
```

**Tracking Triggers:**
- User reaches final step
- User completes guidance flow
- User provides feedback/rating

#### Drop-off Events
```typescript
interface DropoffEvent {
  event_type: 'session_dropout';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  last_step_order: number;    // Last step user was on
  last_step_id: string;
  time_on_last_step: number;  // Time spent on final step (seconds)
  total_session_duration: number; // Total session time (seconds)
  dropout_reason: 'page_close' | 'navigation_away' | 'timeout' | 'error' | 'unknown';
}
```

**Tracking Triggers:**
- User closes browser/tab
- User navigates away from guidance
- Session timeout (30 minutes inactivity)
- JavaScript errors that break experience

### 2.2 Technical Performance Events

#### Performance Monitoring
```typescript
interface PerformanceEvent {
  event_type: 'performance_metric';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  metric_type: 'page_load' | 'image_load' | 'api_response' | 'interaction_delay';
  duration: number;           // Time in milliseconds
  resource_url?: string;      // For image loads and API calls
  error_message?: string;     // If metric indicates an error
}
```

#### Error Tracking
```typescript
interface ErrorEvent {
  event_type: 'error';
  timestamp: string;
  event_id: string;
  visitor_id: string;
  session_id: string;
  error_type: 'javascript_error' | 'network_error' | 'image_load_error' | 'api_error';
  error_message: string;
  error_stack?: string;
  step_context?: number;      // Step where error occurred
  user_agent: string;
  url: string;
}
```

## 3. Database Schema Design

### 3.1 Analytics Tables

#### Events Table (Primary Analytics Storage)
```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Event Context
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL,
    session_id UUID NOT NULL,
    
    -- Step Context (nullable for non-step events)
    step_order INTEGER,
    step_id UUID REFERENCES steps(id) ON DELETE SET NULL,
    previous_step_order INTEGER,
    
    -- Timing Data
    duration_seconds INTEGER,
    time_on_previous_step INTEGER,
    total_session_duration INTEGER,
    
    -- Interaction Data
    interaction_type VARCHAR(50),
    navigation_method VARCHAR(50),
    
    -- Technical Context
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    
    -- Additional Data (JSON for flexibility)
    metadata JSONB DEFAULT '{}',
    
    -- Performance Optimization
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_events_event_timestamp ON analytics_events(event_id, timestamp DESC);
CREATE INDEX idx_analytics_events_visitor_session ON analytics_events(visitor_id, session_id);
CREATE INDEX idx_analytics_events_type_timestamp ON analytics_events(event_type, timestamp DESC);
CREATE INDEX idx_analytics_events_step_progression ON analytics_events(event_id, step_order) 
    WHERE event_type = 'step_progression';

-- Partitioning for large datasets (optional for MVP)
-- CREATE TABLE analytics_events_202401 PARTITION OF analytics_events 
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### Sessions Table (Session Aggregation)
```sql
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id UUID NOT NULL,
    session_id UUID UNIQUE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    
    -- Session Timing
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    total_duration INTEGER, -- seconds
    
    -- Progress Tracking
    steps_visited INTEGER DEFAULT 0,
    max_step_reached INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    
    -- Technical Context
    user_agent TEXT,
    ip_address INET,
    referrer TEXT,
    
    -- Geographic Data (optional)
    country_code CHAR(2),
    city VARCHAR(100),
    
    -- Completion Data
    completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_sessions_event_started ON analytics_sessions(event_id, started_at DESC);
CREATE INDEX idx_analytics_sessions_visitor ON analytics_sessions(visitor_id, started_at DESC);
CREATE INDEX idx_analytics_sessions_completed ON analytics_sessions(event_id, completed, started_at DESC);
```

#### Daily Aggregates Table (Reporting Optimization)
```sql
CREATE TABLE analytics_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Traffic Metrics
    total_visitors INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    
    -- Engagement Metrics
    avg_session_duration DECIMAL(10,2),
    completion_rate DECIMAL(5,4), -- percentage as decimal (0.8756 = 87.56%)
    bounce_rate DECIMAL(5,4),
    
    -- Step Analytics
    avg_steps_completed DECIMAL(5,2),
    most_common_dropout_step INTEGER,
    
    -- Performance Metrics
    avg_page_load_time INTEGER, -- milliseconds
    error_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, date)
);

CREATE INDEX idx_analytics_daily_event_date ON analytics_daily_summary(event_id, date DESC);
```

### 3.2 Data Aggregation Functions

#### Real-time Analytics Function
```sql
CREATE OR REPLACE FUNCTION get_event_analytics_realtime(
    p_event_id UUID,
    p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
    total_visitors BIGINT,
    unique_visitors BIGINT,
    completion_rate DECIMAL,
    avg_duration DECIMAL,
    current_active_sessions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH session_stats AS (
        SELECT 
            COUNT(*) as total_sessions,
            COUNT(DISTINCT visitor_id) as unique_sessions,
            COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
            AVG(total_duration) as avg_session_duration,
            COUNT(*) FILTER (WHERE ended_at IS NULL AND started_at > NOW() - INTERVAL '30 minutes') as active_sessions
        FROM analytics_sessions 
        WHERE event_id = p_event_id 
            AND started_at > NOW() - INTERVAL '1 hour' * p_hours
    )
    SELECT 
        s.total_sessions::BIGINT,
        s.unique_sessions::BIGINT,
        CASE 
            WHEN s.total_sessions > 0 THEN ROUND(s.completed_sessions::DECIMAL / s.total_sessions, 4)
            ELSE 0::DECIMAL
        END,
        ROUND(s.avg_session_duration::DECIMAL, 1),
        s.active_sessions::BIGINT
    FROM session_stats s;
END;
$$ LANGUAGE plpgsql;
```

#### Funnel Analysis Function
```sql
CREATE OR REPLACE FUNCTION get_step_funnel_analysis(
    p_event_id UUID,
    p_days INTEGER DEFAULT 7
) RETURNS TABLE (
    step_order INTEGER,
    visitors_reached BIGINT,
    dropout_count BIGINT,
    dropout_rate DECIMAL,
    avg_time_on_step DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH step_visitors AS (
        SELECT 
            ae.step_order,
            COUNT(DISTINCT ae.visitor_id) as reached_count,
            AVG(ae.duration_seconds) as avg_duration
        FROM analytics_events ae
        WHERE ae.event_id = p_event_id
            AND ae.event_type = 'step_progression'
            AND ae.timestamp > NOW() - INTERVAL '1 day' * p_days
        GROUP BY ae.step_order
    ),
    step_dropouts AS (
        SELECT 
            ae.last_step_order as step_order,
            COUNT(DISTINCT ae.visitor_id) as dropout_count
        FROM analytics_events ae
        WHERE ae.event_id = p_event_id
            AND ae.event_type = 'session_dropout'
            AND ae.timestamp > NOW() - INTERVAL '1 day' * p_days
        GROUP BY ae.last_step_order
    )
    SELECT 
        sv.step_order,
        sv.reached_count,
        COALESCE(sd.dropout_count, 0),
        CASE 
            WHEN sv.reached_count > 0 THEN ROUND(COALESCE(sd.dropout_count, 0)::DECIMAL / sv.reached_count, 4)
            ELSE 0::DECIMAL
        END,
        ROUND(sv.avg_duration::DECIMAL, 1)
    FROM step_visitors sv
    LEFT JOIN step_dropouts sd ON sv.step_order = sd.step_order
    ORDER BY sv.step_order;
END;
$$ LANGUAGE plpgsql;
```

## 4. API Endpoints Specification

### 4.1 Event Tracking Endpoints

#### Track Event (Primary Tracking Endpoint)
**POST** `/api/v1/analytics/track`

**Request Body:**
```json
{
  "events": [
    {
      "event_type": "step_progression",
      "timestamp": "2024-01-15T14:30:00Z",
      "event_id": "550e8400-e29b-41d4-a716-446655440000",
      "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
      "session_id": "987fcdeb-51a2-43d1-9f4c-123456789000",
      "step_order": 3,
      "step_id": "step-uuid-here",
      "previous_step_order": 2,
      "time_on_previous_step": 45,
      "navigation_method": "next_button"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "events_processed": 1,
  "timestamp": "2024-01-15T14:30:01Z"
}
```

**Batch Processing Support:**
- Accept up to 50 events per request
- Process events asynchronously for performance
- Return immediate acknowledgment to client

#### Track Performance (Performance Metrics)
**POST** `/api/v1/analytics/performance`

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
  "session_id": "987fcdeb-51a2-43d1-9f4c-123456789000",
  "metrics": [
    {
      "metric_type": "page_load",
      "duration": 2340,
      "timestamp": "2024-01-15T14:30:00Z"
    },
    {
      "metric_type": "image_load",
      "duration": 890,
      "resource_url": "https://cdn.trailguide.app/images/step3.jpg",
      "timestamp": "2024-01-15T14:30:02Z"
    }
  ]
}
```

#### Track Error (Error Monitoring)
**POST** `/api/v1/analytics/error`

**Request Body:**
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "visitor_id": "123e4567-e89b-12d3-a456-426614174000",
  "session_id": "987fcdeb-51a2-43d1-9f4c-123456789000",
  "error_type": "javascript_error",
  "error_message": "Cannot read property 'src' of null",
  "error_stack": "TypeError: Cannot read property...",
  "step_context": 3,
  "user_agent": "Mozilla/5.0...",
  "url": "https://guide.trailguide.app/e/550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### 4.2 Analytics Retrieval Endpoints (Organizer Dashboard)

#### Get Event Analytics Overview
**GET** `/api/v1/events/:eventId/analytics`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `period`: `24h` | `7d` | `30d` | `custom` (default: `7d`)
- `start_date`: ISO 8601 date (for custom period)
- `end_date`: ISO 8601 date (for custom period)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_visitors": 342,
      "unique_visitors": 298,
      "completion_rate": 0.7456,
      "average_duration": 287,
      "bounce_rate": 0.1234,
      "current_active_sessions": 5
    },
    "daily_breakdown": [
      {
        "date": "2024-01-15",
        "visitors": 45,
        "completions": 34,
        "avg_duration": 301
      }
    ],
    "step_funnel": [
      {
        "step_order": 1,
        "visitors_reached": 342,
        "dropout_count": 23,
        "dropout_rate": 0.0672,
        "avg_time_on_step": 42.3
      }
    ],
    "performance_summary": {
      "avg_page_load_time": 2340,
      "avg_image_load_time": 890,
      "error_rate": 0.0034
    }
  },
  "period": {
    "start": "2024-01-08T00:00:00Z",
    "end": "2024-01-15T23:59:59Z",
    "duration_days": 7
  }
}
```

#### Get Detailed Step Analytics
**GET** `/api/v1/events/:eventId/analytics/steps`

**Headers:** `Authorization: Bearer <access_token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "steps": [
      {
        "step_order": 1,
        "step_id": "step-1-uuid",
        "title": "Enter through main gate",
        "analytics": {
          "total_visitors": 342,
          "unique_visitors": 298,
          "avg_time_spent": 42.3,
          "dropout_rate": 0.0672,
          "interactions": {
            "image_zooms": 45,
            "help_requests": 3
          }
        }
      }
    ]
  }
}
```

#### Export Analytics Data
**GET** `/api/v1/events/:eventId/analytics/export`

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `format`: `csv` | `json` (default: `csv`)
- `period`: `24h` | `7d` | `30d` | `custom`
- `include`: comma-separated list of data types (`sessions`, `events`, `performance`, `errors`)

**Success Response (200):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="event-analytics-2024-01-15.csv"

timestamp,visitor_id,event_type,step_order,duration_seconds
2024-01-15T14:30:00Z,123e4567-e89b-12d3-a456-426614174000,link_access,,
2024-01-15T14:30:05Z,123e4567-e89b-12d3-a456-426614174000,navigation_start,,
2024-01-15T14:30:10Z,123e4567-e89b-12d3-a456-426614174000,step_progression,1,5
...
```

### 4.3 Real-time Analytics (WebSocket - Optional MVP)

#### WebSocket Connection for Live Analytics
**WS** `/api/v1/events/:eventId/analytics/live`

**Authentication:** JWT token via query parameter or header

**Real-time Event Types:**
```typescript
// New visitor started guidance
{
  "type": "visitor_started",
  "data": {
    "visitor_id": "uuid",
    "timestamp": "2024-01-15T14:30:00Z",
    "total_active_sessions": 6
  }
}

// Visitor completed guidance
{
  "type": "visitor_completed",
  "data": {
    "visitor_id": "uuid",
    "duration": 287,
    "rating": 5,
    "timestamp": "2024-01-15T14:34:47Z"
  }
}

// Visitor dropped off
{
  "type": "visitor_dropout",
  "data": {
    "visitor_id": "uuid",
    "last_step": 4,
    "duration": 156,
    "timestamp": "2024-01-15T14:32:36Z"
  }
}
```

## 5. Implementation Details

### 5.1 Client-Side Tracking (Frontend)

#### Analytics SDK Implementation
```typescript
// services/analytics.ts
class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private visitorId: string;
  private flushInterval: NodeJS.Timer;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.visitorId = this.getOrCreateVisitorId();
    this.initializePeriodicFlush();
  }

  // Track user events
  track(eventType: string, data: any) {
    const event: AnalyticsEvent = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      event_id: this.getCurrentEventId(),
      visitor_id: this.visitorId,
      session_id: this.sessionId,
      ...data
    };

    this.eventQueue.push(event);
    
    // Immediate flush for critical events
    if (this.isCriticalEvent(eventType)) {
      this.flush();
    }
  }

  // Batch send events to server
  private async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch('/api/v1/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Auto-flush every 10 seconds
  private initializePeriodicFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000);
  }

  // Track page visibility changes (for dropout detection)
  private initializeVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.track('page_hidden', {
          last_step_order: this.getCurrentStepOrder(),
          time_on_step: this.getTimeOnCurrentStep()
        });
        this.flush(); // Immediate flush before page closes
      }
    });
  }
}

// React Hook for Analytics
export const useAnalytics = () => {
  const analytics = useContext(AnalyticsContext);
  
  const trackStepProgression = (stepOrder: number, navigationMethod: string) => {
    analytics.track('step_progression', {
      step_order: stepOrder,
      navigation_method: navigationMethod,
      time_on_previous_step: analytics.getTimeOnPreviousStep()
    });
  };

  const trackStepInteraction = (stepOrder: number, interactionType: string) => {
    analytics.track('step_interaction', {
      step_order: stepOrder,
      interaction_type: interactionType
    });
  };

  const trackCompletion = (rating?: number, feedback?: string) => {
    analytics.track('guidance_completion', {
      total_duration: analytics.getTotalSessionDuration(),
      steps_completed: analytics.getStepsCompleted(),
      user_rating: rating,
      feedback_text: feedback
    });
  };

  return {
    trackStepProgression,
    trackStepInteraction,
    trackCompletion
  };
};
```

#### Performance Monitoring Integration
```typescript
// Performance tracking using Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceTracker {
  constructor(private analytics: AnalyticsService) {
    this.initializeWebVitals();
    this.initializeResourceTiming();
  }

  private initializeWebVitals() {
    getCLS((metric) => this.analytics.trackPerformance('cls', metric.value));
    getFID((metric) => this.analytics.trackPerformance('fid', metric.value));
    getFCP((metric) => this.analytics.trackPerformance('fcp', metric.value));
    getLCP((metric) => this.analytics.trackPerformance('lcp', metric.value));
    getTTFB((metric) => this.analytics.trackPerformance('ttfb', metric.value));
  }

  private initializeResourceTiming() {
    // Track image load times
    const imageObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.initiatorType === 'img') {
          this.analytics.trackPerformance('image_load', entry.duration, entry.name);
        }
      });
    });
    
    imageObserver.observe({ entryTypes: ['resource'] });
  }
}
```

### 5.2 Server-Side Processing

#### Event Processing Pipeline
```typescript
// controllers/analyticsController.ts
export class AnalyticsController {
  async trackEvents(req: Request, res: Response) {
    try {
      const { events } = req.body;
      
      // Validate events
      const validatedEvents = events.map(event => this.validateEvent(event));
      
      // Process events asynchronously
      this.processEventsAsync(validatedEvents);
      
      // Return immediate response
      res.json({
        success: true,
        events_processed: validatedEvents.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid event data'
      });
    }
  }

  private async processEventsAsync(events: AnalyticsEvent[]) {
    // Batch insert events
    await this.batchInsertEvents(events);
    
    // Update session data
    await this.updateSessionData(events);
    
    // Trigger real-time updates (if WebSocket enabled)
    this.broadcastRealTimeUpdates(events);
  }

  private async batchInsertEvents(events: AnalyticsEvent[]) {
    const query = `
      INSERT INTO analytics_events (
        event_type, timestamp, event_id, visitor_id, session_id,
        step_order, step_id, duration_seconds, interaction_type,
        navigation_method, metadata
      ) VALUES %L
    `;
    
    const values = events.map(event => [
      event.event_type,
      event.timestamp,
      event.event_id,
      event.visitor_id,
      event.session_id,
      event.step_order || null,
      event.step_id || null,
      event.duration_seconds || null,
      event.interaction_type || null,
      event.navigation_method || null,
      JSON.stringify(event.metadata || {})
    ]);

    await db.query(format(query, values));
  }
}
```

#### Background Job Processing
```typescript
// jobs/analyticsAggregation.ts
export class AnalyticsAggregationJob {
  // Run daily at midnight
  @Cron('0 0 * * *')
  async generateDailySummaries() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await this.aggregateDailyData(yesterday);
  }

  private async aggregateDailyData(date: Date) {
    const query = `
      INSERT INTO analytics_daily_summary (
        event_id, date, total_visitors, unique_visitors,
        avg_session_duration, completion_rate, bounce_rate
      )
      SELECT 
        s.event_id,
        DATE($1) as date,
        COUNT(*) as total_visitors,
        COUNT(DISTINCT s.visitor_id) as unique_visitors,
        AVG(s.total_duration) as avg_session_duration,
        COUNT(*) FILTER (WHERE s.completed = true)::DECIMAL / COUNT(*) as completion_rate,
        COUNT(*) FILTER (WHERE s.max_step_reached = 1)::DECIMAL / COUNT(*) as bounce_rate
      FROM analytics_sessions s
      WHERE DATE(s.started_at) = DATE($1)
      GROUP BY s.event_id
      ON CONFLICT (event_id, date) DO UPDATE SET
        total_visitors = EXCLUDED.total_visitors,
        unique_visitors = EXCLUDED.unique_visitors,
        avg_session_duration = EXCLUDED.avg_session_duration,
        completion_rate = EXCLUDED.completion_rate,
        bounce_rate = EXCLUDED.bounce_rate,
        updated_at = NOW()
    `;
    
    await db.query(query, [date]);
  }
}
```

## 6. Organizer Dashboard Implementation

### 6.1 Analytics Dashboard Components

#### Dashboard Layout
```typescript
// components/organizer/AnalyticsDashboard.tsx
export const AnalyticsDashboard: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { data: analytics, loading } = useEventAnalytics(eventId, '7d');
  
  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="analytics-dashboard">
      {/* Key Metrics Overview */}
      <MetricsGrid metrics={analytics.overview} />
      
      {/* Conversion Funnel */}
      <FunnelChart data={analytics.step_funnel} />
      
      {/* Time Series Chart */}
      <TimeSeriesChart data={analytics.daily_breakdown} />
      
      {/* Step Performance Table */}
      <StepPerformanceTable steps={analytics.step_details} />
      
      {/* Export Controls */}
      <ExportControls eventId={eventId} />
    </div>
  );
};
```

#### Key Metrics Grid
```typescript
// components/organizer/MetricsGrid.tsx
export const MetricsGrid: React.FC<{ metrics: AnalyticsOverview }> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <MetricCard
        title="Total Visitors"
        value={metrics.total_visitors}
        change="+12%"
        changeType="positive"
        icon="👥"
      />
      
      <MetricCard
        title="Completion Rate"
        value={`${(metrics.completion_rate * 100).toFixed(1)}%`}
        change="+3.2%"
        changeType="positive"
        icon="✅"
      />
      
      <MetricCard
        title="Avg. Duration"
        value={formatDuration(metrics.average_duration)}
        change="-15s"
        changeType="positive"
        icon="⏱️"
      />
      
      <MetricCard
        title="Active Now"
        value={metrics.current_active_sessions}
        isLive={true}
        icon="🔴"
      />
    </div>
  );
};
```

#### Conversion Funnel Visualization
```typescript
// components/organizer/FunnelChart.tsx
import { ResponsiveFunnel } from '@nivo/funnel';

export const FunnelChart: React.FC<{ data: StepFunnel[] }> = ({ data }) => {
  const funnelData = data.map((step, index) => ({
    id: `Step ${step.step_order}`,
    value: step.visitors_reached,
    label: `Step ${step.step_order}: ${step.visitors_reached} visitors`
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Navigation Funnel</h3>
      <div style={{ height: '400px' }}>
        <ResponsiveFunnel
          data={funnelData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          valueFormat=" >-.0f"
          colors={{ scheme: 'spectral' }}
          borderWidth={20}
          labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
          beforeSeparatorLength={100}
          beforeSeparatorOffset={20}
          afterSeparatorLength={100}
          afterSeparatorOffset={20}
        />
      </div>
    </div>
  );
};
```

### 6.2 Export Functionality

#### CSV Export Implementation
```typescript
// services/exportService.ts
export class ExportService {
  async exportEventAnalytics(
    eventId: string,
    format: 'csv' | 'json',
    options: ExportOptions
  ): Promise<Blob> {
    const data = await this.getAnalyticsData(eventId, options);
    
    if (format === 'csv') {
      return this.generateCSV(data);
    } else {
      return this.generateJSON(data);
    }
  }

  private generateCSV(data: AnalyticsExportData): Blob {
    const headers = [
      'Timestamp',
      'Visitor ID',
      'Event Type',
      'Step Order',
      'Duration (seconds)',
      'Navigation Method',
      'User Agent'
    ];
    
    const rows = data.events.map(event => [
      event.timestamp,
      event.visitor_id,
      event.event_type,
      event.step_order || '',
      event.duration_seconds || '',
      event.navigation_method || '',
      event.user_agent || ''
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return new Blob([csv], { type: 'text/csv' });
  }
}

// React Hook for Export
export const useAnalyticsExport = () => {
  const [exporting, setExporting] = useState(false);
  
  const exportData = async (
    eventId: string, 
    format: 'csv' | 'json',
    options: ExportOptions
  ) => {
    setExporting(true);
    
    try {
      const blob = await exportService.exportEventAnalytics(eventId, format, options);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${eventId}-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };
  
  return { exportData, exporting };
};
```

## 7. Privacy & Compliance

### 7.1 GDPR Compliance

#### Data Minimization
- Collect only necessary data for product functionality
- Anonymous visitor IDs (no personal information)
- IP address hashing for geolocation without storing raw IPs
- Optional data collection with clear opt-out mechanisms

#### User Rights Implementation
```typescript
// services/privacyService.ts
export class PrivacyService {
  // Right to Access
  async getVisitorData(visitorId: string): Promise<VisitorDataExport> {
    const events = await db.query(
      'SELECT * FROM analytics_events WHERE visitor_id = $1',
      [visitorId]
    );
    
    const sessions = await db.query(
      'SELECT * FROM analytics_sessions WHERE visitor_id = $1',
      [visitorId]
    );
    
    return {
      visitor_id: visitorId,
      events: events.rows,
      sessions: sessions.rows,
      exported_at: new Date().toISOString()
    };
  }
  
  // Right to Deletion
  async deleteVisitorData(visitorId: string): Promise<void> {
    await db.transaction(async (trx) => {
      await trx.query('DELETE FROM analytics_events WHERE visitor_id = $1', [visitorId]);
      await trx.query('DELETE FROM analytics_sessions WHERE visitor_id = $1', [visitorId]);
    });
  }
  
  // Data Retention Policy
  async cleanupExpiredData(): Promise<void> {
    // Delete events older than 2 years
    await db.query(
      'DELETE FROM analytics_events WHERE timestamp < NOW() - INTERVAL \'2 years\''
    );
  }
}
```

#### Cookie Policy Implementation
```typescript
// components/CookieConsent.tsx
export const CookieConsent: React.FC = () => {
  const [consent, setConsent] = useLocalStorage('analytics-consent', null);
  
  if (consent !== null) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex-1 mr-4">
          <p className="text-sm">
            We use anonymous analytics to improve your navigation experience. 
            No personal data is collected.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setConsent('accepted');
              initializeAnalytics();
            }}
            className="bg-blue-600 px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Accept
          </button>
          <button
            onClick={() => setConsent('declined')}
            className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-700"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};
```

## 8. External Analytics Integration

### 8.1 Google Analytics 4 Integration

#### GA4 Configuration
```typescript
// services/ga4Service.ts
import { gtag } from 'gtagjs';

export class GA4Service {
  private initialized = false;
  
  initialize(measurementId: string) {
    if (this.initialized) return;
    
    // Load GA4 script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);
    
    // Initialize gtag
    window.gtag = window.gtag || function() {
      (window.gtag.q = window.gtag.q || []).push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false, // We'll send custom events
      anonymize_ip: true
    });
    
    this.initialized = true;
  }
  
  trackEvent(eventName: string, parameters: any) {
    if (!this.initialized) return;
    
    window.gtag('event', eventName, {
      custom_parameter_1: parameters.step_order,
      custom_parameter_2: parameters.event_id,
      ...parameters
    });
  }
  
  trackNavigation(eventId: string, stepOrder: number) {
    this.trackEvent('navigation_step', {
      event_category: 'Navigation',
      event_label: `Step ${stepOrder}`,
      custom_dimension_1: eventId,
      custom_metric_1: stepOrder
    });
  }
  
  trackCompletion(eventId: string, duration: number) {
    this.trackEvent('navigation_completion', {
      event_category: 'Navigation',
      event_label: 'Completed',
      custom_dimension_1: eventId,
      custom_metric_1: duration
    });
  }
}
```

### 8.2 Plausible Analytics Integration

#### Plausible Implementation
```typescript
// services/plausibleService.ts
export class PlausibleService {
  private domain: string;
  
  constructor(domain: string) {
    this.domain = domain;
    this.loadScript();
  }
  
  private loadScript() {
    const script = document.createElement('script');
    script.src = 'https://plausible.io/js/script.js';
    script.setAttribute('data-domain', this.domain);
    script.defer = true;
    document.head.appendChild(script);
  }
  
  trackEvent(eventName: string, props?: Record<string, string | number>) {
    if (window.plausible) {
      window.plausible(eventName, { props });
    }
  }
  
  trackStepProgression(eventId: string, stepOrder: number) {
    this.trackEvent('Step Progression', {
      'Event ID': eventId,
      'Step': stepOrder
    });
  }
  
  trackCompletion(eventId: string, duration: number) {
    this.trackEvent('Navigation Completed', {
      'Event ID': eventId,
      'Duration': Math.round(duration)
    });
  }
}
```

## 9. Testing Strategy

### 9.1 Analytics Testing Framework

#### Unit Tests for Analytics Service
```typescript
// __tests__/analytics.test.ts
describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue(new Response('{"success": true}'));
    global.fetch = mockFetch;
    analyticsService = new AnalyticsService();
  });
  
  it('should queue events and flush them', async () => {
    analyticsService.track('step_progression', {
      step_order: 1,
      navigation_method: 'next_button'
    });
    
    await analyticsService.flush();
    
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('step_progression')
    });
  });
  
  it('should handle flush failures gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    
    analyticsService.track('test_event', {});
    await analyticsService.flush();
    
    // Event should be re-queued
    expect(analyticsService.eventQueue).toHaveLength(1);
  });
});
```

#### Integration Tests for API Endpoints
```typescript
// __tests__/analyticsApi.test.ts
describe('Analytics API', () => {
  let app: Application;
  let db: Database;
  
  beforeAll(async () => {
    app = createTestApp();
    db = await createTestDatabase();
  });
  
  it('should accept and process analytics events', async () => {
    const response = await request(app)
      .post('/api/v1/analytics/track')
      .send({
        events: [{
          event_type: 'step_progression',
          event_id: 'test-event-id',
          visitor_id: 'test-visitor-id',
          session_id: 'test-session-id',
          step_order: 1
        }]
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify event was stored
    const events = await db.query(
      'SELECT * FROM analytics_events WHERE visitor_id = $1',
      ['test-visitor-id']
    );
    expect(events.rows).toHaveLength(1);
  });
});
```

### 9.2 Analytics Validation Testing

#### End-to-End Analytics Testing
```typescript
// e2e/analytics.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Analytics Tracking', () => {
  test('should track complete user journey', async ({ page }) => {
    // Start analytics interceptor
    const analyticsRequests: any[] = [];
    await page.route('**/analytics/track', (route, request) => {
      analyticsRequests.push(JSON.parse(request.postData() || '{}'));
      route.continue();
    });
    
    // Navigate through guidance flow
    await page.goto('/guidance/test-event-id');
    await page.click('button:has-text("Start Navigation")');
    
    // Go through steps
    for (let step = 1; step <= 3; step++) {
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(1000);
    }
    
    await page.click('button:has-text("Complete")');
    
    // Verify analytics events were sent
    expect(analyticsRequests).toContainEqual(
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ event_type: 'link_access' }),
          expect.objectContaining({ event_type: 'navigation_start' }),
          expect.objectContaining({ event_type: 'step_progression' }),
          expect.objectContaining({ event_type: 'guidance_completion' })
        ])
      })
    );
  });
});
```

## 10. Performance Monitoring

### 10.1 Analytics System Performance

#### Metrics to Monitor
- **Event Processing Rate**: Events processed per second
- **Queue Length**: Number of events waiting for processing
- **Database Performance**: Query execution times for analytics queries
- **API Response Times**: Time to acknowledge event tracking requests
- **Storage Growth**: Database size growth rate

#### Performance Optimization
```typescript
// services/analyticsPerformance.ts
export class AnalyticsPerformanceMonitor {
  private metrics = new Map<string, number>();
  
  trackEventProcessingTime(startTime: number) {
    const processingTime = Date.now() - startTime;
    this.updateMetric('event_processing_time', processingTime);
  }
  
  trackQueueLength(length: number) {
    this.updateMetric('queue_length', length);
  }
  
  private updateMetric(name: string, value: number) {
    // Update running average
    const currentAvg = this.metrics.get(name) || 0;
    const newAvg = (currentAvg * 0.9) + (value * 0.1);
    this.metrics.set(name, newAvg);
    
    // Send to monitoring system
    if (name === 'queue_length' && value > 1000) {
      this.alertHighQueueLength(value);
    }
  }
  
  private alertHighQueueLength(length: number) {
    // Send alert to monitoring system
    console.warn(`High analytics queue length: ${length}`);
  }
}
```

This comprehensive analytics specification ensures that TrailGuide PWA will have robust, privacy-compliant analytics capabilities from day one, enabling effective MVP validation and data-driven product decisions.
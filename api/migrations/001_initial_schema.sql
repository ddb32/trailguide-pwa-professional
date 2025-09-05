-- =============================================================================
-- TrailGuide PWA - Initial Database Schema Migration
-- Version: 001
-- Description: Create core tables for users, events, steps, and analytics
-- =============================================================================

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE event_status AS ENUM ('draft', 'published', 'expired', 'archived');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users Table - Organizer authentication and profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL 
        CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$'),
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE 
        CONSTRAINT email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Event organizers with authentication credentials';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password with salt rounds >=12';
COMMENT ON COLUMN users.is_active IS 'Account status - false for suspended accounts';

-- Events Table - Core navigation guidance events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    status event_status DEFAULT 'draft',
    expiration_date TIMESTAMP WITH TIME ZONE,
    clicks_count INTEGER DEFAULT 0 
        CONSTRAINT clicks_non_negative CHECK (clicks_count >= 0),
    unique_visitors_count INTEGER DEFAULT 0
        CONSTRAINT unique_visitors_non_negative CHECK (unique_visitors_count >= 0),
    completion_count INTEGER DEFAULT 0
        CONSTRAINT completion_non_negative CHECK (completion_count >= 0),
    metadata JSONB DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_expiration CHECK (
        expiration_date IS NULL OR expiration_date > created_at
    ),
    CONSTRAINT slug_format CHECK (
        slug IS NULL OR slug ~ '^[a-z0-9-]+$'
    )
);

COMMENT ON TABLE events IS 'Navigation guidance events created by organizers';
COMMENT ON COLUMN events.slug IS 'URL-friendly identifier for public access';
COMMENT ON COLUMN events.metadata IS 'Flexible JSON storage for event details (description, location, etc.)';
COMMENT ON COLUMN events.is_featured IS 'Admin flag for promotional events';

-- Metadata JSON schema validation
ALTER TABLE events ADD CONSTRAINT metadata_schema CHECK (
    jsonb_typeof(metadata) = 'object' AND
    (metadata ? 'description' IS FALSE OR jsonb_typeof(metadata->'description') = 'string') AND
    (metadata ? 'location' IS FALSE OR jsonb_typeof(metadata->'location') = 'string') AND
    (metadata ? 'contact_info' IS FALSE OR jsonb_typeof(metadata->'contact_info') = 'string') AND
    (metadata ? 'estimated_duration' IS FALSE OR jsonb_typeof(metadata->'estimated_duration') = 'string')
);

-- Steps Table - Individual guidance steps within events
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL 
        CONSTRAINT step_order_positive CHECK (step_order > 0),
    image_url VARCHAR(1000),
    image_alt VARCHAR(500),
    description TEXT NOT NULL
        CONSTRAINT description_length CHECK (LENGTH(description) BETWEEN 1 AND 500),
    view_count INTEGER DEFAULT 0
        CONSTRAINT view_count_non_negative CHECK (view_count >= 0),
    completion_count INTEGER DEFAULT 0
        CONSTRAINT completion_count_non_negative CHECK (completion_count >= 0),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique step order per event
    UNIQUE (event_id, step_order)
);

COMMENT ON TABLE steps IS 'Individual navigation steps within guidance events';
COMMENT ON COLUMN steps.step_order IS 'Sequential order of step within the event (1, 2, 3, etc.)';
COMMENT ON COLUMN steps.image_alt IS 'Accessibility description for screen readers';
COMMENT ON COLUMN steps.metadata IS 'Additional step data (coordinates, timing, etc.)';

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- Event Views Table - Track public access to events
CREATE TABLE event_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    visitor_id UUID,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(1000),
    country_code CHAR(2),
    city VARCHAR(100),
    completed BOOLEAN DEFAULT false,
    completion_time_seconds INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT completion_time_positive CHECK (
        completion_time_seconds IS NULL OR completion_time_seconds > 0
    )
);

COMMENT ON TABLE event_views IS 'Analytics tracking for public event access';
COMMENT ON COLUMN event_views.visitor_id IS 'Anonymous UUID for tracking unique visitors';
COMMENT ON COLUMN event_views.completed IS 'Whether visitor completed all steps';

-- Step Views Table - Track individual step interactions
CREATE TABLE step_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    event_view_id UUID REFERENCES event_views(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT time_spent_positive CHECK (
        time_spent_seconds IS NULL OR time_spent_seconds >= 0
    )
);

COMMENT ON TABLE step_views IS 'Detailed tracking of individual step interactions';

-- =============================================================================
-- AUTHENTICATION TABLES
-- =============================================================================

-- User Sessions Table - Track active sessions for security
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_sessions IS 'Active user sessions with refresh token tracking';

-- =============================================================================
-- SYSTEM CONFIGURATION
-- =============================================================================

-- System Configuration Table - Application-wide settings
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'Application-wide configuration settings';
COMMENT ON COLUMN system_config.is_public IS 'Whether setting is safe for public API access';

-- Insert default configuration values
INSERT INTO system_config (key, value, description, is_public) VALUES
('max_events_per_user', '10', 'Maximum events per organizer in MVP', false),
('max_steps_per_event', '20', 'Maximum steps per guidance event', false),
('image_upload_max_size', '5242880', 'Max image upload size in bytes (5MB)', false),
('event_default_expiry_hours', '168', 'Default event expiry in hours (7 days)', false),
('maintenance_mode', 'false', 'System maintenance mode flag', true);

-- =============================================================================
-- BASIC INDEXES
-- =============================================================================

-- Primary performance indexes
CREATE INDEX idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX idx_events_status_expiry ON events(status, expiration_date) 
    WHERE status = 'published';
CREATE INDEX idx_events_created_at ON events(created_at DESC);

CREATE INDEX idx_steps_event_order ON steps(event_id, step_order);
CREATE INDEX idx_steps_event_created ON steps(event_id, created_at);

CREATE INDEX idx_users_username_lower ON users(LOWER(username));
CREATE INDEX idx_users_email_lower ON users(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Analytics indexes
CREATE INDEX idx_event_views_event_date ON event_views(event_id, viewed_at DESC);
CREATE INDEX idx_event_views_visitor ON event_views(visitor_id, viewed_at DESC);
CREATE INDEX idx_step_views_step_date ON step_views(step_id, viewed_at DESC);

-- Session management indexes
CREATE INDEX idx_user_sessions_expiry ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);

-- Composite index for public event access
CREATE INDEX idx_events_public_access ON events(id, status, expiration_date) 
    WHERE status = 'published';

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Initial schema migration completed successfully';
    RAISE NOTICE '📊 Created tables: users, events, steps, event_views, step_views, user_sessions, system_config';
    RAISE NOTICE '🔧 Next step: Run functions and triggers migration (002)';
END $$;
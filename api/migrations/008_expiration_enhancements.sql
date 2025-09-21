-- =============================================================================
-- TrailGuide PWA - Expiration Enhancements Migration
-- Version: 008
-- Description: Add expiration analytics tracking and update default settings
-- =============================================================================

-- =============================================================================
-- EXPIRATION ANALYTICS TABLES
-- =============================================================================

-- Expired Access Attempts Table - Track attempts to access expired guides
CREATE TABLE expired_access_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_slug VARCHAR(255),
    event_name VARCHAR(255),
    visitor_id UUID,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(1000),
    access_method VARCHAR(20) DEFAULT 'slug', -- 'slug' or 'id'
    expired_at TIMESTAMP WITH TIME ZONE,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE expired_access_attempts IS 'Track attempts to access expired guides for analytics';
COMMENT ON COLUMN expired_access_attempts.access_method IS 'How the guide was accessed (slug or direct ID)';
COMMENT ON COLUMN expired_access_attempts.expired_at IS 'When the guide actually expired';

-- =============================================================================
-- UPDATE SYSTEM CONFIGURATION
-- =============================================================================

-- Update default expiration to 24 hours instead of 7 days
UPDATE system_config 
SET value = '24', 
    description = 'Default event expiry in hours (24 hours)',
    updated_at = NOW()
WHERE key = 'event_default_expiry_hours';

-- Add new expiration-related configuration
INSERT INTO system_config (key, value, description, is_public) VALUES
('min_expiry_hours', '1', 'Minimum event expiry in hours', false),
('max_expiry_hours', '24', 'Maximum event expiry in hours', false),
('expired_access_tracking', 'true', 'Enable tracking of expired guide access attempts', false)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- =============================================================================
-- ADD COVER IMAGE COLUMNS TO EVENTS TABLE
-- =============================================================================

-- Add cover image columns if they don't exist (defensive migration)
DO $$
BEGIN
    -- Add cover_image_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'cover_image_url') THEN
        ALTER TABLE events ADD COLUMN cover_image_url VARCHAR(1000);
        COMMENT ON COLUMN events.cover_image_url IS 'URL path to event cover image';
    END IF;
    
    -- Add cover_image_alt column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'cover_image_alt') THEN
        ALTER TABLE events ADD COLUMN cover_image_alt VARCHAR(500);
        COMMENT ON COLUMN events.cover_image_alt IS 'Accessibility description for cover image';
    END IF;
END $$;

-- =============================================================================
-- ANALYTICS INDEXES
-- =============================================================================

-- Indexes for expired access tracking
CREATE INDEX idx_expired_access_event_date ON expired_access_attempts(event_id, attempted_at DESC);
CREATE INDEX idx_expired_access_ip_date ON expired_access_attempts(ip_address, attempted_at DESC);
CREATE INDEX idx_expired_access_slug ON expired_access_attempts(event_slug) WHERE event_slug IS NOT NULL;

-- Enhanced expiration lookup indexes
CREATE INDEX idx_events_expiration_check ON events(status, expiration_date) 
    WHERE status = 'published' AND expiration_date IS NOT NULL;

-- Index for finding soon-to-expire events (for potential notifications)
CREATE INDEX idx_events_soon_expire ON events(expiration_date, status) 
    WHERE status = 'published' AND expiration_date > NOW();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to get remaining time for an event
CREATE OR REPLACE FUNCTION get_event_remaining_time(event_expiration_date TIMESTAMP WITH TIME ZONE)
RETURNS INTERVAL AS $$
BEGIN
    IF event_expiration_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF event_expiration_date <= NOW() THEN
        RETURN INTERVAL '0 seconds';
    END IF;
    
    RETURN event_expiration_date - NOW();
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_event_remaining_time IS 'Calculate remaining time until event expiration';

-- Function to check if an event is expired
CREATE OR REPLACE FUNCTION is_event_expired(event_expiration_date TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN event_expiration_date IS NOT NULL AND event_expiration_date <= NOW();
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_event_expired IS 'Check if an event has expired';

-- Function to format remaining time for display
CREATE OR REPLACE FUNCTION format_remaining_time(remaining_time INTERVAL)
RETURNS TEXT AS $$
DECLARE
    total_hours INTEGER;
    minutes INTEGER;
    result TEXT := '';
BEGIN
    IF remaining_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF remaining_time <= INTERVAL '0 seconds' THEN
        RETURN '0';
    END IF;
    
    total_hours := EXTRACT(EPOCH FROM remaining_time)::INTEGER / 3600;
    minutes := (EXTRACT(EPOCH FROM remaining_time)::INTEGER % 3600) / 60;
    
    IF total_hours > 0 THEN
        result := total_hours || 'h';
        IF minutes > 0 THEN
            result := result || ' ' || minutes || 'm';
        END IF;
    ELSE
        result := minutes || 'm';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION format_remaining_time IS 'Format remaining time interval for user display';

-- =============================================================================
-- DATA VALIDATION
-- =============================================================================

-- Ensure existing events have reasonable expiration dates
UPDATE events 
SET expiration_date = created_at + INTERVAL '24 hours'
WHERE expiration_date IS NULL 
  AND status = 'published' 
  AND created_at > NOW() - INTERVAL '1 day';

-- Clean up any invalid expiration dates (past dates on active events)
UPDATE events 
SET expiration_date = NOW() + INTERVAL '1 hour'
WHERE status = 'published' 
  AND expiration_date IS NOT NULL 
  AND expiration_date <= NOW();

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
DECLARE
    expired_tracking_count INTEGER;
    updated_configs INTEGER;
BEGIN
    -- Count existing expired access attempts (should be 0 for new table)
    SELECT COUNT(*) INTO expired_tracking_count FROM expired_access_attempts;
    
    -- Count updated system configs
    SELECT COUNT(*) INTO updated_configs FROM system_config WHERE key IN ('event_default_expiry_hours', 'min_expiry_hours', 'max_expiry_hours');
    
    RAISE NOTICE '✅ Expiration enhancements migration completed successfully';
    RAISE NOTICE '📊 Created expired_access_attempts table (current records: %)', expired_tracking_count;
    RAISE NOTICE '⚙️  Updated system configuration entries: %', updated_configs;
    RAISE NOTICE '🕒 Default expiration changed from 7 days to 24 hours';
    RAISE NOTICE '📈 Created utility functions for time calculations';
    RAISE NOTICE '🔧 Added analytics indexes for performance';
END $$;
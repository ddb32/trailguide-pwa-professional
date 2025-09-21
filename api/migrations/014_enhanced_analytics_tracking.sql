-- =============================================================================
-- MIGRATION 014: Enhanced Analytics Tracking
-- =============================================================================
-- Description: Add enhanced visitor tracking capabilities to analytics tables
-- Date: 2025-09-17
-- Author: Claude Code Analytics Upgrade Phase 1

-- =============================================================================
-- ENHANCE EVENT_VIEWS TABLE
-- =============================================================================

-- Add new columns for enhanced visitor tracking
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS browser_info VARCHAR(200);
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS is_returning_visitor BOOLEAN DEFAULT false;

-- Add comments for new columns
COMMENT ON COLUMN event_views.session_id IS 'Session identifier for tracking user sessions';
COMMENT ON COLUMN event_views.device_type IS 'Device type: mobile, tablet, desktop';
COMMENT ON COLUMN event_views.browser_info IS 'Browser name and version information';
COMMENT ON COLUMN event_views.is_returning_visitor IS 'Whether this is a returning visitor based on fingerprint';

-- =============================================================================
-- ENHANCE EXPIRED_ACCESS_ATTEMPTS TABLE
-- =============================================================================

-- Add new columns for enhanced visitor tracking
ALTER TABLE expired_access_attempts ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE expired_access_attempts ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);
ALTER TABLE expired_access_attempts ADD COLUMN IF NOT EXISTS browser_info VARCHAR(200);
ALTER TABLE expired_access_attempts ADD COLUMN IF NOT EXISTS is_returning_visitor BOOLEAN DEFAULT false;

-- Add comments for new columns
COMMENT ON COLUMN expired_access_attempts.session_id IS 'Session identifier for tracking user sessions';
COMMENT ON COLUMN expired_access_attempts.device_type IS 'Device type: mobile, tablet, desktop';
COMMENT ON COLUMN expired_access_attempts.browser_info IS 'Browser name and version information';
COMMENT ON COLUMN expired_access_attempts.is_returning_visitor IS 'Whether this is a returning visitor based on fingerprint';

-- =============================================================================
-- CREATE INDEXES FOR ENHANCED ANALYTICS
-- =============================================================================

-- Index for session tracking across event views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_session_id
ON event_views(session_id) WHERE session_id IS NOT NULL;

-- Index for device type analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_device_type
ON event_views(device_type) WHERE device_type IS NOT NULL;

-- Index for returning visitor analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_returning_visitor
ON event_views(is_returning_visitor);

-- Composite index for enhanced visitor tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_visitor_session
ON event_views(visitor_id, session_id, viewed_at) WHERE visitor_id IS NOT NULL;

-- Index for expired access attempts by session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expired_access_session_id
ON expired_access_attempts(session_id) WHERE session_id IS NOT NULL;

-- =============================================================================
-- UPDATE EXISTING DATA (MIGRATION SAFE)
-- =============================================================================

-- Set default values for existing records
UPDATE event_views
SET is_returning_visitor = false
WHERE is_returning_visitor IS NULL;

UPDATE expired_access_attempts
SET is_returning_visitor = false
WHERE is_returning_visitor IS NULL;

-- =============================================================================
-- ANALYTICS HELPER VIEWS
-- =============================================================================

-- Enhanced visitor analytics view
CREATE OR REPLACE VIEW visitor_analytics_enhanced AS
SELECT
    event_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_visitors,
    COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) as unique_sessions,
    COUNT(*) FILTER (WHERE device_type = 'mobile') as mobile_views,
    COUNT(*) FILTER (WHERE device_type = 'tablet') as tablet_views,
    COUNT(*) FILTER (WHERE device_type = 'desktop') as desktop_views,
    COUNT(*) FILTER (WHERE is_returning_visitor = true) as returning_visitor_views,
    COUNT(*) FILTER (WHERE is_returning_visitor = false) as new_visitor_views,
    COUNT(*) FILTER (WHERE completed = true) as completed_views,
    ROUND(
        COUNT(*) FILTER (WHERE completed = true)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
    ) as completion_rate_percent
FROM event_views
GROUP BY event_id;

COMMENT ON VIEW visitor_analytics_enhanced IS 'Enhanced analytics view with device type and visitor behavior insights';

-- =============================================================================
-- VALIDATION CONSTRAINTS
-- =============================================================================

-- Add check constraints for device type
ALTER TABLE event_views
ADD CONSTRAINT IF NOT EXISTS chk_event_views_device_type
CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop', 'unknown'));

ALTER TABLE expired_access_attempts
ADD CONSTRAINT IF NOT EXISTS chk_expired_access_device_type
CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop', 'unknown'));

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
INSERT INTO system_config (key, value, description, is_public)
VALUES (
    'migration_014_completed',
    'true',
    'Enhanced analytics tracking migration completed',
    false
) ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Migration success notification
SELECT
    '✅ Migration 014: Enhanced Analytics Tracking' as status,
    'Successfully added session tracking, device info, and visitor behavior columns' as details,
    NOW() as completed_at;
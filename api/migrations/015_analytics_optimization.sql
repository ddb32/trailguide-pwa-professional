-- =============================================================================
-- MIGRATION 015: Analytics Optimization & Views
-- =============================================================================
-- Description: Create optimized views and indexes for analytics dashboard performance
-- Date: 2025-09-17
-- Author: Claude Code Analytics Upgrade Phase 2

-- =============================================================================
-- ANALYTICS PERFORMANCE INDEXES
-- =============================================================================

-- Index for event ownership and analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_status_deleted
ON events(user_id, status, deleted_at) WHERE deleted_at IS NULL;

-- Composite index for event views analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_analytics
ON event_views(event_id, viewed_at, completed, device_type, is_returning_visitor);

-- Index for visitor analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_visitor_analytics
ON event_views(visitor_id, session_id, viewed_at) WHERE visitor_id IS NOT NULL;

-- Index for time-based analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_views_time_analytics
ON event_views(viewed_at, event_id, completed);

-- Index for step analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_step_views_analytics
ON step_views(step_id, event_view_id, viewed_at);

-- Index for feedback analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_feedback_analytics
ON event_feedback(event_id, feedback_type, submitted_at);

-- =============================================================================
-- ANALYTICS MATERIALIZED VIEWS
-- =============================================================================

-- Daily analytics summary for fast dashboard loading
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics_summary AS
SELECT
    e.user_id,
    e.id as event_id,
    DATE(ev.viewed_at) as analytics_date,
    COUNT(*) as daily_views,
    COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as daily_unique_visitors,
    COUNT(DISTINCT ev.session_id) FILTER (WHERE ev.session_id IS NOT NULL) as daily_unique_sessions,
    COUNT(*) FILTER (WHERE ev.completed = true) as daily_completions,
    COUNT(*) FILTER (WHERE ev.device_type = 'mobile') as daily_mobile_views,
    COUNT(*) FILTER (WHERE ev.device_type = 'tablet') as daily_tablet_views,
    COUNT(*) FILTER (WHERE ev.device_type = 'desktop') as daily_desktop_views,
    COUNT(*) FILTER (WHERE ev.is_returning_visitor = true) as daily_returning_views,
    AVG(ev.completion_time_seconds) FILTER (WHERE ev.completion_time_seconds IS NOT NULL) as avg_completion_time
FROM events e
JOIN event_views ev ON e.id = ev.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.user_id, e.id, DATE(ev.viewed_at);

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_analytics_summary_unique
ON daily_analytics_summary(user_id, event_id, analytics_date);

-- Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ANALYTICS HELPER VIEWS
-- =============================================================================

-- Guide performance summary view
CREATE OR REPLACE VIEW guide_performance_summary AS
SELECT
    e.id as guide_id,
    e.user_id,
    e.event_name,
    e.slug,
    e.status,
    e.created_at,
    e.expiration_date,
    COUNT(DISTINCT ev.id) as total_views,
    COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
    COUNT(DISTINCT ev.session_id) FILTER (WHERE ev.session_id IS NOT NULL) as unique_sessions,
    COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true) as completed_views,
    ROUND(
        COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true)::numeric /
        NULLIF(COUNT(DISTINCT ev.id), 0) * 100, 2
    ) as completion_rate,
    COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'mobile') as mobile_views,
    COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'tablet') as tablet_views,
    COUNT(DISTINCT ev.id) FILTER (WHERE ev.device_type = 'desktop') as desktop_views,
    COUNT(DISTINCT ev.id) FILTER (WHERE ev.is_returning_visitor = true) as returning_visitor_views,
    AVG(ev.completion_time_seconds) FILTER (WHERE ev.completion_time_seconds IS NOT NULL) as avg_completion_time,
    MIN(ev.viewed_at) as first_view,
    MAX(ev.viewed_at) as last_view
FROM events e
LEFT JOIN event_views ev ON e.id = ev.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.user_id, e.event_name, e.slug, e.status, e.created_at, e.expiration_date;

COMMENT ON VIEW guide_performance_summary IS 'Comprehensive guide performance metrics for analytics dashboard';

-- Device analytics view
CREATE OR REPLACE VIEW device_analytics_summary AS
SELECT
    e.user_id,
    e.id as guide_id,
    ev.device_type,
    COUNT(*) as views,
    COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
    COUNT(*) FILTER (WHERE ev.completed = true) as completions,
    ROUND(
        COUNT(*) FILTER (WHERE ev.completed = true)::numeric /
        NULLIF(COUNT(*), 0) * 100, 2
    ) as completion_rate,
    AVG(ev.completion_time_seconds) FILTER (WHERE ev.completion_time_seconds IS NOT NULL) as avg_completion_time
FROM events e
JOIN event_views ev ON e.id = ev.event_id
WHERE e.deleted_at IS NULL AND ev.device_type IS NOT NULL
GROUP BY e.user_id, e.id, ev.device_type;

COMMENT ON VIEW device_analytics_summary IS 'Device-specific analytics for user behavior insights';

-- Step engagement analytics view
CREATE OR REPLACE VIEW step_engagement_summary AS
SELECT
    e.user_id,
    e.id as guide_id,
    s.id as step_id,
    s.step_order,
    s.description,
    COUNT(sv.id) as step_views,
    COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_step_visitors,
    AVG(sv.time_spent_seconds) FILTER (WHERE sv.time_spent_seconds IS NOT NULL) as avg_time_spent,
    -- Calculate step completion rate (views reaching this step vs total guide views)
    ROUND(
        COUNT(sv.id)::numeric /
        NULLIF((SELECT COUNT(*) FROM event_views WHERE event_id = e.id), 0) * 100, 2
    ) as step_reach_rate
FROM events e
JOIN steps s ON e.id = s.event_id
LEFT JOIN step_views sv ON s.id = sv.step_id
LEFT JOIN event_views ev ON sv.event_view_id = ev.id
WHERE e.deleted_at IS NULL
GROUP BY e.user_id, e.id, s.id, s.step_order, s.description;

COMMENT ON VIEW step_engagement_summary IS 'Step-by-step engagement analytics for guide optimization';

-- Time-based analytics view
CREATE OR REPLACE VIEW time_analytics_summary AS
SELECT
    e.user_id,
    e.id as guide_id,
    EXTRACT(year FROM ev.viewed_at) as year,
    EXTRACT(month FROM ev.viewed_at) as month,
    EXTRACT(day FROM ev.viewed_at) as day,
    EXTRACT(dow FROM ev.viewed_at) as day_of_week,
    EXTRACT(hour FROM ev.viewed_at) as hour,
    COUNT(*) as views,
    COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL) as unique_visitors,
    COUNT(*) FILTER (WHERE ev.completed = true) as completions
FROM events e
JOIN event_views ev ON e.id = ev.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.user_id, e.id,
         EXTRACT(year FROM ev.viewed_at),
         EXTRACT(month FROM ev.viewed_at),
         EXTRACT(day FROM ev.viewed_at),
         EXTRACT(dow FROM ev.viewed_at),
         EXTRACT(hour FROM ev.viewed_at);

COMMENT ON VIEW time_analytics_summary IS 'Time-based analytics for understanding user behavior patterns';

-- =============================================================================
-- ANALYTICS FUNCTIONS
-- =============================================================================

-- Function to get guide analytics for a specific time range
CREATE OR REPLACE FUNCTION get_guide_analytics(
    p_user_id UUID,
    p_guide_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
    guide_id UUID,
    guide_name VARCHAR,
    total_views BIGINT,
    unique_visitors BIGINT,
    completion_rate NUMERIC,
    avg_completion_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.event_name,
        COUNT(DISTINCT ev.id)::BIGINT,
        COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.visitor_id IS NOT NULL)::BIGINT,
        ROUND(
            COUNT(DISTINCT ev.id) FILTER (WHERE ev.completed = true)::numeric /
            NULLIF(COUNT(DISTINCT ev.id), 0) * 100, 2
        ),
        AVG(ev.completion_time_seconds) FILTER (WHERE ev.completion_time_seconds IS NOT NULL)
    FROM events e
    LEFT JOIN event_views ev ON e.id = ev.event_id
    WHERE e.user_id = p_user_id
        AND e.deleted_at IS NULL
        AND (p_guide_id IS NULL OR e.id = p_guide_id)
        AND (p_start_date IS NULL OR ev.viewed_at >= p_start_date)
        AND (p_end_date IS NULL OR ev.viewed_at <= p_end_date)
    GROUP BY e.id, e.event_name
    ORDER BY COUNT(DISTINCT ev.id) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_guide_analytics IS 'Get comprehensive analytics for guides with optional filtering';

-- Function to refresh all analytics data
CREATE OR REPLACE FUNCTION refresh_all_analytics()
RETURNS void AS $$
BEGIN
    -- Refresh materialized views
    PERFORM refresh_analytics_summary();

    -- Update analytics counters in events table
    UPDATE events SET
        unique_visitors_count = (
            SELECT COUNT(DISTINCT visitor_id)
            FROM event_views
            WHERE event_id = events.id AND visitor_id IS NOT NULL
        ),
        clicks_count = (
            SELECT COUNT(*)
            FROM event_views
            WHERE event_id = events.id
        ),
        completion_count = (
            SELECT COUNT(*)
            FROM event_views
            WHERE event_id = events.id AND completed = true
        )
    WHERE deleted_at IS NULL;

    RAISE NOTICE 'Analytics data refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_analytics IS 'Refresh all analytics data and counters';

-- =============================================================================
-- ANALYTICS DATA CLEANUP
-- =============================================================================

-- Function to clean up old analytics data (privacy compliance)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
    -- Remove analytics data older than 2 years (configurable)
    DELETE FROM step_views
    WHERE id IN (
        SELECT sv.id
        FROM step_views sv
        JOIN event_views ev ON sv.event_view_id = ev.id
        WHERE ev.viewed_at < NOW() - INTERVAL '2 years'
    );

    DELETE FROM event_views
    WHERE viewed_at < NOW() - INTERVAL '2 years';

    -- Remove expired access attempts older than 1 year
    DELETE FROM expired_access_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 year';

    -- Refresh analytics after cleanup
    PERFORM refresh_all_analytics();

    RAISE NOTICE 'Old analytics data cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_analytics_data IS 'Clean up old analytics data for privacy compliance';

-- =============================================================================
-- TRIGGERS FOR REAL-TIME ANALYTICS
-- =============================================================================

-- Function to update analytics counters when new event view is created
CREATE OR REPLACE FUNCTION update_analytics_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Update event counters
    UPDATE events SET
        clicks_count = clicks_count + 1,
        unique_visitors_count = (
            SELECT COUNT(DISTINCT visitor_id)
            FROM event_views
            WHERE event_id = NEW.event_id AND visitor_id IS NOT NULL
        )
    WHERE id = NEW.event_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time analytics updates
DROP TRIGGER IF EXISTS trigger_update_analytics_counters ON event_views;
CREATE TRIGGER trigger_update_analytics_counters
    AFTER INSERT ON event_views
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_counters();

-- Function to update completion counters
CREATE OR REPLACE FUNCTION update_completion_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if completion status changed from false to true
    IF OLD.completed = false AND NEW.completed = true THEN
        UPDATE events SET
            completion_count = completion_count + 1
        WHERE id = NEW.event_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for completion tracking
DROP TRIGGER IF EXISTS trigger_update_completion_counters ON event_views;
CREATE TRIGGER trigger_update_completion_counters
    AFTER UPDATE ON event_views
    FOR EACH ROW
    EXECUTE FUNCTION update_completion_counters();

-- =============================================================================
-- SCHEDULED ANALYTICS REFRESH (Setup for cron job)
-- =============================================================================

-- Insert analytics refresh schedule into system config
INSERT INTO system_config (key, value, description, is_public)
VALUES (
    'analytics_refresh_schedule',
    '"0 */6 * * *"',
    'Cron schedule for analytics refresh (every 6 hours)',
    false
) ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
INSERT INTO system_config (key, value, description, is_public)
VALUES (
    'migration_015_completed',
    'true',
    'Analytics optimization and views migration completed',
    false
) ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Refresh analytics data for initial population
SELECT refresh_all_analytics();

-- Migration success notification
SELECT
    '✅ Migration 015: Analytics Optimization' as status,
    'Successfully created analytics views, indexes, and optimization functions' as details,
    NOW() as completed_at;
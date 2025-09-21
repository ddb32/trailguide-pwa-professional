-- =============================================================================
-- TrailGuide PWA - Feedback Analytics Migration
-- Version: 009
-- Description: Add comprehensive feedback collection and analytics tracking
-- =============================================================================

-- Event Feedback Table - Track user feedback on completed guides
CREATE TABLE event_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_view_id UUID NOT NULL REFERENCES event_views(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Feedback ratings
    liked BOOLEAN, -- true = like, false = dislike, null = no rating
    helpful BOOLEAN, -- true = helpful, false = not helpful, null = no rating
    
    -- Optional text feedback
    feedback_text TEXT,
    
    -- Metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    visitor_id VARCHAR(255), -- Copy from event_views for easier querying
    ip_address INET, -- Copy from event_views for analytics
    user_agent TEXT -- Copy from event_views for device analysis
);

COMMENT ON TABLE event_feedback IS 'User feedback collection for guide effectiveness validation';
COMMENT ON COLUMN event_feedback.liked IS 'Like/dislike rating: true=like, false=dislike, null=no_rating';
COMMENT ON COLUMN event_feedback.helpful IS 'Helpfulness rating: true=helpful, false=not_helpful, null=no_rating';
COMMENT ON COLUMN event_feedback.feedback_text IS 'Optional free-text feedback from users';

-- =============================================================================
-- ENHANCE EVENTS TABLE FOR CREATION TIME TRACKING
-- =============================================================================

-- Add creation timing fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS creation_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creation_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creation_duration_minutes INTEGER;

COMMENT ON COLUMN events.creation_started_at IS 'When organizer started creating this guide';
COMMENT ON COLUMN events.creation_completed_at IS 'When organizer finished creating this guide';
COMMENT ON COLUMN events.creation_duration_minutes IS 'Total time spent creating this guide in minutes';

-- Add soft delete functionality for data preservation
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

COMMENT ON COLUMN events.deleted_at IS 'When this event was deleted by organizer (soft delete for analytics)';
COMMENT ON COLUMN events.deleted_by IS 'Which user deleted this event';

-- =============================================================================
-- ENHANCED ANALYTICS FIELDS
-- =============================================================================

-- Add enhanced tracking fields to event_views
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS browser_name VARCHAR(100);
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS country_code CHAR(2);
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS is_returning_visitor BOOLEAN DEFAULT FALSE;
ALTER TABLE event_views ADD COLUMN IF NOT EXISTS referrer_domain VARCHAR(255);

COMMENT ON COLUMN event_views.device_type IS 'Device type: mobile, tablet, desktop, unknown';
COMMENT ON COLUMN event_views.browser_name IS 'Browser name extracted from user agent';
COMMENT ON COLUMN event_views.country_code IS 'ISO country code from IP address';
COMMENT ON COLUMN event_views.is_returning_visitor IS 'Whether this visitor has accessed guides before';
COMMENT ON COLUMN event_views.referrer_domain IS 'Domain of the referring website';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Feedback analytics indexes
CREATE INDEX idx_event_feedback_event_id ON event_feedback(event_id, submitted_at DESC);
CREATE INDEX idx_event_feedback_ratings ON event_feedback(event_id, liked, helpful);
CREATE INDEX idx_event_feedback_visitor ON event_feedback(visitor_id, submitted_at DESC);
CREATE INDEX idx_event_feedback_event_view ON event_feedback(event_view_id);

-- Creation timing indexes
CREATE INDEX idx_events_creation_timing ON events(organizer_id, creation_completed_at DESC) 
WHERE creation_completed_at IS NOT NULL;

-- Soft delete indexes
CREATE INDEX idx_events_deleted ON events(deleted_at, deleted_by) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_events_active ON events(organizer_id, created_at DESC) WHERE deleted_at IS NULL;

-- Enhanced analytics indexes
CREATE INDEX idx_event_views_device ON event_views(event_id, device_type, viewed_at DESC);
CREATE INDEX idx_event_views_country ON event_views(event_id, country_code, viewed_at DESC);
CREATE INDEX idx_event_views_returning ON event_views(is_returning_visitor, viewed_at DESC);
CREATE INDEX idx_event_views_referrer ON event_views(referrer_domain, viewed_at DESC) 
WHERE referrer_domain IS NOT NULL;

-- =============================================================================
-- ANALYTICS HELPER FUNCTIONS
-- =============================================================================

-- Function to get comprehensive event analytics
CREATE OR REPLACE FUNCTION get_event_analytics_detailed(
    p_event_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    completion_count BIGINT,
    completion_rate DECIMAL,
    avg_completion_time_seconds DECIMAL,
    feedback_count BIGINT,
    like_rate DECIMAL,
    helpful_rate DECIMAL,
    returning_visitor_rate DECIMAL,
    top_devices JSONB,
    top_countries JSONB,
    top_referrers JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH feedback_stats AS (
        SELECT 
            COUNT(*) as total_feedback,
            COUNT(CASE WHEN liked = true THEN 1 END)::DECIMAL / NULLIF(COUNT(CASE WHEN liked IS NOT NULL THEN 1 END), 0) as like_percentage,
            COUNT(CASE WHEN helpful = true THEN 1 END)::DECIMAL / NULLIF(COUNT(CASE WHEN helpful IS NOT NULL THEN 1 END), 0) as helpful_percentage
        FROM event_feedback 
        WHERE event_id = p_event_id 
            AND submitted_at > NOW() - INTERVAL '1 day' * p_days
    ),
    view_stats AS (
        SELECT 
            COUNT(*) as views,
            COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_vis,
            COUNT(*) FILTER (WHERE completed = true) as completions,
            COUNT(*) FILTER (WHERE completed = true)::DECIMAL / NULLIF(COUNT(*), 0) as comp_rate,
            AVG(completion_time_seconds) FILTER (WHERE completion_time_seconds IS NOT NULL) as avg_time,
            COUNT(*) FILTER (WHERE is_returning_visitor = true)::DECIMAL / NULLIF(COUNT(*), 0) as returning_rate
        FROM event_views 
        WHERE event_id = p_event_id 
            AND viewed_at > NOW() - INTERVAL '1 day' * p_days
    ),
    device_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(device_type, 'unknown'), 
            device_count
        ) as devices
        FROM (
            SELECT device_type, COUNT(*) as device_count
            FROM event_views 
            WHERE event_id = p_event_id 
                AND viewed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY device_type
            ORDER BY device_count DESC
            LIMIT 5
        ) d
    ),
    country_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(country_code, 'unknown'), 
            country_count
        ) as countries
        FROM (
            SELECT country_code, COUNT(*) as country_count
            FROM event_views 
            WHERE event_id = p_event_id 
                AND viewed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY country_code
            ORDER BY country_count DESC
            LIMIT 10
        ) c
    ),
    referrer_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(referrer_domain, 'direct'), 
            referrer_count
        ) as referrers
        FROM (
            SELECT referrer_domain, COUNT(*) as referrer_count
            FROM event_views 
            WHERE event_id = p_event_id 
                AND viewed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY referrer_domain
            ORDER BY referrer_count DESC
            LIMIT 10
        ) r
    )
    SELECT 
        v.views,
        v.unique_vis,
        v.completions,
        v.comp_rate,
        v.avg_time,
        f.total_feedback,
        f.like_percentage,
        f.helpful_percentage,
        v.returning_rate,
        d.devices,
        c.countries,
        r.referrers
    FROM view_stats v, feedback_stats f, device_stats d, country_stats c, referrer_stats r;
END;
$$ LANGUAGE plpgsql;

-- Function to get organizer analytics summary
CREATE OR REPLACE FUNCTION get_organizer_analytics_summary(
    p_organizer_id UUID,
    p_days INTEGER DEFAULT 30,
    p_include_deleted BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    total_guides BIGINT,
    active_guides BIGINT,
    draft_guides BIGINT,
    deleted_guides BIGINT,
    total_views BIGINT,
    unique_visitors BIGINT,
    total_completions BIGINT,
    avg_completion_rate DECIMAL,
    total_feedback BIGINT,
    avg_like_rate DECIMAL,
    avg_helpful_rate DECIMAL,
    avg_creation_time_minutes DECIMAL,
    most_popular_guide JSONB,
    recent_feedback JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH guide_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'published' AND (deleted_at IS NULL OR p_include_deleted) THEN 1 END) as active,
            COUNT(CASE WHEN status = 'draft' AND deleted_at IS NULL THEN 1 END) as draft,
            COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted,
            AVG(creation_duration_minutes) FILTER (WHERE creation_duration_minutes IS NOT NULL) as avg_creation_time
        FROM events 
        WHERE organizer_id = p_organizer_id
            AND (p_include_deleted OR deleted_at IS NULL)
    ),
    view_stats AS (
        SELECT 
            COALESCE(SUM(ev.view_count), 0) as total_views,
            COALESCE(SUM(ev.unique_visitors), 0) as unique_visitors,
            COALESCE(SUM(ev.completions), 0) as total_completions,
            AVG(ev.completion_rate) as avg_completion_rate
        FROM (
            SELECT 
                e.id,
                COUNT(v.*) as view_count,
                COUNT(DISTINCT v.visitor_id) FILTER (WHERE v.visitor_id IS NOT NULL) as unique_visitors,
                COUNT(*) FILTER (WHERE v.completed = true) as completions,
                COUNT(*) FILTER (WHERE v.completed = true)::DECIMAL / NULLIF(COUNT(*), 0) as completion_rate
            FROM events e
            LEFT JOIN event_views v ON e.id = v.event_id 
                AND v.viewed_at > NOW() - INTERVAL '1 day' * p_days
            WHERE e.organizer_id = p_organizer_id
                AND (p_include_deleted OR e.deleted_at IS NULL)
            GROUP BY e.id
        ) ev
    ),
    feedback_stats AS (
        SELECT 
            COUNT(*) as total_feedback,
            AVG(CASE WHEN liked IS NOT NULL THEN 
                CASE WHEN liked THEN 1.0 ELSE 0.0 END 
            END) as avg_like_rate,
            AVG(CASE WHEN helpful IS NOT NULL THEN 
                CASE WHEN helpful THEN 1.0 ELSE 0.0 END 
            END) as avg_helpful_rate
        FROM event_feedback ef
        JOIN events e ON ef.event_id = e.id
        WHERE e.organizer_id = p_organizer_id
            AND ef.submitted_at > NOW() - INTERVAL '1 day' * p_days
            AND (p_include_deleted OR e.deleted_at IS NULL)
    ),
    popular_guide AS (
        SELECT jsonb_build_object(
            'id', e.id,
            'name', e.event_name,
            'views', COUNT(v.*),
            'completion_rate', COUNT(*) FILTER (WHERE v.completed = true)::DECIMAL / NULLIF(COUNT(*), 0)
        ) as guide_info
        FROM events e
        LEFT JOIN event_views v ON e.id = v.event_id
            AND v.viewed_at > NOW() - INTERVAL '1 day' * p_days  
        WHERE e.organizer_id = p_organizer_id
            AND (p_include_deleted OR e.deleted_at IS NULL)
        GROUP BY e.id, e.event_name
        ORDER BY COUNT(v.*) DESC, COUNT(*) FILTER (WHERE v.completed = true) DESC
        LIMIT 1
    ),
    recent_feedback_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'guide_name', e.event_name,
                'liked', f.liked,
                'helpful', f.helpful,
                'text', f.feedback_text,
                'submitted_at', f.submitted_at
            )
        ) as feedback_data
        FROM event_feedback f
        JOIN events e ON f.event_id = e.id
        WHERE e.organizer_id = p_organizer_id
            AND f.submitted_at > NOW() - INTERVAL '7 days'
            AND (p_include_deleted OR e.deleted_at IS NULL)
        ORDER BY f.submitted_at DESC
        LIMIT 10
    )
    SELECT 
        g.total,
        g.active, 
        g.draft,
        g.deleted,
        v.total_views,
        v.unique_visitors,
        v.total_completions,
        v.avg_completion_rate,
        f.total_feedback,
        f.avg_like_rate,
        f.avg_helpful_rate,
        g.avg_creation_time,
        p.guide_info,
        r.feedback_data
    FROM guide_stats g, view_stats v, feedback_stats f, popular_guide p, recent_feedback_data r;
END;
$$ LANGUAGE plpgsql;

-- Function to get platform-wide analytics for admin
CREATE OR REPLACE FUNCTION get_platform_analytics_summary(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_organizers BIGINT,
    active_organizers BIGINT,
    total_guides BIGINT,
    published_guides BIGINT,
    deleted_guides BIGINT,
    total_views BIGINT,
    unique_visitors BIGINT,
    total_completions BIGINT,
    platform_completion_rate DECIMAL,
    total_feedback BIGINT,
    platform_like_rate DECIMAL,
    platform_helpful_rate DECIMAL,
    avg_guide_creation_time DECIMAL,
    top_performing_guides JSONB,
    organizer_activity JSONB,
    device_distribution JSONB,
    country_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH organizer_stats AS (
        SELECT 
            COUNT(DISTINCT u.id) as total_orgs,
            COUNT(DISTINCT CASE WHEN e.created_at > NOW() - INTERVAL '1 day' * p_days THEN u.id END) as active_orgs
        FROM users u
        LEFT JOIN events e ON u.id = e.organizer_id
    ),
    guide_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
            COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted,
            AVG(creation_duration_minutes) FILTER (WHERE creation_duration_minutes IS NOT NULL) as avg_creation_time
        FROM events
    ),
    view_stats AS (
        SELECT 
            COUNT(*) as total_views,
            COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_visitors,
            COUNT(*) FILTER (WHERE completed = true) as total_completions,
            COUNT(*) FILTER (WHERE completed = true)::DECIMAL / NULLIF(COUNT(*), 0) as completion_rate
        FROM event_views
        WHERE viewed_at > NOW() - INTERVAL '1 day' * p_days
    ),
    feedback_stats AS (
        SELECT 
            COUNT(*) as total_feedback,
            COUNT(CASE WHEN liked = true THEN 1 END)::DECIMAL / NULLIF(COUNT(CASE WHEN liked IS NOT NULL THEN 1 END), 0) as like_rate,
            COUNT(CASE WHEN helpful = true THEN 1 END)::DECIMAL / NULLIF(COUNT(CASE WHEN helpful IS NOT NULL THEN 1 END), 0) as helpful_rate
        FROM event_feedback
        WHERE submitted_at > NOW() - INTERVAL '1 day' * p_days
    ),
    top_guides AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', e.id,
                'name', e.event_name,
                'organizer', u.full_name,
                'views', view_count,
                'completion_rate', completion_rate,
                'feedback_score', feedback_score
            )
        ) as guides_data
        FROM (
            SELECT 
                e.id, e.event_name, e.organizer_id,
                COUNT(v.*) as view_count,
                COUNT(*) FILTER (WHERE v.completed = true)::DECIMAL / NULLIF(COUNT(*), 0) as completion_rate,
                AVG(CASE WHEN f.liked IS NOT NULL THEN 
                    CASE WHEN f.liked THEN 1.0 ELSE 0.0 END 
                END) as feedback_score
            FROM events e
            LEFT JOIN event_views v ON e.id = v.event_id 
                AND v.viewed_at > NOW() - INTERVAL '1 day' * p_days
            LEFT JOIN event_feedback f ON e.id = f.event_id 
                AND f.submitted_at > NOW() - INTERVAL '1 day' * p_days
            WHERE e.status = 'published' AND e.deleted_at IS NULL
            GROUP BY e.id, e.event_name, e.organizer_id
            ORDER BY view_count DESC, completion_rate DESC
            LIMIT 10
        ) top_e
        JOIN users u ON top_e.organizer_id = u.id
    ),
    organizer_activity_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'organizer_name', u.full_name,
                'guides_created', guide_count,
                'total_views', view_count,
                'avg_completion_rate', avg_completion_rate
            )
        ) as activity_data
        FROM (
            SELECT 
                e.organizer_id,
                COUNT(e.*) as guide_count,
                COALESCE(SUM(view_counts.views), 0) as view_count,
                AVG(view_counts.completion_rate) as avg_completion_rate
            FROM events e
            LEFT JOIN (
                SELECT 
                    event_id,
                    COUNT(*) as views,
                    COUNT(*) FILTER (WHERE completed = true)::DECIMAL / NULLIF(COUNT(*), 0) as completion_rate
                FROM event_views
                WHERE viewed_at > NOW() - INTERVAL '1 day' * p_days
                GROUP BY event_id
            ) view_counts ON e.id = view_counts.event_id
            WHERE e.created_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY e.organizer_id
            ORDER BY guide_count DESC, view_count DESC
            LIMIT 10
        ) org_activity
        JOIN users u ON org_activity.organizer_id = u.id
    ),
    device_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(device_type, 'unknown'), 
            device_count
        ) as device_data
        FROM (
            SELECT device_type, COUNT(*) as device_count
            FROM event_views 
            WHERE viewed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY device_type
            ORDER BY device_count DESC
        ) d
    ),
    country_stats AS (
        SELECT jsonb_object_agg(
            COALESCE(country_code, 'unknown'), 
            country_count
        ) as country_data
        FROM (
            SELECT country_code, COUNT(*) as country_count
            FROM event_views 
            WHERE viewed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY country_code
            ORDER BY country_count DESC
            LIMIT 20
        ) c
    )
    SELECT 
        o.total_orgs,
        o.active_orgs,
        g.total,
        g.published,
        g.deleted,
        v.total_views,
        v.unique_visitors,
        v.total_completions,
        v.completion_rate,
        f.total_feedback,
        f.like_rate,
        f.helpful_rate,
        g.avg_creation_time,
        t.guides_data,
        a.activity_data,
        d.device_data,
        c.country_data
    FROM organizer_stats o, guide_stats g, view_stats v, feedback_stats f, 
         top_guides t, organizer_activity_data a, device_stats d, country_stats c;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS FOR AUTOMATED ANALYTICS
-- =============================================================================

-- Function to extract device type from user agent
CREATE OR REPLACE FUNCTION extract_device_info(user_agent_string TEXT)
RETURNS TABLE (
    device_type VARCHAR(50),
    browser_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN user_agent_string ~* 'Mobile|Android|iPhone|iPad' THEN 
                CASE WHEN user_agent_string ~* 'iPad' THEN 'tablet'::VARCHAR(50) ELSE 'mobile'::VARCHAR(50) END
            WHEN user_agent_string ~* 'Tablet' THEN 'tablet'::VARCHAR(50)
            ELSE 'desktop'::VARCHAR(50)
        END,
        CASE 
            WHEN user_agent_string ~* 'Chrome' THEN 'Chrome'::VARCHAR(100)
            WHEN user_agent_string ~* 'Firefox' THEN 'Firefox'::VARCHAR(100)  
            WHEN user_agent_string ~* 'Safari' THEN 'Safari'::VARCHAR(100)
            WHEN user_agent_string ~* 'Edge' THEN 'Edge'::VARCHAR(100)
            ELSE 'Unknown'::VARCHAR(100)
        END;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-populate analytics fields
CREATE OR REPLACE FUNCTION populate_event_view_analytics()
RETURNS TRIGGER AS $$
DECLARE
    device_info RECORD;
    referrer_host TEXT;
    is_returning BOOLEAN DEFAULT FALSE;
BEGIN
    -- Extract device information
    SELECT * INTO device_info FROM extract_device_info(NEW.user_agent);
    NEW.device_type := device_info.device_type;
    NEW.browser_name := device_info.browser_name;
    
    -- Extract referrer domain
    IF NEW.referrer IS NOT NULL AND NEW.referrer != '' THEN
        referrer_host := substring(NEW.referrer from 'https?://([^/]+)');
        NEW.referrer_domain := referrer_host;
    END IF;
    
    -- Check if returning visitor (if visitor_id exists)
    IF NEW.visitor_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM event_views 
            WHERE visitor_id = NEW.visitor_id 
            AND id != COALESCE(NEW.id, gen_random_uuid())
            LIMIT 1
        ) INTO is_returning;
        NEW.is_returning_visitor := is_returning;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event view analytics
CREATE TRIGGER populate_event_view_analytics_trigger
    BEFORE INSERT OR UPDATE ON event_views
    FOR EACH ROW
    EXECUTE FUNCTION populate_event_view_analytics();

-- =============================================================================
-- DATA VALIDATION
-- =============================================================================

DO $$
DECLARE
    feedback_table_count INTEGER;
    analytics_functions_count INTEGER;
BEGIN
    -- Verify feedback table was created
    SELECT COUNT(*) INTO feedback_table_count 
    FROM information_schema.tables 
    WHERE table_name = 'event_feedback';
    
    -- Verify analytics functions were created
    SELECT COUNT(*) INTO analytics_functions_count 
    FROM information_schema.routines 
    WHERE routine_name LIKE '%analytics%' 
    AND routine_type = 'FUNCTION';
    
    RAISE NOTICE '✅ Feedback analytics migration completed successfully';
    RAISE NOTICE '📊 Created event_feedback table (exists: %)', feedback_table_count > 0;
    RAISE NOTICE '🔧 Created % analytics functions', analytics_functions_count;
    RAISE NOTICE '📈 Enhanced events table with creation timing fields';
    RAISE NOTICE '🗑️ Added soft delete functionality for data preservation';
    RAISE NOTICE '🔍 Added comprehensive analytics indexes for performance';
    RAISE NOTICE '⚡ Created automated analytics triggers';
    RAISE NOTICE '🎯 Ready for Phase 1 analytics implementation';
END $$;
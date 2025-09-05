-- =============================================================================
-- TrailGuide PWA - Database Functions and Triggers Migration
-- Version: 002
-- Description: Create functions, triggers, and business logic automation
-- =============================================================================

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate URL-friendly slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TIMESTAMP TRIGGERS
-- =============================================================================

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_steps_updated_at 
    BEFORE UPDATE ON steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at 
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- EVENT MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to automatically expire events
CREATE OR REPLACE FUNCTION expire_events()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE events 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'published' 
        AND expiration_date IS NOT NULL 
        AND expiration_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_events() IS 'Automatically expire published events past their expiration date';

-- Function to validate event publication
CREATE OR REPLACE FUNCTION validate_event_publication()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' THEN
        -- Check if event has at least one step
        IF NOT EXISTS (SELECT 1 FROM steps WHERE event_id = NEW.id) THEN
            RAISE EXCEPTION 'Cannot publish event without steps';
        END IF;
        
        -- Auto-generate slug if not provided
        IF NEW.slug IS NULL THEN
            NEW.slug = generate_slug(NEW.event_name);
            
            -- Ensure slug uniqueness
            DECLARE
                counter INTEGER := 0;
                base_slug TEXT := NEW.slug;
            BEGIN
                WHILE EXISTS (SELECT 1 FROM events WHERE slug = NEW.slug AND id != NEW.id) LOOP
                    counter := counter + 1;
                    NEW.slug := base_slug || '-' || counter;
                END LOOP;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_event_publication_trigger
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_publication();

-- =============================================================================
-- STEP MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to reorder steps to eliminate gaps
CREATE OR REPLACE FUNCTION reorder_event_steps(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ordered_steps AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY step_order, created_at) as new_order
        FROM steps 
        WHERE event_id = p_event_id
    )
    UPDATE steps 
    SET step_order = ordered_steps.new_order,
        updated_at = NOW()
    FROM ordered_steps 
    WHERE steps.id = ordered_steps.id
        AND steps.step_order != ordered_steps.new_order;
END;
$$ LANGUAGE plpgsql;

-- Function to validate step ordering
CREATE OR REPLACE FUNCTION validate_step_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Reorder steps after insert/update to maintain sequential order
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.step_order != OLD.step_order) THEN
        PERFORM reorder_event_steps(COALESCE(NEW.event_id, OLD.event_id));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_step_order_trigger
    AFTER INSERT OR UPDATE ON steps
    FOR EACH ROW
    EXECUTE FUNCTION validate_step_order();

-- =============================================================================
-- ANALYTICS FUNCTIONS
-- =============================================================================

-- Function to get event analytics summary
CREATE OR REPLACE FUNCTION get_event_analytics(
    p_event_id UUID,
    p_days INTEGER DEFAULT 7
) RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    completion_rate DECIMAL,
    avg_completion_time DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_views,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE completed = true)::DECIMAL / COUNT(*), 3)
            ELSE 0::DECIMAL
        END as completion_rate,
        ROUND(AVG(completion_time_seconds) FILTER (WHERE completion_time_seconds IS NOT NULL), 1) as avg_completion_time
    FROM event_views 
    WHERE event_id = p_event_id 
        AND viewed_at > NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Function to get user dashboard statistics
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
    total_events BIGINT,
    published_events BIGINT,
    total_views BIGINT,
    total_completions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_events,
        COUNT(*) FILTER (WHERE status = 'published')::BIGINT as published_events,
        COALESCE(SUM(clicks_count), 0)::BIGINT as total_views,
        COALESCE(SUM(completion_count), 0)::BIGINT as total_completions
    FROM events 
    WHERE organizer_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DATA CLEANUP FUNCTIONS
-- =============================================================================

-- Clean up expired events older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Archive events expired for more than 30 days
    UPDATE events 
    SET status = 'archived', updated_at = NOW()
    WHERE status = 'expired' 
        AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived events older than 1 year
    DELETE FROM events 
    WHERE status = 'archived' 
        AND updated_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Archived % expired events, deleted % old archived events', archived_count, deleted_count;
    RETURN archived_count + deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old analytics data (keep 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM event_views 
    WHERE viewed_at < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old analytics records', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired user sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() 
       OR (is_active = false AND last_activity_at < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % expired sessions', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ANALYTICS UPDATE TRIGGERS
-- =============================================================================

-- Update event view counts when new view is recorded
CREATE OR REPLACE FUNCTION update_event_view_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update clicks count
    UPDATE events 
    SET clicks_count = clicks_count + 1,
        updated_at = NOW()
    WHERE id = NEW.event_id;
    
    -- Update unique visitors count if new visitor
    IF NEW.visitor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM event_views 
            WHERE event_id = NEW.event_id 
              AND visitor_id = NEW.visitor_id 
              AND id != NEW.id
        ) THEN
            UPDATE events 
            SET unique_visitors_count = unique_visitors_count + 1,
                updated_at = NOW()
            WHERE id = NEW.event_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_view_counts_trigger
    AFTER INSERT ON event_views
    FOR EACH ROW
    EXECUTE FUNCTION update_event_view_counts();

-- Update step view counts
CREATE OR REPLACE FUNCTION update_step_view_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE steps 
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = NEW.step_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_step_view_counts_trigger
    AFTER INSERT ON step_views
    FOR EACH ROW
    EXECUTE FUNCTION update_step_view_counts();

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Functions and triggers migration completed successfully';
    RAISE NOTICE '🔧 Created utility functions, validation triggers, and analytics automation';
    RAISE NOTICE '📈 Analytics tracking system is now operational';
END $$;
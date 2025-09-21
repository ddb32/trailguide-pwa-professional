-- =============================================================================
-- TrailGuide PWA - Enhanced Data Validation Constraints Migration
-- Version: 009
-- Description: Add comprehensive validation constraints for data integrity
-- =============================================================================

-- Add enhanced validation constraints for events table
ALTER TABLE events ADD CONSTRAINT event_name_format 
    CHECK (event_name ~ '^[A-Za-z0-9\u0590-\u05FF\u0600-\u06FF\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\s\-_.,!?()&]+$' AND LENGTH(TRIM(event_name)) > 0);

ALTER TABLE events ADD CONSTRAINT slug_format_strict 
    CHECK (slug IS NULL OR (slug ~ '^[a-z0-9-]+$' AND slug NOT LIKE '-%' AND slug NOT LIKE '%-' AND slug NOT LIKE '%---%'));

-- Add constraint to ensure metadata JSON structure
ALTER TABLE events ADD CONSTRAINT metadata_size_limit 
    CHECK (pg_column_size(metadata) <= 8192); -- 8KB limit

-- Enhanced expiration validation with more flexible time ranges
ALTER TABLE events DROP CONSTRAINT IF EXISTS valid_expiration;
ALTER TABLE events ADD CONSTRAINT valid_expiration 
    CHECK (
        expiration_date IS NULL OR 
        (expiration_date > created_at AND expiration_date <= created_at + INTERVAL '7 days')
    );

-- Add validation for event status transitions
ALTER TABLE events ADD CONSTRAINT valid_status_transitions 
    CHECK (
        status IN ('draft', 'published', 'expired', 'archived') AND
        (status = 'published' OR expiration_date IS NULL)
    );

-- Add enhanced validation constraints for steps table
ALTER TABLE steps ADD CONSTRAINT description_content_validation 
    CHECK (LENGTH(TRIM(description)) > 0 AND LENGTH(description) <= 1000);

ALTER TABLE steps ADD CONSTRAINT image_url_format 
    CHECK (
        image_url IS NULL OR 
        image_url ~ '^\/api\/v1\/images\/[a-zA-Z0-9\-_]+\.(jpg|jpeg|png|gif|webp)$'
    );

ALTER TABLE steps ADD CONSTRAINT metadata_steps_size_limit 
    CHECK (pg_column_size(metadata) <= 4096); -- 4KB limit for steps

-- Add constraint to ensure step ordering is sequential
CREATE OR REPLACE FUNCTION check_step_ordering() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check that step_order values are sequential for an event
    IF EXISTS (
        SELECT 1 
        FROM (
            SELECT step_order, ROW_NUMBER() OVER (ORDER BY step_order) as expected_order
            FROM steps 
            WHERE event_id = NEW.event_id
        ) t 
        WHERE step_order != expected_order
    ) THEN
        RAISE EXCEPTION 'Step ordering must be sequential starting from 1';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for step ordering validation
DROP TRIGGER IF EXISTS validate_step_ordering ON steps;
CREATE TRIGGER validate_step_ordering
    AFTER INSERT OR UPDATE ON steps
    FOR EACH ROW
    EXECUTE FUNCTION check_step_ordering();

-- Add enhanced validation for user table
ALTER TABLE users ADD CONSTRAINT username_content_validation 
    CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$' AND username NOT LIKE '-%' AND username NOT LIKE '%-');

ALTER TABLE users ADD CONSTRAINT email_domain_validation 
    CHECK (
        email IS NULL OR 
        (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' AND LENGTH(email) <= 255)
    );

-- Add constraint to prevent excessive events per user
ALTER TABLE events ADD CONSTRAINT max_events_per_user 
    CHECK (
        (SELECT COUNT(*) FROM events WHERE organizer_id = organizer_id AND status != 'archived') <= 50
    );

-- Add constraint to prevent excessive steps per event
ALTER TABLE steps ADD CONSTRAINT max_steps_per_event 
    CHECK (
        (SELECT COUNT(*) FROM steps WHERE event_id = event_id) <= 50
    );

-- Add system-wide configuration validation
INSERT INTO system_config (key, value, description, is_public) 
VALUES 
    ('max_description_length', '1000', 'Maximum characters for event descriptions', false),
    ('max_location_length', '255', 'Maximum characters for event locations', false),
    ('max_step_description_length', '1000', 'Maximum characters for step descriptions', false),
    ('allowed_image_types', '["jpg", "jpeg", "png", "gif", "webp"]', 'Allowed image file extensions', false),
    ('max_image_size_bytes', '5242880', 'Maximum image file size in bytes (5MB)', false)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Create index for better performance on validation queries
CREATE INDEX IF NOT EXISTS idx_events_organizer_status_count ON events(organizer_id, status) 
    WHERE status != 'archived';

CREATE INDEX IF NOT EXISTS idx_steps_event_count ON steps(event_id);

-- Add comments for documentation
COMMENT ON CONSTRAINT event_name_format ON events IS 'Ensures event names contain only valid characters and are not empty';
COMMENT ON CONSTRAINT slug_format_strict ON events IS 'Ensures slugs follow strict format rules for URLs';
COMMENT ON CONSTRAINT valid_expiration ON events IS 'Ensures expiration dates are reasonable (within 7 days)';
COMMENT ON CONSTRAINT description_content_validation ON steps IS 'Ensures step descriptions are meaningful and within limits';
COMMENT ON CONSTRAINT image_url_format ON steps IS 'Ensures image URLs follow the expected API path format';

-- Report migration results
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced data validation constraints added successfully';
    RAISE NOTICE '🔒 Added comprehensive validation for events, steps, and users';
    RAISE NOTICE '📏 Added size limits for metadata fields';
    RAISE NOTICE '🎯 Added business logic constraints for data integrity';
    RAISE NOTICE '⚡ Added performance indexes for validation queries';
END $$;
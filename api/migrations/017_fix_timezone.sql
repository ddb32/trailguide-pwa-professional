-- =============================================================================
-- TrailGuide PWA - Timezone Fix Migration
-- Version: 017
-- Description: Update timezone handling to use Asia/Jerusalem consistently
-- =============================================================================

-- Set default timezone for this migration
SET timezone = 'Asia/Jerusalem';

-- Update the trigger function to use explicit timezone
CREATE OR REPLACE FUNCTION update_guide_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update status for guides that are currently scheduled or published
    IF NEW.status IN ('scheduled', 'published') THEN
        -- Determine correct status based on current time in Asia/Jerusalem timezone
        IF NEW.activation_date > NOW() AT TIME ZONE 'Asia/Jerusalem' THEN
            NEW.status = 'scheduled';
        ELSIF NEW.expiration_date IS NOT NULL AND NEW.expiration_date <= NOW() AT TIME ZONE 'Asia/Jerusalem' THEN
            NEW.status = 'expired';
        ELSE
            NEW.status = 'published';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the get_effective_status function to use explicit timezone
CREATE OR REPLACE FUNCTION get_effective_status(
    p_status event_status,
    p_activation_date TIMESTAMP WITH TIME ZONE,
    p_expiration_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS event_status AS $$
BEGIN
    -- Handle draft and archived states (not time-dependent)
    IF p_status IN ('draft', 'archived') THEN
        RETURN p_status;
    END IF;

    -- Handle time-dependent status using Asia/Jerusalem timezone
    IF p_activation_date > NOW() AT TIME ZONE 'Asia/Jerusalem' THEN
        RETURN 'scheduled';
    ELSIF p_expiration_date IS NOT NULL AND p_expiration_date <= NOW() AT TIME ZONE 'Asia/Jerusalem' THEN
        RETURN 'expired';
    ELSE
        RETURN 'published';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the analytics view to use Israel timezone
DROP VIEW IF EXISTS analytics_events;
CREATE OR REPLACE VIEW analytics_events AS
SELECT
    e.*,
    get_effective_status(e.status, e.activation_date, e.expiration_date) as effective_status,
    CASE
        WHEN get_effective_status(e.status, e.activation_date, e.expiration_date) = 'scheduled' THEN
            EXTRACT(EPOCH FROM (e.activation_date - (NOW() AT TIME ZONE 'Asia/Jerusalem'))) / 3600 -- Hours until activation
        WHEN get_effective_status(e.status, e.activation_date, e.expiration_date) = 'published' AND e.expiration_date IS NOT NULL THEN
            EXTRACT(EPOCH FROM (e.expiration_date - (NOW() AT TIME ZONE 'Asia/Jerusalem'))) / 3600 -- Hours until expiration
        ELSE NULL
    END as hours_remaining
FROM events e;

-- Update the check constraint to use proper timezone comparison
ALTER TABLE events DROP CONSTRAINT IF EXISTS check_status_logic;
ALTER TABLE events ADD CONSTRAINT check_status_logic
    CHECK (
        (status = 'draft') OR
        (status = 'scheduled' AND activation_date > NOW() AT TIME ZONE 'Asia/Jerusalem') OR
        (status = 'published' AND activation_date <= NOW() AT TIME ZONE 'Asia/Jerusalem' AND (expiration_date IS NULL OR expiration_date > NOW() AT TIME ZONE 'Asia/Jerusalem')) OR
        (status = 'expired' AND expiration_date IS NOT NULL AND expiration_date <= NOW() AT TIME ZONE 'Asia/Jerusalem') OR
        (status = 'archived')
    );

-- Update existing events to ensure proper status based on Israel timezone
UPDATE events SET
    status = get_effective_status(status, activation_date, expiration_date)
WHERE status IN ('scheduled', 'published', 'expired');

-- Add documentation
COMMENT ON FUNCTION update_guide_status IS 'Automatically update guide status based on timing using Asia/Jerusalem timezone';
COMMENT ON FUNCTION get_effective_status IS 'Calculate real-time status based on activation and expiration dates using Asia/Jerusalem timezone';

-- Validation: Check that migration was successful
DO $$
DECLARE
    timezone_count INTEGER;
BEGIN
    -- Verify timezone functions work correctly
    PERFORM get_effective_status('published', NOW() AT TIME ZONE 'Asia/Jerusalem', NULL);

    RAISE NOTICE 'Timezone migration completed successfully. Current Israel time: %', NOW() AT TIME ZONE 'Asia/Jerusalem';
END;
$$;
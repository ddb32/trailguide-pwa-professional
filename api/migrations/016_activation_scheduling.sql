-- =============================================================================
-- TrailGuide PWA - Activation Scheduling Migration
-- Version: 016
-- Description: Add activation_date field and update status logic for scheduled guides
-- =============================================================================

-- Add activation_date column to events table
ALTER TABLE events ADD COLUMN activation_date TIMESTAMP WITH TIME ZONE;

-- Add index for efficient activation_date queries
CREATE INDEX idx_events_activation_date ON events(activation_date);

-- Update existing events to have activation_date = created_at (backward compatibility)
UPDATE events SET activation_date = created_at WHERE activation_date IS NULL;

-- Make activation_date NOT NULL after setting values
ALTER TABLE events ALTER COLUMN activation_date SET NOT NULL;

-- Add constraint to ensure activation_date <= expiration_date when both are set
ALTER TABLE events ADD CONSTRAINT check_activation_before_expiration
    CHECK (
        expiration_date IS NULL OR
        activation_date IS NULL OR
        activation_date <= expiration_date
    );

-- Update the event_status enum to include 'scheduled' status
-- Note: PostgreSQL doesn't allow direct enum modification, so we create a new enum
-- and migrate the data

-- Create new enum with scheduled status
CREATE TYPE event_status_new AS ENUM ('draft', 'scheduled', 'published', 'expired', 'archived');

-- Add new column with new enum type
ALTER TABLE events ADD COLUMN status_new event_status_new;

-- Migrate existing status values to new enum
UPDATE events SET status_new =
    CASE
        WHEN status = 'draft' THEN 'draft'::event_status_new
        WHEN status = 'published' THEN
            CASE
                WHEN activation_date > NOW() THEN 'scheduled'::event_status_new
                WHEN expiration_date IS NOT NULL AND expiration_date <= NOW() THEN 'expired'::event_status_new
                ELSE 'published'::event_status_new
            END
        WHEN status = 'expired' THEN 'expired'::event_status_new
        WHEN status = 'archived' THEN 'archived'::event_status_new
        ELSE 'draft'::event_status_new
    END;

-- Drop old status column and constraints
ALTER TABLE events DROP COLUMN status;

-- Rename new column to status
ALTER TABLE events RENAME COLUMN status_new TO status;

-- Set default value for status
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';

-- Drop old enum type
DROP TYPE event_status;

-- Rename new enum type
ALTER TYPE event_status_new RENAME TO event_status;

-- Add comments for documentation
COMMENT ON COLUMN events.activation_date IS 'When the guide becomes active and accessible to users';
COMMENT ON COLUMN events.status IS 'Current status: draft, scheduled (waiting to activate), published (active), expired, archived';

-- Create function to automatically update guide status based on timing
CREATE OR REPLACE FUNCTION update_guide_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update status for guides that are currently scheduled or published
    IF NEW.status IN ('scheduled', 'published') THEN
        -- Determine correct status based on current time
        IF NEW.activation_date > NOW() THEN
            NEW.status = 'scheduled';
        ELSIF NEW.expiration_date IS NOT NULL AND NEW.expiration_date <= NOW() THEN
            NEW.status = 'expired';
        ELSE
            NEW.status = 'published';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update status on insert/update
CREATE TRIGGER trigger_update_guide_status
    BEFORE INSERT OR UPDATE OF activation_date, expiration_date
    ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_guide_status();

-- Create index for efficient status queries with timing
CREATE INDEX idx_events_status_timing ON events(status, activation_date, expiration_date);

-- Add check constraint to ensure logical status transitions
ALTER TABLE events ADD CONSTRAINT check_status_logic
    CHECK (
        (status = 'draft') OR
        (status = 'scheduled' AND activation_date > NOW()) OR
        (status = 'published' AND activation_date <= NOW() AND (expiration_date IS NULL OR expiration_date > NOW())) OR
        (status = 'expired' AND expiration_date IS NOT NULL AND expiration_date <= NOW()) OR
        (status = 'archived')
    );

-- Create function to get current effective status (for API queries)
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

    -- Handle time-dependent status
    IF p_activation_date > NOW() THEN
        RETURN 'scheduled';
    ELSIF p_expiration_date IS NOT NULL AND p_expiration_date <= NOW() THEN
        RETURN 'expired';
    ELSE
        RETURN 'published';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for public API queries (excludes scheduled guides)
CREATE OR REPLACE VIEW public_events AS
SELECT
    e.*,
    get_effective_status(e.status, e.activation_date, e.expiration_date) as effective_status
FROM events e
WHERE get_effective_status(e.status, e.activation_date, e.expiration_date) IN ('published', 'expired');

-- Grant appropriate permissions
GRANT SELECT ON public_events TO PUBLIC;

-- Add documentation
COMMENT ON VIEW public_events IS 'Public view of events excluding draft, scheduled, and archived guides';
COMMENT ON FUNCTION get_effective_status IS 'Calculate real-time status based on activation and expiration dates';
COMMENT ON FUNCTION update_guide_status IS 'Automatically update guide status based on timing when activation/expiration dates change';

-- Update existing analytics queries to handle new status
-- This ensures existing analytics continue to work correctly
CREATE OR REPLACE VIEW analytics_events AS
SELECT
    e.*,
    get_effective_status(e.status, e.activation_date, e.expiration_date) as effective_status,
    CASE
        WHEN get_effective_status(e.status, e.activation_date, e.expiration_date) = 'scheduled' THEN
            EXTRACT(EPOCH FROM (e.activation_date - NOW())) / 3600 -- Hours until activation
        WHEN get_effective_status(e.status, e.activation_date, e.expiration_date) = 'published' AND e.expiration_date IS NOT NULL THEN
            EXTRACT(EPOCH FROM (e.expiration_date - NOW())) / 3600 -- Hours until expiration
        ELSE NULL
    END as hours_remaining
FROM events e;

COMMENT ON VIEW analytics_events IS 'Analytics view with effective status and time calculations for scheduled guides';

-- Final status update for all existing events to ensure consistency
UPDATE events SET
    status = get_effective_status(status, activation_date, expiration_date)
WHERE status IN ('scheduled', 'published', 'expired');

-- Validation: Check that migration was successful
DO $$
DECLARE
    activation_count INTEGER;
    status_count INTEGER;
BEGIN
    -- Count events with activation_date set
    SELECT COUNT(*) INTO activation_count FROM events WHERE activation_date IS NOT NULL;

    -- Count events with valid statuses
    SELECT COUNT(*) INTO status_count FROM events WHERE status IN ('draft', 'scheduled', 'published', 'expired', 'archived');

    -- Verify migration success
    IF activation_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: No activation_date values set';
    END IF;

    IF status_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: No valid status values found';
    END IF;

    RAISE NOTICE 'Migration completed successfully: % events have activation_date, % events have valid status', activation_count, status_count;
END;
$$;
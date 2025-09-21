-- =============================================================================
-- TrailGuide PWA - Fix Cover Image Upload Trigger Conflict
-- Version: 010
-- Description: Fix trigger to only validate steps when status changes to published
-- =============================================================================

-- Update the trigger function to only validate when status actually changes to published
CREATE OR REPLACE FUNCTION validate_event_publication()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate when status is actually being changed TO published
    -- Not when updating other fields of an already published event
    IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status != 'published') THEN
        -- Check if event has at least one step only when transitioning to published
        IF NOT EXISTS (SELECT 1 FROM steps WHERE event_id = NEW.id) THEN
            RAISE EXCEPTION 'Cannot publish event without steps';
        END IF;

        -- Auto-generate slug if not provided (only when publishing)
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

COMMENT ON FUNCTION validate_event_publication() IS 'Validates event publication only when status changes to published, not on other updates';

-- Report fix completion
DO $$
BEGIN
    RAISE NOTICE '✅ Cover image trigger conflict fixed';
    RAISE NOTICE '🔧 Updated validate_event_publication() function';
    RAISE NOTICE '📝 Cover image uploads will no longer trigger step validation for already published events';
END $$;
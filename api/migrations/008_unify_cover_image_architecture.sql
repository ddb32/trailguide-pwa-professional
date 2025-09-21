-- =============================================================================
-- TrailGuide PWA - Cover Image Architecture Unification Migration
-- Version: 008
-- Description: Unify cover image storage to match step image architecture
-- =============================================================================

-- Add dedicated cover image columns to match steps table pattern
ALTER TABLE events 
ADD COLUMN cover_image_url VARCHAR(1000),
ADD COLUMN cover_image_alt VARCHAR(500);

-- Add indexes for performance (matching steps table pattern)
CREATE INDEX idx_events_cover_image ON events(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- Migrate existing cover images from metadata to dedicated columns
UPDATE events 
SET 
    cover_image_url = CASE 
        WHEN metadata->>'cover_image' IS NOT NULL 
        THEN '/api/v1/images/' || (metadata->>'cover_image')
        ELSE NULL 
    END,
    cover_image_alt = CASE 
        WHEN metadata->>'cover_image' IS NOT NULL 
        THEN event_name || ' cover image'
        ELSE NULL 
    END
WHERE metadata->>'cover_image' IS NOT NULL;

-- Remove cover image data from metadata JSON to avoid confusion
UPDATE events 
SET metadata = metadata - 'cover_image' - 'cover_image_original' - 'cover_image_updated_at'
WHERE metadata ? 'cover_image';

-- Add comments for documentation
COMMENT ON COLUMN events.cover_image_url IS 'Cover image URL path (unified with steps.image_url pattern)';
COMMENT ON COLUMN events.cover_image_alt IS 'Cover image alt text for accessibility (unified with steps.image_alt pattern)';

-- Report migration results
DO $$
DECLARE
    migrated_count INTEGER;
    total_events INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM events WHERE cover_image_url IS NOT NULL;
    SELECT COUNT(*) INTO total_events FROM events;
    
    RAISE NOTICE '✅ Cover image architecture unification completed';
    RAISE NOTICE '📊 Migrated % cover images from % total events', migrated_count, total_events;
    RAISE NOTICE '🏗️ Added cover_image_url and cover_image_alt columns to events table';
    RAISE NOTICE '🧹 Cleaned up metadata JSON fields';
    RAISE NOTICE '🔗 Cover images now use identical storage pattern as step images';
END $$;
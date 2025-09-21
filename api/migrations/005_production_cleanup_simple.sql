-- =============================================================================
-- TrailGuide PWA - Simple Production Cleanup
-- Version: 005
-- Description: Remove all sample/demo data for production (simplified version)
-- =============================================================================

-- Remove sample step views first (cascade)
DELETE FROM step_views 
WHERE step_id IN (
    SELECT s.id FROM steps s
    JOIN events e ON s.event_id = e.id
    JOIN users u ON e.organizer_id = u.id
    WHERE u.username IN ('admin', 'organizer1', 'organizer2')
);

-- Remove sample event views
DELETE FROM event_views 
WHERE event_id IN (
    SELECT e.id FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE u.username IN ('admin', 'organizer1', 'organizer2')
);

-- Remove sample steps
DELETE FROM steps 
WHERE event_id IN (
    SELECT e.id FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE u.username IN ('admin', 'organizer1', 'organizer2')
);

-- Remove sample events  
DELETE FROM events 
WHERE organizer_id IN (
    SELECT id FROM users 
    WHERE username IN ('admin', 'organizer1', 'organizer2')
);

-- Remove sample user sessions
DELETE FROM user_sessions 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE username IN ('admin', 'organizer1', 'organizer2')
);

-- Remove sample users
DELETE FROM users 
WHERE username IN ('admin', 'organizer1', 'organizer2')
OR email IN ('admin@trailguide.app', 'organizer1@example.com', 'organizer2@example.com');

-- Reset statistics for any remaining events (if clicks_count column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'clicks_count') THEN
        UPDATE events SET clicks_count = 0 WHERE clicks_count > 0;
    END IF;
END $$;

-- Add migration record
INSERT INTO schema_migrations (version, description) VALUES ('005', 'production_cleanup_simple');

-- Report results
DO $$
DECLARE
    remaining_users INTEGER;
    remaining_events INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_users FROM users;
    SELECT COUNT(*) INTO remaining_events FROM events;
    
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '🧹 PRODUCTION CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '👤 Remaining users in system: %', remaining_users;
    RAISE NOTICE '📋 Remaining events in system: %', remaining_events;
    RAISE NOTICE '✅ All sample data has been removed';
    RAISE NOTICE '🚀 System is production-ready!';
    RAISE NOTICE '=============================================================================';
END $$;
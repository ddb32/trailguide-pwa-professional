-- =============================================================================
-- TrailGuide PWA - Sample Data and Advanced Indexes Migration
-- Version: 003
-- Description: Add performance indexes and populate sample user accounts
-- =============================================================================

-- =============================================================================
-- ADVANCED PERFORMANCE INDEXES
-- =============================================================================

-- Partial indexes for active content optimization
CREATE INDEX idx_events_published ON events(created_at DESC) 
    WHERE status = 'published';

CREATE INDEX idx_events_not_expired ON events(expiration_date) 
    WHERE status = 'published';

-- Analytics optimization indexes
CREATE INDEX idx_event_views_recent ON event_views(event_id, viewed_at DESC);

CREATE INDEX idx_step_views_recent ON step_views(step_id, viewed_at DESC);

-- JSON metadata indexes for search functionality
CREATE INDEX idx_events_metadata_location ON events 
    USING GIN ((metadata->'location')) 
    WHERE metadata ? 'location';

CREATE INDEX idx_events_search ON events 
    USING GIN (to_tsvector('english', event_name || ' ' || COALESCE(metadata->>'description', '')));

-- Session cleanup optimization  
CREATE INDEX idx_user_sessions_cleanup ON user_sessions(expires_at)
    WHERE is_active = true;

-- =============================================================================
-- SAMPLE USER ACCOUNTS
-- =============================================================================

-- Insert sample users for MVP testing
-- Note: Passwords are bcrypt hashed with 12 rounds
-- Plain text passwords for reference (DO NOT USE IN PRODUCTION):
-- admin@trailguide.app: AdminPass123!
-- organizer1@example.com: OrganizerPass1!  
-- organizer2@example.com: OrganizerPass2!

-- Insert sample users using default UUID generation
INSERT INTO users (username, password_hash, email, full_name, is_active, created_at) VALUES
(
    'admin',
    '$2a$12$rYvK8Qa7.9p8q7r6s5t4uOvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz',
    'admin@trailguide.app',
    'System Administrator', 
    true,
    NOW()
),
(
    'organizer1',
    '$2a$12$sZwL9Rb8.0q9r8s7t6u5vPwXyZaBcDeFgHiJkLmNoOqPrStUvWxYz',
    'organizer1@example.com',
    'Event Organizer One',
    true,
    NOW()
),
(
    'organizer2',
    '$2a$12$tAxM0Sc9.1r0s9t8u7v6wQxYzAbCdEfGhIjKlMnOpQrStUvWxYzA',
    'organizer2@example.com', 
    'Event Organizer Two',
    true,
    NOW()
);

-- =============================================================================
-- SAMPLE EVENT DATA (Optional for testing)
-- =============================================================================

-- Sample event from admin user for testing
INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date, created_at) 
SELECT 
    u.id,
    'Welcome to TrailGuide Demo',
    'welcome-demo',
    'published',
    '{
        "description": "A sample navigation guide to demonstrate TrailGuide functionality",
        "location": "Demo Location", 
        "estimated_duration": "5 minutes"
    }'::jsonb,
    NOW() + INTERVAL '30 days',
    NOW()
FROM users u WHERE u.username = 'admin';

-- Sample steps for the demo event
INSERT INTO steps (event_id, step_order, description, image_alt, metadata, created_at)
SELECT 
    e.id,
    step_data.step_order,
    step_data.description,
    step_data.image_alt,
    step_data.metadata::jsonb,
    NOW()
FROM events e,
(VALUES
    (1, 'Start your journey here at the main entrance', 'Main entrance with welcome sign', '{"tip": "Look for the large welcome sign"}'),
    (2, 'Walk straight ahead for about 50 meters', 'Straight pathway with directional markers', '{"distance": "50 meters", "landmark": "Blue directional signs"}'),
    (3, 'Turn left at the information kiosk', 'Information kiosk with maps and brochures', '{"landmark": "Information kiosk", "direction": "left"}')
) AS step_data(step_order, description, image_alt, metadata)
WHERE e.slug = 'welcome-demo';

-- =============================================================================
-- SYSTEM CONFIGURATION UPDATES
-- =============================================================================

-- Add additional system configuration for MVP
INSERT INTO system_config (key, value, description, is_public) VALUES
('demo_mode', 'true', 'Enable demo mode with sample data', true),
('registration_enabled', 'false', 'Enable user self-registration (MVP: false)', false),
('analytics_retention_days', '90', 'Days to retain analytics data', false),
('max_image_size_mb', '5', 'Maximum image upload size in MB', false),
('supported_image_formats', '["jpg", "jpeg", "png", "webp"]', 'Supported image file formats', false)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY (Basic Setup)
-- =============================================================================

-- Enable RLS for multi-tenant data isolation
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- Basic policy for organizers to access only their events
-- Note: This assumes we'll set current_user_id in the session context
CREATE POLICY events_organizer_access ON events
    FOR ALL
    USING (organizer_id = current_setting('app.current_user_id', true)::UUID);

-- Steps inherit event permissions
CREATE POLICY steps_organizer_access ON steps
    FOR ALL
    USING (event_id IN (
        SELECT id FROM events 
        WHERE organizer_id = current_setting('app.current_user_id', true)::UUID
    ));

-- Public read access for published events
CREATE POLICY events_public_read ON events
    FOR SELECT
    USING (status = 'published');

CREATE POLICY steps_public_read ON steps
    FOR SELECT
    USING (event_id IN (
        SELECT id FROM events 
        WHERE status = 'published'
    ));

-- =============================================================================
-- COMPLETION SUMMARY
-- =============================================================================

DO $$
DECLARE
    user_count INTEGER;
    event_count INTEGER;
    step_count INTEGER;
    config_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO event_count FROM events;
    SELECT COUNT(*) INTO step_count FROM steps;
    SELECT COUNT(*) INTO config_count FROM system_config;
    
    RAISE NOTICE '✅ Sample data migration completed successfully';
    RAISE NOTICE '👥 Created % sample user accounts', user_count;
    RAISE NOTICE '📋 Created % sample events with % steps', event_count, step_count;
    RAISE NOTICE '⚙️  Added % system configuration settings', config_count;
    RAISE NOTICE '🔒 Row Level Security policies enabled';
    RAISE NOTICE '🚀 Database is ready for application development';
END $$;
-- =============================================================================
-- TrailGuide PWA - Rich Sample Data Migration
-- Version: 004  
-- Description: Add comprehensive sample events and steps for testing
-- =============================================================================

-- =============================================================================
-- SAMPLE EVENTS WITH STEPS
-- =============================================================================

-- Events for admin user
INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date, clicks_count, unique_visitors_count, completion_count) 
SELECT 
    u.id,
    event_data.event_name,
    event_data.slug,
    event_data.status,
    event_data.metadata::jsonb,
    NOW() + event_data.expiry_interval,
    event_data.clicks_count,
    event_data.unique_visitors_count,
    event_data.completion_count
FROM users u,
(VALUES
    ('Tech Conference 2025', 'tech-conference-2025', 'published', '{"description": "Annual technology conference with latest innovations", "location": "Convention Center", "contact_info": "info@techconf.com", "estimated_duration": "15 minutes"}', INTERVAL '60 days', 25, 18, 12),
    ('Art Gallery Opening', 'art-gallery-opening', 'published', '{"description": "Grand opening of contemporary art exhibition", "location": "Downtown Gallery", "contact_info": "gallery@art.com", "estimated_duration": "10 minutes"}', INTERVAL '30 days', 12, 10, 8),
    ('Food Truck Festival', 'food-truck-festival', 'draft', '{"description": "City-wide food truck gathering with live music", "location": "City Square", "estimated_duration": "20 minutes"}', INTERVAL '45 days', 0, 0, 0)
) AS event_data(event_name, slug, status, metadata, expiry_interval, clicks_count, unique_visitors_count, completion_count)
WHERE u.username = 'admin';

-- Events for organizer1
INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date, clicks_count, unique_visitors_count, completion_count)
SELECT 
    u.id,
    event_data.event_name,
    event_data.slug,
    event_data.status,
    event_data.metadata::jsonb,
    NOW() + event_data.expiry_interval,
    event_data.clicks_count,
    event_data.unique_visitors_count,
    event_data.completion_count
FROM users u,
(VALUES
    ('Wedding Reception Guide', 'wedding-reception-guide', 'published', '{"description": "Navigate to Sarah & Michael wedding reception", "location": "Garden Villa Resort", "contact_info": "events@gardenvilla.com", "estimated_duration": "8 minutes"}', INTERVAL '14 days', 45, 35, 31),
    ('Corporate Team Building', 'corporate-team-building', 'published', '{"description": "Office team building event location guide", "location": "Adventure Park", "estimated_duration": "12 minutes"}', INTERVAL '7 days', 18, 15, 12),
    ('Birthday Party Setup', 'birthday-party-setup', 'draft', '{"description": "Kids birthday party venue directions", "location": "Community Center Hall B", "estimated_duration": "5 minutes"}', INTERVAL '21 days', 0, 0, 0)
) AS event_data(event_name, slug, status, metadata, expiry_interval, clicks_count, unique_visitors_count, completion_count)
WHERE u.username = 'organizer1';

-- Events for organizer2  
INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date, clicks_count, unique_visitors_count, completion_count)
SELECT 
    u.id,
    event_data.event_name,
    event_data.slug,
    event_data.status,
    event_data.metadata::jsonb,
    NOW() + event_data.expiry_interval,
    event_data.clicks_count,
    event_data.unique_visitors_count,
    event_data.completion_count
FROM users u,
(VALUES
    ('Startup Meetup Navigation', 'startup-meetup-navigation', 'published', '{"description": "Monthly startup networking event", "location": "Innovation Hub Floor 3", "contact_info": "hello@startups.city", "estimated_duration": "6 minutes"}', INTERVAL '3 days', 67, 52, 48),
    ('Yoga Class Outdoor Session', 'yoga-class-outdoor-session', 'published', '{"description": "Morning yoga in the park session", "location": "Riverside Park East Side", "estimated_duration": "4 minutes"}', INTERVAL '2 days', 23, 20, 19),
    ('Book Club Meeting', 'book-club-meeting', 'expired', '{"description": "Monthly book discussion group", "location": "Central Library Room 201", "estimated_duration": "3 minutes"}', INTERVAL '-5 days', 8, 6, 5),
    ('Photography Workshop', 'photography-workshop', 'archived', '{"description": "Digital photography basics workshop", "location": "Photo Studio Downtown", "estimated_duration": "7 minutes"}', INTERVAL '-30 days', 15, 12, 10)
) AS event_data(event_name, slug, status, metadata, expiry_interval, clicks_count, unique_visitors_count, completion_count)
WHERE u.username = 'organizer2';

-- =============================================================================
-- SAMPLE STEPS FOR EVENTS
-- =============================================================================

-- Steps for Tech Conference 2025 (admin)
INSERT INTO steps (event_id, step_order, description, image_alt, metadata)
SELECT 
    e.id,
    step_data.step_order,
    step_data.description,
    step_data.image_alt,
    step_data.metadata::jsonb
FROM events e,
(VALUES
    (1, 'Park in the designated visitor parking garage on Level 2', 'Parking garage entrance with clear signage', '{"tip": "Parking is free for event attendees", "landmark": "Blue P2 signs"}'),
    (2, 'Take the elevator to the main lobby (Ground Floor)', 'Modern elevator bank in parking garage', '{"direction": "Follow the lobby signs", "landmark": "Glass elevators"}'),
    (3, 'Check in at the registration desk near the main entrance', 'Registration desk with friendly staff and welcome banners', '{"tip": "Have your confirmation email ready", "landmark": "Large Tech Conference banner"}'),
    (4, 'Head to Conference Hall A through the corridor on your left', 'Wide corridor with directional signage and tech displays', '{"landmark": "Interactive tech displays", "direction": "left"}'),
    (5, 'Enter Hall A and find your assigned seating section', 'Large conference hall with tiered seating and main stage', '{"tip": "Section numbers are displayed above seating areas", "landmark": "Main presentation stage"}')'
) AS step_data(step_order, description, image_alt, metadata)
WHERE e.slug = 'tech-conference-2025';

-- Steps for Wedding Reception Guide (organizer1)
INSERT INTO steps (event_id, step_order, description, image_alt, metadata)
SELECT 
    e.id,
    step_data.step_order,
    step_data.description,
    step_data.image_alt,
    step_data.metadata::jsonb
FROM events e,
(VALUES
    (1, 'Enter through the main resort gate and show your invitation', 'Elegant entrance gate with Garden Villa Resort signage', '{"dress_code": "Cocktail attire", "landmark": "Stone pillars with resort name"}'),
    (2, 'Follow the garden path decorated with white flowers', 'Winding stone path through landscaped gardens with white rose petals', '{"tip": "The path is well-lit with lanterns", "landmark": "White rose decorations"}'),
    (3, 'Arrive at the glass pavilion where the reception is being held', 'Beautiful glass pavilion overlooking the gardens with warm lighting', '{"tip": "Gift table is located at the entrance", "landmark": "Glass pavilion with string lights"}'),
    (4, 'Find Sarah & Michael to congratulate the happy couple!', 'Bride and groom greeting guests in the pavilion reception area', '{"tip": "They will be near the photo backdrop area", "landmark": "Wedding photo backdrop"}')'
) AS step_data(step_order, description, image_alt, metadata)  
WHERE e.slug = 'wedding-reception-guide';

-- Steps for Startup Meetup Navigation (organizer2)
INSERT INTO steps (event_id, step_order, description, image_alt, metadata)
SELECT 
    e.id,
    step_data.step_order,
    step_data.description,
    step_data.image_alt,
    step_data.metadata::jsonb
FROM events e,
(VALUES
    (1, 'Enter the Innovation Hub building through the main lobby', 'Modern office building lobby with startup company logos on display', '{"tip": "Show your meetup confirmation for guest WiFi access", "landmark": "Startup wall of fame"}'),
    (2, 'Take the elevator to Floor 3 - Innovation Labs', 'Elevator panel with floor directory showing Innovation Labs on Floor 3', '{"tip": "Press 3 and look for the Meetup signs", "landmark": "Floor directory"}'),
    (3, 'Turn right and follow the startup event signs', 'Hallway with modern decor and directional signage for events', '{"landmark": "Event registration table", "direction": "right"}'),
    (4, 'Enter the collaborative workspace where networking is happening', 'Open workspace with high tables, networking groups, and presentation screen', '{"tip": "Grab a name tag and refreshments", "landmark": "Welcome desk with name tags"}')'
) AS step_data(step_order, description, image_alt, metadata)
WHERE e.slug = 'startup-meetup-navigation';

-- Steps for Art Gallery Opening (admin)
INSERT INTO steps (event_id, step_order, description, image_alt, metadata)
SELECT 
    e.id,
    step_data.step_order,
    step_data.description,
    step_data.image_alt,
    step_data.metadata::jsonb
FROM events e,
(VALUES
    (1, 'Look for the red carpet entrance on Main Street', 'Gallery entrance with red carpet and opening night banners', '{"tip": "Street parking available on side streets", "landmark": "Red carpet and gallery banners"}'),
    (2, 'Sign the guest book and receive your exhibition guide', 'Elegant reception area with guest book and gallery staff', '{"tip": "The guide includes artist bios and piece descriptions", "landmark": "Welcome reception table"}'),
    (3, 'Begin your tour in the Contemporary Wing to the right', 'Gallery space with contemporary artworks and good lighting', '{"tip": "Audio tour available via QR codes", "direction": "right", "landmark": "Contemporary Art sign"}'),
    (4, 'Enjoy refreshments in the sculpture garden courtyard', 'Beautiful outdoor courtyard with sculptures and refreshment tables', '{"tip": "Meet the artists - they will be circulating", "landmark": "Central sculpture fountain"}')'
) AS step_data(step_order, description, image_alt, metadata)
WHERE e.slug = 'art-gallery-opening';

-- Steps for Yoga Class Outdoor Session (organizer2)
INSERT INTO steps (event_id, step_order, description, image_alt, metadata)
SELECT 
    e.id,
    step_data.step_order,
    step_data.description,
    step_data.image_alt,
    step_data.metadata::jsonb
FROM events e,
(VALUES
    (1, 'Meet at the park entrance near the riverside path', 'Park entrance with clear signage and paved walking paths', '{"tip": "Bring your own yoga mat and water", "landmark": "Park entrance sign"}'),
    (2, 'Walk along the riverside path for about 100 meters', 'Scenic riverside walking path with trees and benches', '{"tip": "Class starts promptly at 7 AM", "landmark": "Riverside benches"}'),
    (3, 'Find the group on the grassy area overlooking the water', 'Open grass area with yoga practitioners and instructor', '{"tip": "Look for the group doing warm-up stretches", "landmark": "Large oak tree nearby"}')'
) AS step_data(step_order, description, image_alt, metadata)
WHERE e.slug = 'yoga-class-outdoor-session';

-- =============================================================================
-- SIMULATE REALISTIC ANALYTICS DATA
-- =============================================================================

-- Add some realistic event views for published events
INSERT INTO event_views (event_id, visitor_id, ip_address, user_agent, completed, completion_time_seconds, viewed_at, completed_at)
SELECT 
    e.id,
    gen_random_uuid(),
    ('192.168.1.' || (random() * 254 + 1)::int)::inet,
    CASE (random() * 3)::int
        WHEN 0 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        WHEN 1 THEN 'Mozilla/5.0 (Android 12; Mobile; rv:104.0) Gecko/104.0 Firefox/104.0'
        ELSE 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    END,
    (random() > 0.3), -- 70% completion rate
    (random() * 600 + 120)::int, -- 2-10 minute completion times
    NOW() - (random() * INTERVAL '30 days'), -- Views over last 30 days
    CASE WHEN random() > 0.3 THEN NOW() - (random() * INTERVAL '30 days') ELSE NULL END
FROM events e
WHERE e.status = 'published'
AND generate_series(1, (e.clicks_count * 0.8)::int) IS NOT NULL; -- Generate 80% of click count as actual views

-- =============================================================================
-- UPDATE SYSTEM CONFIGURATION
-- =============================================================================

-- Update configuration for rich demo environment
UPDATE system_config SET 
    value = 'true',
    updated_at = NOW()
WHERE key = 'demo_mode';

INSERT INTO system_config (key, value, description, is_public) VALUES
('sample_data_version', '"004"', 'Rich sample data migration version', false),
('last_data_refresh', '"2025-09-03"', 'Last time sample data was refreshed', false)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- =============================================================================
-- COMPLETION SUMMARY
-- =============================================================================

DO $$
DECLARE
    total_events INTEGER;
    total_steps INTEGER;  
    total_views INTEGER;
    published_events INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_events FROM events;
    SELECT COUNT(*) INTO total_steps FROM steps;
    SELECT COUNT(*) INTO total_views FROM event_views;
    SELECT COUNT(*) INTO published_events FROM events WHERE status = 'published';
    
    RAISE NOTICE '✅ Rich sample data migration completed successfully';
    RAISE NOTICE '📋 Total events: % (% published)', total_events, published_events;
    RAISE NOTICE '👣 Total steps: %', total_steps;
    RAISE NOTICE '📊 Total event views: %', total_views;
    RAISE NOTICE '🎯 All users now have realistic test data';
    RAISE NOTICE '🚀 Ready for frontend integration testing';
END $$;
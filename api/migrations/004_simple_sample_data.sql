-- =============================================================================
-- TrailGuide PWA - Simple Rich Sample Data  
-- Version: 004
-- Description: Add sample events and steps for testing
-- =============================================================================

-- Get user IDs for reference
DO $$
DECLARE
    admin_id UUID;
    org1_id UUID;
    org2_id UUID;
    event1_id UUID;
    event2_id UUID;
    event3_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO admin_id FROM users WHERE username = 'admin';
    SELECT id INTO org1_id FROM users WHERE username = 'organizer1'; 
    SELECT id INTO org2_id FROM users WHERE username = 'organizer2';

    -- Insert events for admin user
    INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date) VALUES
    (admin_id, 'Tech Conference 2025', 'tech-conference-2025', 'published', '{"description": "Annual technology conference", "location": "Convention Center"}', NOW() + INTERVAL '60 days'),
    (admin_id, 'Art Gallery Opening', 'art-gallery-opening', 'published', '{"description": "Contemporary art exhibition", "location": "Downtown Gallery"}', NOW() + INTERVAL '30 days'),
    (admin_id, 'Food Truck Festival', 'food-truck-festival', 'draft', '{"description": "City food truck gathering", "location": "City Square"}', NOW() + INTERVAL '45 days');

    -- Insert events for organizer1  
    INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date) VALUES
    (org1_id, 'Wedding Reception Guide', 'wedding-reception-guide', 'published', '{"description": "Wedding reception directions", "location": "Garden Villa Resort"}', NOW() + INTERVAL '14 days'),
    (org1_id, 'Corporate Team Building', 'corporate-team-building', 'published', '{"description": "Team building event", "location": "Adventure Park"}', NOW() + INTERVAL '7 days'),
    (org1_id, 'Birthday Party Setup', 'birthday-party-setup', 'draft', '{"description": "Kids birthday party venue", "location": "Community Center"}', NOW() + INTERVAL '21 days');

    -- Insert events for organizer2
    INSERT INTO events (organizer_id, event_name, slug, status, metadata, expiration_date) VALUES  
    (org2_id, 'Startup Meetup Navigation', 'startup-meetup-navigation', 'published', '{"description": "Monthly startup networking", "location": "Innovation Hub"}', NOW() + INTERVAL '3 days'),
    (org2_id, 'Yoga Class Outdoor Session', 'yoga-class-outdoor-session', 'published', '{"description": "Morning yoga in the park", "location": "Riverside Park"}', NOW() + INTERVAL '2 days'),
    (org2_id, 'Book Club Meeting', 'book-club-meeting', 'expired', '{"description": "Book discussion group", "location": "Central Library"}', NULL);

    -- Get event IDs for adding steps
    SELECT id INTO event1_id FROM events WHERE slug = 'tech-conference-2025';
    SELECT id INTO event2_id FROM events WHERE slug = 'wedding-reception-guide';
    SELECT id INTO event3_id FROM events WHERE slug = 'startup-meetup-navigation';

    -- Add steps for Tech Conference
    INSERT INTO steps (event_id, step_order, description, metadata) VALUES
    (event1_id, 1, 'Park in the designated visitor parking garage on Level 2', '{"landmark": "Blue P2 signs"}'),
    (event1_id, 2, 'Take the elevator to the main lobby (Ground Floor)', '{"landmark": "Glass elevators"}'),  
    (event1_id, 3, 'Check in at the registration desk near the main entrance', '{"landmark": "Tech Conference banner"}'),
    (event1_id, 4, 'Head to Conference Hall A through the corridor on your left', '{"direction": "left"}'),
    (event1_id, 5, 'Enter Hall A and find your assigned seating section', '{"landmark": "Main presentation stage"}');

    -- Add steps for Wedding Reception
    INSERT INTO steps (event_id, step_order, description, metadata) VALUES
    (event2_id, 1, 'Enter through the main resort gate and show your invitation', '{"landmark": "Stone pillars"}'),
    (event2_id, 2, 'Follow the garden path decorated with white flowers', '{"landmark": "White rose decorations"}'),
    (event2_id, 3, 'Arrive at the glass pavilion where the reception is being held', '{"landmark": "Glass pavilion"}'),
    (event2_id, 4, 'Find Sarah & Michael to congratulate the happy couple!', '{"landmark": "Photo backdrop"}');

    -- Add steps for Startup Meetup  
    INSERT INTO steps (event_id, step_order, description, metadata) VALUES
    (event3_id, 1, 'Enter the Innovation Hub building through the main lobby', '{"landmark": "Startup wall of fame"}'),
    (event3_id, 2, 'Take the elevator to Floor 3 - Innovation Labs', '{"landmark": "Floor directory"}'),
    (event3_id, 3, 'Turn right and follow the startup event signs', '{"direction": "right"}'),
    (event3_id, 4, 'Enter the collaborative workspace where networking is happening', '{"landmark": "Welcome desk"}');

    -- Update click counts to simulate usage
    UPDATE events SET clicks_count = 25, unique_visitors_count = 18, completion_count = 12 WHERE slug = 'tech-conference-2025';
    UPDATE events SET clicks_count = 45, unique_visitors_count = 35, completion_count = 31 WHERE slug = 'wedding-reception-guide';
    UPDATE events SET clicks_count = 67, unique_visitors_count = 52, completion_count = 48 WHERE slug = 'startup-meetup-navigation';

    RAISE NOTICE '✅ Rich sample data created successfully';
    RAISE NOTICE '📋 Created 9 events with steps across all users';
    RAISE NOTICE '🚀 Ready for API testing and frontend integration';
END $$;
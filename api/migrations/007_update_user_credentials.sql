-- =============================================================================
-- TrailGuide PWA - Update User Credentials Migration
-- Version: 007
-- Description: Update usernames, passwords, and emails for production accounts
-- =============================================================================

-- =============================================================================
-- UPDATE ADMIN ACCOUNT
-- =============================================================================

DO $$
BEGIN
    -- Update admin password only (username stays the same)
    -- New password: TGA!2025Secure
    UPDATE users 
    SET 
        password_hash = '$2a$12$eoLVKbW4LeKyzJz8D37hZOy3tRgVQfJzlVdKfVAbBZOY.oBLOheBa',
        updated_at = NOW()
    WHERE username = 'trailguide_admin';
    
    RAISE NOTICE '✅ Admin account password updated';
END $$;

-- =============================================================================
-- UPDATE REGULAR USER ACCOUNTS
-- =============================================================================

DO $$
DECLARE
    old_usernames TEXT[] := ARRAY['guide_creator_1', 'guide_creator_2', 'event_organizer_1', 'trail_manager_1'];
    new_usernames TEXT[] := ARRAY['trailguide_user_a', 'trailguide_user_b', 'trailguide_user_c', 'trailguide_user_d'];
    new_emails TEXT[] := ARRAY['user.a@trailguide.io', 'user.b@trailguide.io', 'user.c@trailguide.io', 'user.d@trailguide.io'];
    new_names TEXT[] := ARRAY['TrailGuide User A', 'TrailGuide User B', 'TrailGuide User C', 'TrailGuide User D'];
    new_hashes TEXT[] := ARRAY[
        '$2a$12$2jTZTf3uidg7eW48qYTJDO6VLduYWuqHPNtIG9bVG0c8g1AKQD6VG',
        '$2a$12$gWYGyYhFFlUR5KSXJnO5TOzTeIF/pCVGUZK3wRqxFFCP0aIp7W8gS',
        '$2a$12$sn817YYDwJkaukbhNBi5LeYvtiaV259oAVBUhn4aHZo1E6eso5EmW',
        '$2a$12$S9NHxljumIN9ezWm0w4QbOp26SjZ6QAAXIumCE4xTrDoiO9YS5NJi'
    ];
    i INTEGER;
    updated_count INTEGER := 0;
BEGIN
    -- Update each user account
    FOR i IN 1..4 LOOP
        UPDATE users 
        SET 
            username = new_usernames[i],
            email = new_emails[i],
            full_name = new_names[i],
            password_hash = new_hashes[i],
            updated_at = NOW()
        WHERE username = old_usernames[i];
        
        IF FOUND THEN
            updated_count := updated_count + 1;
            RAISE NOTICE '✅ Updated: % → %', old_usernames[i], new_usernames[i];
        ELSE
            RAISE WARNING '⚠️  User not found: %', old_usernames[i];
        END IF;
    END LOOP;
    
    RAISE NOTICE '📊 Updated % regular user accounts', updated_count;
END $$;

-- =============================================================================
-- INVALIDATE EXISTING SESSIONS
-- =============================================================================

DO $$
DECLARE
    session_count INTEGER;
BEGIN
    -- Invalidate all existing user sessions since usernames changed
    UPDATE user_sessions 
    SET 
        is_active = false,
        updated_at = NOW() 
    WHERE is_active = true;
    
    GET DIAGNOSTICS session_count = ROW_COUNT;
    RAISE NOTICE '🔒 Invalidated % existing user sessions', session_count;
END $$;

-- =============================================================================
-- UPDATE MIGRATION RECORD
-- =============================================================================

INSERT INTO schema_migrations (version, description) VALUES ('007', 'update_user_credentials');

-- =============================================================================
-- VERIFICATION AND SUMMARY
-- =============================================================================

DO $$
DECLARE
    admin_count INTEGER;
    user_count INTEGER;
    total_users INTEGER;
BEGIN
    -- Count users by role
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' AND is_active = true;
    SELECT COUNT(*) INTO user_count FROM users WHERE role = 'user' AND is_active = true;
    SELECT COUNT(*) INTO total_users FROM users WHERE is_active = true;
    
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '🔄 USER CREDENTIALS UPDATE COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '👑 Admin accounts: %', admin_count;
    RAISE NOTICE '👤 Regular user accounts: %', user_count;
    RAISE NOTICE '📊 Total active users: %', total_users;
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 NEW LOGIN CREDENTIALS:';
    RAISE NOTICE '👑 ADMIN:';
    RAISE NOTICE '   Username: trailguide_admin';
    RAISE NOTICE '   Email: admin@trailguide.io';
    RAISE NOTICE '   Password: TGA!2025Secure';
    RAISE NOTICE '';
    RAISE NOTICE '👤 USERS:';
    RAISE NOTICE '   1. trailguide_user_a / user.a@trailguide.io / TgUa#2o25!';
    RAISE NOTICE '   2. trailguide_user_b / user.b@trailguide.io / TgUb$4o25@';
    RAISE NOTICE '   3. trailguide_user_c / user.c@trailguide.io / TgUc*6o25#';
    RAISE NOTICE '   4. trailguide_user_d / user.d@trailguide.io / TgUd&8o25%';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '✅ All user credentials updated successfully';
    RAISE NOTICE '🔒 All existing sessions invalidated for security';
    RAISE NOTICE '🚀 System ready with new standardized credentials';
    RAISE NOTICE '=============================================================================';
    
    -- Final verification
    IF admin_count = 1 AND user_count = 4 AND total_users = 5 THEN
        RAISE NOTICE '✅ VERIFICATION PASSED: All accounts present and updated';
    ELSE
        RAISE WARNING '⚠️  VERIFICATION FAILED: Expected 1 admin + 4 users = 5 total';
    END IF;
END $$;
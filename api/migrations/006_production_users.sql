-- =============================================================================
-- TrailGuide PWA - Production Users Migration
-- Version: 006
-- Description: Add role system and create production-ready user accounts
-- =============================================================================

-- =============================================================================
-- ADD ROLE SYSTEM TO USERS TABLE
-- =============================================================================

-- Create user role enum
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role user_role DEFAULT 'user' NOT NULL;

-- Add index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Add index for active users by role
CREATE INDEX idx_users_active_role ON users(role, is_active) WHERE is_active = true;

-- Update table comment
COMMENT ON COLUMN users.role IS 'User role: admin (full system access) or user (standard access)';

-- =============================================================================
-- PRODUCTION USER ACCOUNTS
-- =============================================================================

DO $$
DECLARE
    admin_count INTEGER;
    user_count INTEGER;
BEGIN
    -- Insert Admin Account
    -- Password: TrailGuideAdmin2024! (bcrypt with 12 rounds)
    INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at) VALUES
    (
        'trailguide_admin',
        '$2a$12$C7HX8A1C8gN56ICuzCEjzucnAuMB4jhzQrh1pWkcQ6wF1lE/sJrJ2',
        'admin@trailguide.io',
        'TrailGuide Administrator',
        'admin',
        true,
        NOW()
    );

    -- Insert Regular User Accounts
    -- All passwords: TrailGuide2024! (bcrypt with 12 rounds)
    INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at) VALUES
    (
        'guide_creator_1',
        '$2a$12$Zbg7tVRnbocWX4RfkSTRHuHKyRLXyngTc5kXHTob2NAANr2eShXAe',
        'creator1@trailguide.io',
        'Guide Creator One',
        'user',
        true,
        NOW()
    ),
    (
        'guide_creator_2',
        '$2a$12$C5nP6X43OLc4oIDdTZlRHuO3alHL90Ri7CjWY9Mtn82VVqpKAgyna',
        'creator2@trailguide.io',
        'Guide Creator Two',
        'user',
        true,
        NOW()
    ),
    (
        'event_organizer_1',
        '$2a$12$WEb.cAB55Ao.IYtRRaiN4ujIVQT0LmsTP6pn/HBtBWJiXuMSfP0cq',
        'organizer1@trailguide.io',
        'Event Organizer One',
        'user',
        true,
        NOW()
    ),
    (
        'trail_manager_1',
        '$2a$12$.CFbRVxMYEK2novIrxjxSOYMDuhsfV//NJsaGrgah7FQOjBozcDbi',
        'manager1@trailguide.io',
        'Trail Manager One',
        'user',
        true,
        NOW()
    );

    -- Get counts for reporting
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO user_count FROM users WHERE role = 'user';

    -- Log creation results
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '👥 PRODUCTION USERS CREATED SUCCESSFULLY';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '👑 Admin accounts created: %', admin_count;
    RAISE NOTICE '👤 Regular user accounts created: %', user_count;
    RAISE NOTICE '🔐 All passwords are securely hashed with bcrypt (12 rounds)';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ACCOUNT DETAILS:';
    RAISE NOTICE '👑 ADMIN ACCOUNT:';
    RAISE NOTICE '   Username: trailguide_admin';
    RAISE NOTICE '   Email: admin@trailguide.io';
    RAISE NOTICE '   Password: TrailGuideAdmin2024!';
    RAISE NOTICE '';
    RAISE NOTICE '👤 USER ACCOUNTS:';
    RAISE NOTICE '   1. guide_creator_1 / creator1@trailguide.io / TrailGuide2024!';
    RAISE NOTICE '   2. guide_creator_2 / creator2@trailguide.io / TrailGuide2024!';
    RAISE NOTICE '   3. event_organizer_1 / organizer1@trailguide.io / TrailGuide2024!';
    RAISE NOTICE '   4. trail_manager_1 / manager1@trailguide.io / TrailGuide2024!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '✅ System is ready for production with secure user accounts';
    RAISE NOTICE '=============================================================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Production users creation failed: %', SQLERRM;
END $$;

-- =============================================================================
-- UPDATE MIGRATION RECORD
-- =============================================================================

INSERT INTO schema_migrations (version, description) VALUES ('006', 'production_users');

-- =============================================================================
-- VERIFY USER CREATION
-- =============================================================================

DO $$
DECLARE
    total_users INTEGER;
    admin_users INTEGER;
    regular_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM users WHERE is_active = true;
    SELECT COUNT(*) INTO admin_users FROM users WHERE role = 'admin' AND is_active = true;
    SELECT COUNT(*) INTO regular_users FROM users WHERE role = 'user' AND is_active = true;
    
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '🔍 VERIFICATION SUMMARY';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '📊 Total active users: %', total_users;
    RAISE NOTICE '👑 Admin users: %', admin_users;
    RAISE NOTICE '👤 Regular users: %', regular_users;
    
    IF admin_users = 1 AND regular_users = 4 THEN
        RAISE NOTICE '✅ All production accounts created successfully';
    ELSE
        RAISE WARNING '⚠️  User count mismatch - expected 1 admin + 4 users';
    END IF;
    
    RAISE NOTICE '=============================================================================';
END $$;
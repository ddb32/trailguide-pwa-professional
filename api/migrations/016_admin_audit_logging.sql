-- =============================================================================
-- TrailGuide PWA - Admin Audit Logging
-- Version: 016
-- Description: Add audit logging table for admin actions tracking
-- =============================================================================

-- Create admin actions audit table
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    details JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

COMMENT ON TABLE admin_actions IS 'Audit log for all admin actions performed on the platform';
COMMENT ON COLUMN admin_actions.admin_user_id IS 'ID of the admin user who performed the action';
COMMENT ON COLUMN admin_actions.action_type IS 'Type of action performed (e.g., DELETE_USER_FEEDBACK, BULK_DELETE_FEEDBACK, RESET_ANALYTICS)';
COMMENT ON COLUMN admin_actions.target_type IS 'Type of target affected (e.g., visitor_feedback, feedback_bulk, analytics)';
COMMENT ON COLUMN admin_actions.target_id IS 'ID or identifier of the target affected';
COMMENT ON COLUMN admin_actions.details IS 'JSON details about the action including affected records, criteria, etc.';
COMMENT ON COLUMN admin_actions.performed_at IS 'When the action was performed';
COMMENT ON COLUMN admin_actions.ip_address IS 'IP address of the admin user';
COMMENT ON COLUMN admin_actions.user_agent IS 'User agent of the admin user';

-- Create indexes for performance
CREATE INDEX idx_admin_actions_admin_user ON admin_actions(admin_user_id, performed_at DESC);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type, performed_at DESC);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_type, target_id, performed_at DESC);
CREATE INDEX idx_admin_actions_date ON admin_actions(performed_at DESC);

-- Add constraint for valid action types
ALTER TABLE admin_actions ADD CONSTRAINT check_action_type
  CHECK (action_type IN (
    'DELETE_USER_FEEDBACK',
    'BULK_DELETE_FEEDBACK',
    'RESET_ANALYTICS',
    'DELETE_GUIDE',
    'RESTORE_GUIDE',
    'PLATFORM_MAINTENANCE',
    'USER_MANAGEMENT'
  ));

-- Add constraint for valid target types
ALTER TABLE admin_actions ADD CONSTRAINT check_target_type
  CHECK (target_type IN (
    'visitor_feedback',
    'feedback_bulk',
    'analytics',
    'guide',
    'user',
    'platform'
  ));

-- Create view for admin action summary
CREATE VIEW admin_actions_summary AS
SELECT
    aa.id,
    aa.action_type,
    aa.target_type,
    aa.target_id,
    aa.performed_at,
    u.username as admin_username,
    u.full_name as admin_full_name,
    aa.details->>'deleted_count' as affected_count,
    aa.ip_address
FROM admin_actions aa
LEFT JOIN users u ON aa.admin_user_id = u.id
ORDER BY aa.performed_at DESC;

COMMENT ON VIEW admin_actions_summary IS 'Summary view of admin actions with admin user details';

-- Function to get admin activity report
CREATE OR REPLACE FUNCTION get_admin_activity_report(
    p_admin_user_id UUID DEFAULT NULL,
    p_action_type VARCHAR(50) DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_actions BIGINT,
    action_breakdown JSONB,
    recent_actions JSONB,
    admin_summary JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH action_stats AS (
        SELECT
            COUNT(*) as total,
            jsonb_object_agg(action_type, action_count) as breakdown
        FROM (
            SELECT
                action_type,
                COUNT(*) as action_count
            FROM admin_actions aa
            WHERE
                (p_admin_user_id IS NULL OR aa.admin_user_id = p_admin_user_id)
                AND (p_action_type IS NULL OR aa.action_type = p_action_type)
                AND aa.performed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY action_type
            ORDER BY action_count DESC
        ) breakdown_data
    ),
    recent_actions_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', aa.id,
                'action_type', aa.action_type,
                'target_type', aa.target_type,
                'target_id', aa.target_id,
                'performed_at', aa.performed_at,
                'admin_username', u.username,
                'affected_count', aa.details->>'deleted_count'
            )
        ) as recent
        FROM admin_actions aa
        LEFT JOIN users u ON aa.admin_user_id = u.id
        WHERE
            (p_admin_user_id IS NULL OR aa.admin_user_id = p_admin_user_id)
            AND (p_action_type IS NULL OR aa.action_type = p_action_type)
            AND aa.performed_at > NOW() - INTERVAL '1 day' * p_days
        ORDER BY aa.performed_at DESC
        LIMIT 20
    ),
    admin_summary_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'admin_username', u.username,
                'admin_full_name', u.full_name,
                'action_count', admin_actions.action_count,
                'last_action', admin_actions.last_action
            )
        ) as admin_data
        FROM (
            SELECT
                aa.admin_user_id,
                COUNT(*) as action_count,
                MAX(aa.performed_at) as last_action
            FROM admin_actions aa
            WHERE
                (p_admin_user_id IS NULL OR aa.admin_user_id = p_admin_user_id)
                AND (p_action_type IS NULL OR aa.action_type = p_action_type)
                AND aa.performed_at > NOW() - INTERVAL '1 day' * p_days
            GROUP BY aa.admin_user_id
            ORDER BY action_count DESC
        ) admin_actions
        LEFT JOIN users u ON admin_actions.admin_user_id = u.id
    )
    SELECT
        s.total,
        s.breakdown,
        r.recent,
        a.admin_data
    FROM action_stats s, recent_actions_data r, admin_summary_data a;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DATA VALIDATION
-- =============================================================================

DO $$
DECLARE
    admin_actions_count INTEGER;
    indexes_count INTEGER;
BEGIN
    -- Verify admin_actions table was created
    SELECT COUNT(*) INTO admin_actions_count
    FROM information_schema.tables
    WHERE table_name = 'admin_actions';

    -- Verify indexes were created
    SELECT COUNT(*) INTO indexes_count
    FROM pg_indexes
    WHERE tablename = 'admin_actions';

    RAISE NOTICE '✅ Admin audit logging migration completed successfully';
    RAISE NOTICE '📋 Created admin_actions table (exists: %)', admin_actions_count > 0;
    RAISE NOTICE '🔍 Created % indexes for performance', indexes_count;
    RAISE NOTICE '📊 Created admin actions summary view';
    RAISE NOTICE '📈 Created admin activity report function';
    RAISE NOTICE '🔐 Ready for admin action audit logging';
END $$;
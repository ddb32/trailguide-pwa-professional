# Database Design - TrailGuide PWA MVP

## 1. Overview

This document outlines the comprehensive database design for TrailGuide PWA, including schema definitions, relationships, optimization strategies, and data management policies. The design prioritizes performance, scalability, and data integrity while maintaining simplicity for the MVP phase.

### Database Technology: PostgreSQL 15+

**Selection Rationale:**
- **ACID Compliance**: Ensures data consistency for critical user data
- **JSON Support**: Flexible metadata storage without sacrificing structure
- **Performance**: Excellent read performance for public access patterns
- **Scalability**: Proven horizontal and vertical scaling capabilities
- **Ecosystem**: Rich tooling and extension support
- **Open Source**: Cost-effective with enterprise-grade features

## 2. Database Schema

### 2.1 Core Tables

#### Users Table
Stores organizer authentication and profile information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL 
        CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,50}$'),
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE 
        CONSTRAINT email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE users IS 'Event organizers with authentication credentials';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password with salt rounds >=12';
COMMENT ON COLUMN users.is_active IS 'Account status - false for suspended accounts';
```

#### Events Table
Core table for guidance events/trails.

```sql
CREATE TYPE event_status AS ENUM ('draft', 'published', 'expired', 'archived');

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    status event_status DEFAULT 'draft',
    expiration_date TIMESTAMP WITH TIME ZONE,
    clicks_count INTEGER DEFAULT 0 
        CONSTRAINT clicks_non_negative CHECK (clicks_count >= 0),
    unique_visitors_count INTEGER DEFAULT 0
        CONSTRAINT unique_visitors_non_negative CHECK (unique_visitors_count >= 0),
    completion_count INTEGER DEFAULT 0
        CONSTRAINT completion_non_negative CHECK (completion_count >= 0),
    metadata JSONB DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_expiration CHECK (
        expiration_date IS NULL OR expiration_date > created_at
    ),
    CONSTRAINT slug_format CHECK (
        slug IS NULL OR slug ~ '^[a-z0-9-]+$'
    )
);

-- Comments
COMMENT ON TABLE events IS 'Navigation guidance events created by organizers';
COMMENT ON COLUMN events.slug IS 'URL-friendly identifier for public access';
COMMENT ON COLUMN events.metadata IS 'Flexible JSON storage for event details (description, location, etc.)';
COMMENT ON COLUMN events.is_featured IS 'Admin flag for promotional events';

-- Metadata JSON schema validation
ALTER TABLE events ADD CONSTRAINT metadata_schema CHECK (
    jsonb_typeof(metadata) = 'object' AND
    (metadata ? 'description' IS FALSE OR jsonb_typeof(metadata->'description') = 'string') AND
    (metadata ? 'location' IS FALSE OR jsonb_typeof(metadata->'location') = 'string') AND
    (metadata ? 'contact_info' IS FALSE OR jsonb_typeof(metadata->'contact_info') = 'string') AND
    (metadata ? 'estimated_duration' IS FALSE OR jsonb_typeof(metadata->'estimated_duration') = 'string')
);
```

#### Steps Table
Individual guidance steps within events.

```sql
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL 
        CONSTRAINT step_order_positive CHECK (step_order > 0),
    image_url VARCHAR(1000),
    image_alt VARCHAR(500),
    description TEXT NOT NULL
        CONSTRAINT description_length CHECK (LENGTH(description) BETWEEN 1 AND 200),
    view_count INTEGER DEFAULT 0
        CONSTRAINT view_count_non_negative CHECK (view_count >= 0),
    completion_count INTEGER DEFAULT 0
        CONSTRAINT completion_count_non_negative CHECK (completion_count >= 0),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique step order per event
    UNIQUE (event_id, step_order)
);

COMMENT ON TABLE steps IS 'Individual navigation steps within guidance events';
COMMENT ON COLUMN steps.step_order IS 'Sequential order of step within the event (1, 2, 3, etc.)';
COMMENT ON COLUMN steps.image_alt IS 'Accessibility description for screen readers';
COMMENT ON COLUMN steps.metadata IS 'Additional step data (coordinates, timing, etc.)';
```

### 2.2 Analytics and Tracking Tables

#### Event Views Table
Track public access to events for analytics.

```sql
CREATE TABLE event_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    visitor_id UUID, -- Anonymous visitor identifier
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(1000),
    country_code CHAR(2),
    city VARCHAR(100),
    completed BOOLEAN DEFAULT false,
    completion_time_seconds INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT completion_time_positive CHECK (
        completion_time_seconds IS NULL OR completion_time_seconds > 0
    )
);

COMMENT ON TABLE event_views IS 'Analytics tracking for public event access';
COMMENT ON COLUMN event_views.visitor_id IS 'Anonymous UUID for tracking unique visitors';
COMMENT ON COLUMN event_views.completed IS 'Whether visitor completed all steps';

-- Index for analytics queries
CREATE INDEX idx_event_views_event_date ON event_views(event_id, viewed_at DESC);
CREATE INDEX idx_event_views_visitor ON event_views(visitor_id, viewed_at DESC);
```

#### Step Views Table
Track individual step interactions.

```sql
CREATE TABLE step_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    event_view_id UUID REFERENCES event_views(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT time_spent_positive CHECK (
        time_spent_seconds IS NULL OR time_spent_seconds >= 0
    )
);

COMMENT ON TABLE step_views IS 'Detailed tracking of individual step interactions';

-- Index for step analytics
CREATE INDEX idx_step_views_step_date ON step_views(step_id, viewed_at DESC);
```

### 2.3 System Tables

#### User Sessions Table
Track active user sessions for security and analytics.

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_sessions IS 'Active user sessions with refresh token tracking';

-- Index for session cleanup
CREATE INDEX idx_user_sessions_expiry ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, is_active);
```

#### System Configuration Table
Store application-wide settings.

```sql
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE system_config IS 'Application-wide configuration settings';
COMMENT ON COLUMN system_config.is_public IS 'Whether setting is safe for public API access';

-- Insert default configurations
INSERT INTO system_config (key, value, description, is_public) VALUES
('max_events_per_user', '10', 'Maximum events per organizer in MVP', false),
('max_steps_per_event', '20', 'Maximum steps per guidance event', false),
('image_upload_max_size', '5242880', 'Max image upload size in bytes (5MB)', false),
('event_default_expiry_hours', '168', 'Default event expiry in hours (7 days)', false),
('maintenance_mode', 'false', 'System maintenance mode flag', true);
```

## 3. Indexes and Performance Optimization

### 3.1 Primary Indexes

```sql
-- Performance indexes for common query patterns
CREATE INDEX idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX idx_events_status_expiry ON events(status, expiration_date) 
    WHERE status = 'published';
CREATE INDEX idx_events_created_at ON events(created_at DESC);

CREATE INDEX idx_steps_event_order ON steps(event_id, step_order);
CREATE INDEX idx_steps_event_created ON steps(event_id, created_at);

CREATE INDEX idx_users_username_lower ON users(LOWER(username));
CREATE INDEX idx_users_email_lower ON users(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Composite index for public event access
CREATE INDEX idx_events_public_access ON events(id, status, expiration_date) 
    WHERE status = 'published';
```

### 3.2 Partial Indexes

```sql
-- Optimize for active/published content only
CREATE INDEX idx_events_published ON events(created_at DESC) 
    WHERE status = 'published';

CREATE INDEX idx_events_not_expired ON events(expiration_date) 
    WHERE status = 'published' AND expiration_date > NOW();

-- Analytics optimization
CREATE INDEX idx_event_views_recent ON event_views(event_id, viewed_at DESC) 
    WHERE viewed_at > NOW() - INTERVAL '30 days';
```

### 3.3 JSON Indexes

```sql
-- Index commonly queried metadata fields
CREATE INDEX idx_events_metadata_location ON events 
    USING GIN ((metadata->'location')) 
    WHERE metadata ? 'location';

-- Search support for event names and descriptions
CREATE INDEX idx_events_search ON events 
    USING GIN (to_tsvector('english', event_name || ' ' || COALESCE(metadata->>'description', '')));
```

## 4. Database Functions and Triggers

### 4.1 Update Timestamp Trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_steps_updated_at BEFORE UPDATE ON steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4.2 Event Status Management

```sql
-- Function to automatically expire events
CREATE OR REPLACE FUNCTION expire_events()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE events 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'published' 
        AND expiration_date IS NOT NULL 
        AND expiration_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_events() IS 'Automatically expire published events past their expiration date';
```

### 4.3 Analytics Aggregation Functions

```sql
-- Function to get event analytics summary
CREATE OR REPLACE FUNCTION get_event_analytics(
    p_event_id UUID,
    p_days INTEGER DEFAULT 7
) RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    completion_rate DECIMAL,
    avg_completion_time DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_views,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE completed = true)::DECIMAL / COUNT(*), 3)
            ELSE 0::DECIMAL
        END as completion_rate,
        ROUND(AVG(completion_time_seconds) FILTER (WHERE completion_time_seconds IS NOT NULL), 1) as avg_completion_time
    FROM event_views 
    WHERE event_id = p_event_id 
        AND viewed_at > NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;
```

## 5. Data Validation and Constraints

### 5.1 Business Logic Constraints

```sql
-- Ensure published events have at least one step
CREATE OR REPLACE FUNCTION validate_event_publication()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' THEN
        IF NOT EXISTS (SELECT 1 FROM steps WHERE event_id = NEW.id) THEN
            RAISE EXCEPTION 'Cannot publish event without steps';
        END IF;
        
        -- Auto-generate slug if not provided
        IF NEW.slug IS NULL THEN
            NEW.slug = LOWER(REGEXP_REPLACE(NEW.event_name, '[^a-zA-Z0-9]+', '-', 'g'));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_event_publication_trigger
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION validate_event_publication();
```

### 5.2 Data Integrity Constraints

```sql
-- Ensure step orders are sequential and start from 1
CREATE OR REPLACE FUNCTION validate_step_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if step_order creates gaps
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.step_order != OLD.step_order) THEN
        PERFORM reorder_event_steps(COALESCE(NEW.event_id, OLD.event_id));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to reorder steps to eliminate gaps
CREATE OR REPLACE FUNCTION reorder_event_steps(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ordered_steps AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY step_order, created_at) as new_order
        FROM steps 
        WHERE event_id = p_event_id
    )
    UPDATE steps 
    SET step_order = ordered_steps.new_order
    FROM ordered_steps 
    WHERE steps.id = ordered_steps.id;
END;
$$ LANGUAGE plpgsql;
```

## 6. Data Retention and Cleanup Policies

### 6.1 Automated Cleanup Procedures

```sql
-- Clean up expired events older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive events expired for more than 30 days
    UPDATE events 
    SET status = 'archived'
    WHERE status = 'expired' 
        AND updated_at < NOW() - INTERVAL '30 days';
    
    -- Delete archived events older than 1 year
    DELETE FROM events 
    WHERE status = 'archived' 
        AND updated_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep analytics for 6 months
    DELETE FROM event_views 
    WHERE viewed_at < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired user sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

## 7. Database Security

### 7.1 Row Level Security (RLS)

```sql
-- Enable RLS for multi-tenant data isolation
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- Policy for organizers to access only their events
CREATE POLICY events_organizer_access ON events
    FOR ALL TO app_user
    USING (organizer_id = current_setting('app.current_user_id')::UUID);

-- Policy for public read access to published, non-expired events
CREATE POLICY events_public_read ON events
    FOR SELECT TO public_user
    USING (status = 'published' 
           AND (expiration_date IS NULL OR expiration_date > NOW()));

-- Steps inherit event permissions
CREATE POLICY steps_organizer_access ON steps
    FOR ALL TO app_user
    USING (event_id IN (
        SELECT id FROM events 
        WHERE organizer_id = current_setting('app.current_user_id')::UUID
    ));

CREATE POLICY steps_public_read ON steps
    FOR SELECT TO public_user
    USING (event_id IN (
        SELECT id FROM events 
        WHERE status = 'published' 
          AND (expiration_date IS NULL OR expiration_date > NOW())
    ));
```

### 7.2 MVP Security Configuration

> **🔒 Security Notice for MVP**: 
> The following configuration provides essential security measures for MVP deployment while maintaining setup simplicity. Production deployments require additional hardening measures listed in section 7.3.

#### 7.2.1 Dedicated Database Users (DO NOT use postgres superuser)

```sql
-- ⚠️  NEVER use the default 'postgres' superuser for application connections
-- Create dedicated limited-privilege users for the application

-- Application database user (for API server) - LIMITED PRIVILEGES
CREATE USER trailguide_app WITH 
  PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_123!'
  NOSUPERUSER 
  NOCREATEDB 
  NOCREATEROLE 
  NOINHERIT 
  LOGIN;

GRANT CONNECT ON DATABASE trailguide_dev TO trailguide_app;
GRANT USAGE ON SCHEMA public TO trailguide_app;

-- Grant specific table permissions (not ALL TABLES)
GRANT SELECT, INSERT, UPDATE, DELETE ON users, events, steps TO trailguide_app;
GRANT INSERT ON event_views, step_views, user_sessions TO trailguide_app;
GRANT SELECT, UPDATE ON system_config TO trailguide_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trailguide_app;

-- Read-only user for analytics/reporting
CREATE USER trailguide_analytics WITH 
  PASSWORD 'CHANGE_THIS_ANALYTICS_PASSWORD_456!'
  NOSUPERUSER 
  NOCREATEDB 
  NOCREATEROLE 
  NOINHERIT 
  LOGIN;

GRANT CONNECT ON DATABASE trailguide_dev TO trailguide_analytics;
GRANT USAGE ON SCHEMA public TO trailguide_analytics;
-- Only SELECT permissions for analytics
GRANT SELECT ON events, steps, event_views, step_views TO trailguide_analytics;

-- Public API user (very limited permissions for public endpoints)
CREATE USER trailguide_public WITH 
  PASSWORD 'CHANGE_THIS_PUBLIC_API_PASSWORD_789!'
  NOSUPERUSER 
  NOCREATEDB 
  NOCREATEROLE 
  NOINHERIT 
  LOGIN;

GRANT CONNECT ON DATABASE trailguide_dev TO trailguide_public;
GRANT USAGE ON SCHEMA public TO trailguide_public;
-- Only public read access and analytics insertion
GRANT SELECT ON events, steps TO trailguide_public;
GRANT INSERT ON event_views, step_views TO trailguide_public;
```

#### 7.2.2 Remove Default Public Privileges

```sql
-- IMPORTANT: Remove default public access to prevent unauthorized operations
REVOKE CREATE ON SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;

-- Ensure only specific users can access the database
REVOKE CONNECT ON DATABASE trailguide_dev FROM public;
```

#### 7.2.3 Secrets Management - Environment Variables

**❌ NEVER hardcode database credentials in source code**

Required environment variables (store in `.env.development` / `.env.production`):

```bash
# Database connection for application
DATABASE_URL=postgresql://trailguide_app:SECURE_APP_PASSWORD@localhost:5432/trailguide_dev

# Separate connection for analytics (optional)
ANALYTICS_DATABASE_URL=postgresql://trailguide_analytics:ANALYTICS_PASSWORD@localhost:5432/trailguide_dev

# Public API connection (if needed)
PUBLIC_API_DATABASE_URL=postgresql://trailguide_public:PUBLIC_API_PASSWORD@localhost:5432/trailguide_dev

# Database SSL (enable in production)
DATABASE_SSL=false  # Set to 'true' in production
DATABASE_SSL_REJECT_UNAUTHORIZED=false  # Set to 'true' in production
```

#### 7.2.4 Network Security - Localhost Binding for MVP

```sql
-- PostgreSQL configuration (postgresql.conf)
-- For MVP: bind only to localhost to prevent external access
listen_addresses = 'localhost'  -- Only allow local connections

-- Connection limits
max_connections = 100  -- Reasonable limit for MVP

-- Authentication configuration (pg_hba.conf)
-- Example secure configuration for MVP:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             trailguide_app                         md5
local   all             trailguide_analytics                   md5  
local   all             trailguide_public                      md5
host    trailguide_dev  trailguide_app  127.0.0.1/32           md5
host    trailguide_dev  trailguide_analytics 127.0.0.1/32     md5
host    trailguide_dev  trailguide_public 127.0.0.1/32        md5
# Reject all other connections
host    all             all             0.0.0.0/0              reject
```

#### 7.2.5 Additional MVP Security Measures

```sql
-- Enable logging for security auditing
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_statement = 'mod';  -- Log INSERT, UPDATE, DELETE
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log slow queries

-- Reload configuration
SELECT pg_reload_conf();

-- Function to monitor failed login attempts
CREATE OR REPLACE FUNCTION log_failed_login()
RETURNS event_trigger AS $$
BEGIN
    -- This would be expanded in production to track failed attempts
    RAISE NOTICE 'Connection attempt logged at %', NOW();
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Production Security Roadmap

> **📋 Production Enhancement Checklist**: 
> The following security measures should be implemented when moving from MVP to production deployment:

#### 7.3.1 SSL/TLS Encryption
- [ ] Enable SSL/TLS for all database connections
- [ ] Configure SSL certificates for PostgreSQL
- [ ] Update connection strings to require SSL
- [ ] Implement certificate validation

#### 7.3.2 Advanced Authentication
- [ ] Implement certificate-based authentication
- [ ] Set up database connection pooling with security
- [ ] Configure database firewall rules
- [ ] Implement database access auditing

#### 7.3.3 Data Encryption
- [ ] Enable encryption at rest for database files
- [ ] Implement field-level encryption for sensitive data
- [ ] Set up key management for encryption keys
- [ ] Configure backup encryption

#### 7.3.4 Monitoring and Alerting
- [ ] Set up database security monitoring
- [ ] Configure failed login attempt alerts
- [ ] Implement unusual activity detection
- [ ] Set up automated security scanning

#### 7.3.5 Backup Security
- [ ] Encrypt database backups
- [ ] Secure backup storage location
- [ ] Implement backup access controls
- [ ] Test backup restoration procedures

## 8. Backup and Recovery Strategy

### 8.1 Backup Configuration

```sql
-- Full backup script (to be run via cron)
-- pg_dump --host=localhost --port=5432 --username=postgres --format=custom --verbose --file=trailguide_backup_$(date +%Y%m%d_%H%M%S).backup trailguide

-- Incremental backup using WAL-E or similar tool for production
-- Point-in-time recovery capability essential for production deployment
```

### 8.2 Disaster Recovery

1. **Daily Automated Backups**: Full database backup retained for 30 days
2. **Continuous WAL Archiving**: Point-in-time recovery capability
3. **Geographic Replication**: Secondary database in different region
4. **Recovery Time Objective (RTO)**: 4 hours maximum downtime
5. **Recovery Point Objective (RPO)**: Maximum 15 minutes data loss

## 9. Performance Monitoring

### 9.1 Key Metrics to Track

```sql
-- Query to monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Database connection monitoring
SELECT count(*) as active_connections,
       max_conn,
       max_conn - count(*) as available_connections
FROM pg_stat_activity, 
     (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') mc
WHERE state = 'active';

-- Table size monitoring
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 10. Migration Strategy

### 10.1 Schema Versioning

```sql
-- Schema version tracking table
CREATE TABLE schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial version
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Initial schema creation');
```

### 10.2 Migration Scripts Structure

```
migrations/
├── 001_initial_schema.sql
├── 002_add_analytics_tables.sql
├── 003_add_user_sessions.sql
├── rollback/
│   ├── 001_rollback.sql
│   ├── 002_rollback.sql
│   └── 003_rollback.sql
└── scripts/
    ├── migrate.sh
    └── rollback.sh
```

This comprehensive database design provides a solid foundation for the TrailGuide PWA MVP while maintaining scalability for future enhancements. The schema supports efficient queries, data integrity, and performance optimization essential for a production application.
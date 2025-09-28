-- TrailGuide Development Database Initialization
-- Development-specific database setup with test data

-- Create development extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create development schemas
CREATE SCHEMA IF NOT EXISTS trailguide_dev;
CREATE SCHEMA IF NOT EXISTS audit_dev;
CREATE SCHEMA IF NOT EXISTS testing_dev;

-- Set search path for development
ALTER DATABASE trailguide_dev SET search_path TO trailguide_dev, public;

-- Create development-specific roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trailguide_dev_read') THEN
        CREATE ROLE trailguide_dev_read;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trailguide_dev_write') THEN
        CREATE ROLE trailguide_dev_write;
    END IF;
END
$$;

-- Grant permissions for development
GRANT CONNECT ON DATABASE trailguide_dev TO trailguide_dev_read;
GRANT CONNECT ON DATABASE trailguide_dev TO trailguide_dev_write;
GRANT USAGE ON SCHEMA trailguide_dev TO trailguide_dev_read, trailguide_dev_write;
GRANT USAGE ON SCHEMA audit_dev TO trailguide_dev_read, trailguide_dev_write;
GRANT USAGE ON SCHEMA testing_dev TO trailguide_dev_read, trailguide_dev_write;

-- Development logging configuration
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';

-- Development performance settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 0;

-- Reload configuration
SELECT pg_reload_conf();

-- Create development audit table
CREATE TABLE IF NOT EXISTS audit_dev.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id TEXT
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_dev.audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_operation ON audit_dev.audit_log(table_name, operation);

-- Development-specific functions
CREATE OR REPLACE FUNCTION trailguide_dev.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_dev.audit_log (table_name, operation, old_values, session_id)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_setting('application_name', true));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_dev.audit_log (table_name, operation, old_values, new_values, session_id)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('application_name', true));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_dev.audit_log (table_name, operation, new_values, session_id)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_setting('application_name', true));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
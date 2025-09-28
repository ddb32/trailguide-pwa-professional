#!/bin/bash

# TrailGuide Migration Script
# Environment-aware database migration system

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/api/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
DIRECTION="up"
STEPS=""
DRY_RUN=false
FORCE=false

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
TrailGuide Migration Tool

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENVIRONMENT    Target environment (dev|staging|prod)
    -d, --direction DIRECTION        Migration direction (up|down) [default: up]
    -s, --steps STEPS               Number of migration steps to run
    -n, --dry-run                   Show what would be executed without running
    -f, --force                     Force execution (skip confirmations)
    -h, --help                      Show this help message

Examples:
    $0 -e dev                       Run all pending migrations in development
    $0 -e staging -n                Dry run for staging environment
    $0 -e prod -d down -s 1         Rollback one migration in production
    $0 -e dev -f                    Force run all migrations in development

Environments:
    dev         Development environment (localhost)
    staging     Staging environment (staging.trailguide.app)
    prod        Production environment (app.trailguide.app)

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -d|--direction)
                DIRECTION="$2"
                shift 2
                ;;
            -s|--steps)
                STEPS="$2"
                shift 2
                ;;
            -n|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    if [[ -z "$ENVIRONMENT" ]]; then
        log_error "Environment is required. Use -e or --environment option."
        show_usage
        exit 1
    fi

    case "$ENVIRONMENT" in
        dev|staging|prod)
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
            exit 1
            ;;
    esac
}

# Load environment configuration
load_environment() {
    local env_file="$PROJECT_ROOT/environments/$ENVIRONMENT/.env"

    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi

    log_info "Loading environment configuration: $ENVIRONMENT"

    # Source environment file
    set -a
    source "$env_file"
    set +a
}

# Check database connectivity
check_database_connection() {
    log_info "Checking database connection..."

    local max_attempts=5
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            log_success "Database connection successful"
            return 0
        fi

        log_warning "Database connection attempt $attempt/$max_attempts failed. Retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done

    log_error "Failed to connect to database after $max_attempts attempts"
    exit 1
}

# Create migrations table if it doesn't exist
setup_migrations_table() {
    log_info "Setting up migrations table..."

    local create_table_sql="
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        execution_time_ms INTEGER,
        success BOOLEAN DEFAULT true
    );

    CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
    CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at);
    "

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create migrations table"
        return 0
    fi

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "$create_table_sql" >/dev/null 2>&1

    log_success "Migrations table ready"
}

# Get list of pending migrations
get_pending_migrations() {
    if [[ ! -d "$MIGRATIONS_DIR" ]]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi

    # Get all migration files
    local all_migrations=($(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))

    if [[ ${#all_migrations[@]} -eq 0 ]]; then
        log_warning "No migration files found in $MIGRATIONS_DIR"
        return 0
    fi

    # Get executed migrations
    local executed_query="SELECT filename FROM migrations WHERE success = true ORDER BY filename;"
    local executed_migrations=()

    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "$executed_query" 2>/dev/null | while read -r migration; do
            [[ -n "$migration" ]] && executed_migrations+=("$(basename "$migration" .sql)")
        done; then
        log_warning "Could not retrieve executed migrations. Treating all as pending."
    fi

    # Find pending migrations
    local pending_migrations=()
    for migration_file in "${all_migrations[@]}"; do
        local migration_name=$(basename "$migration_file" .sql)
        local is_executed=false

        for executed in "${executed_migrations[@]}"; do
            if [[ "$migration_name" == "$executed" ]]; then
                is_executed=true
                break
            fi
        done

        if [[ "$is_executed" == "false" ]]; then
            pending_migrations+=("$migration_file")
        fi
    done

    # Apply step limit if specified
    if [[ -n "$STEPS" ]] && [[ ${#pending_migrations[@]} -gt $STEPS ]]; then
        pending_migrations=("${pending_migrations[@]:0:$STEPS}")
    fi

    echo "${pending_migrations[@]}"
}

# Calculate file checksum
calculate_checksum() {
    local file="$1"
    sha256sum "$file" | cut -d' ' -f1
}

# Execute migration
execute_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    local checksum=$(calculate_checksum "$migration_file")

    log_info "Executing migration: $migration_name"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would execute: $migration_file"
        return 0
    fi

    local start_time=$(date +%s%3N)

    # Execute migration in a transaction
    local migration_sql="
    BEGIN;

    -- Execute the migration
    \i $migration_file

    -- Record the migration
    INSERT INTO migrations (filename, checksum, execution_time_ms)
    VALUES ('$migration_name', '$checksum', %s);

    COMMIT;
    "

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$migration_file" >/dev/null 2>&1; then

        local end_time=$(date +%s%3N)
        local execution_time=$((end_time - start_time))

        # Record successful migration
        local record_sql="INSERT INTO migrations (filename, checksum, execution_time_ms) VALUES ('$migration_name', '$checksum', $execution_time);"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "$record_sql" >/dev/null 2>&1

        log_success "Migration completed: $migration_name (${execution_time}ms)"
        return 0
    else
        log_error "Migration failed: $migration_name"

        # Record failed migration
        local record_sql="INSERT INTO migrations (filename, checksum, success) VALUES ('$migration_name', '$checksum', false);"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "$record_sql" >/dev/null 2>&1 || true

        return 1
    fi
}

# Rollback migration
rollback_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)

    # Look for corresponding rollback file
    local rollback_file="${migration_file%.*}.down.sql"

    if [[ ! -f "$rollback_file" ]]; then
        log_error "Rollback file not found: $rollback_file"
        return 1
    fi

    log_info "Rolling back migration: $migration_name"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would rollback: $rollback_file"
        return 0
    fi

    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$rollback_file" >/dev/null 2>&1; then

        # Remove migration record
        local remove_sql="DELETE FROM migrations WHERE filename = '$migration_name';"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "$remove_sql" >/dev/null 2>&1

        log_success "Migration rolled back: $migration_name"
        return 0
    else
        log_error "Rollback failed: $migration_name"
        return 1
    fi
}

# Show migration status
show_status() {
    log_info "Migration status for environment: $ENVIRONMENT"

    local status_query="
    SELECT
        filename,
        executed_at,
        execution_time_ms,
        CASE WHEN success THEN 'SUCCESS' ELSE 'FAILED' END as status
    FROM migrations
    ORDER BY executed_at DESC
    LIMIT 10;
    "

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "$status_query" 2>/dev/null || log_warning "Could not retrieve migration status"
}

# Confirm action for production
confirm_production_action() {
    if [[ "$ENVIRONMENT" == "prod" ]] && [[ "$FORCE" != "true" ]]; then
        log_warning "You are about to run migrations on PRODUCTION environment!"
        log_warning "This action can be irreversible and may affect live data."

        echo -n "Are you absolutely sure you want to continue? (type 'YES' to confirm): "
        read -r confirmation

        if [[ "$confirmation" != "YES" ]]; then
            log_info "Operation cancelled by user"
            exit 0
        fi
    fi
}

# Main execution function
main() {
    log_info "TrailGuide Migration Tool"
    log_info "========================="

    parse_args "$@"
    validate_environment
    load_environment
    check_database_connection
    setup_migrations_table

    case "$DIRECTION" in
        up)
            confirm_production_action

            local pending_migrations=($(get_pending_migrations))

            if [[ ${#pending_migrations[@]} -eq 0 ]]; then
                log_success "No pending migrations found"
                show_status
                exit 0
            fi

            log_info "Found ${#pending_migrations[@]} pending migration(s)"

            for migration in "${pending_migrations[@]}"; do
                if ! execute_migration "$migration"; then
                    log_error "Migration failed. Stopping execution."
                    exit 1
                fi
            done

            log_success "All migrations completed successfully"
            ;;

        down)
            confirm_production_action

            log_warning "Rollback operations can be dangerous!"

            if [[ "$FORCE" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
                echo -n "Are you sure you want to rollback migrations? (y/N): "
                read -r confirmation

                if [[ "$confirmation" != "y" ]] && [[ "$confirmation" != "Y" ]]; then
                    log_info "Rollback cancelled"
                    exit 0
                fi
            fi

            # TODO: Implement rollback logic
            log_error "Rollback functionality not yet implemented"
            exit 1
            ;;

        *)
            log_error "Invalid direction: $DIRECTION"
            exit 1
            ;;
    esac

    show_status
}

# Run main function
main "$@"
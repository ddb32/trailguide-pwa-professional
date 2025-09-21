#!/bin/bash
# Production Database Migration Script for TrailGuide PWA
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env.production"

# Functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Load environment variables
load_environment() {
    print_header "Loading Environment Variables"
    
    if [[ -f "$ENV_FILE" ]]; then
        set -a
        source "$ENV_FILE"
        set +a
        print_success "Environment variables loaded"
    else
        print_error "Failed to load environment variables"
        exit 1
    fi
}

# Check database connection
check_database() {
    print_header "Checking Database Connection"
    
    cd "$PROJECT_DIR"
    
    # Start database if not running
    if ! docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
        print_warning "Starting database..."
        docker-compose -f docker-compose.prod.yml up -d postgres redis
        sleep 30
    fi
    
    # Test connection
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U trailguide_prod -d trailguide_production; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        exit 1
    fi
}

# Backup database before migration
backup_database() {
    print_header "Creating Database Backup"
    
    cd "$PROJECT_DIR"
    
    # Create backup
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="backups/pre_migration_backup_${TIMESTAMP}.sql"
    
    mkdir -p backups
    
    print_success "Creating backup: ${BACKUP_FILE}"
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
        -U trailguide_prod -d trailguide_production \
        --clean --if-exists --create > "${BACKUP_FILE}"
    
    # Compress backup
    gzip "${BACKUP_FILE}"
    print_success "Backup created and compressed: ${BACKUP_FILE}.gz"
}

# Check migration status
check_migration_status() {
    print_header "Checking Migration Status"
    
    cd "$PROJECT_DIR"
    
    # Start API container temporarily if needed
    docker-compose -f docker-compose.prod.yml up -d api
    sleep 20
    
    # Check current migration status
    print_success "Current migration status:"
    docker-compose -f docker-compose.prod.yml exec -T api npm run migrate:status || true
}

# Run migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    cd "$PROJECT_DIR"
    
    # Run migrations
    print_success "Starting database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T api npm run migrate
    
    print_success "Database migrations completed successfully"
}

# Seed production data
seed_production_data() {
    print_header "Seeding Production Data"
    
    cd "$PROJECT_DIR"
    
    print_warning "Checking if production users need to be created..."
    
    # Check if production admin user exists
    USER_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql \
        -U trailguide_prod -d trailguide_production \
        -t -c "SELECT COUNT(*) FROM users WHERE role = 'admin';" | tr -d ' ')
    
    if [[ "$USER_COUNT" -eq 0 ]]; then
        print_success "Creating production admin user..."
        
        # Create admin user (you'll need to customize this)
        docker-compose -f docker-compose.prod.yml exec -T postgres psql \
            -U trailguide_prod -d trailguide_production \
            -c "INSERT INTO users (username, email, password_hash, role, full_name, is_active) 
                VALUES ('admin', 'admin@yourdomain.com', '\$2b\$12\$example_hash_here', 'admin', 'Administrator', true)
                ON CONFLICT (username) DO NOTHING;"
        
        print_success "Production admin user created"
    else
        print_success "Production users already exist"
    fi
}

# Verify migration
verify_migration() {
    print_header "Verifying Migration"
    
    cd "$PROJECT_DIR"
    
    # Check final migration status
    print_success "Final migration status:"
    docker-compose -f docker-compose.prod.yml exec -T api npm run migrate:status
    
    # Test basic database operations
    print_success "Testing database operations..."
    
    # Test user table
    USER_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql \
        -U trailguide_prod -d trailguide_production \
        -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    print_success "Users table: ${USER_COUNT} records"
    
    # Test events table
    EVENT_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql \
        -U trailguide_prod -d trailguide_production \
        -t -c "SELECT COUNT(*) FROM events;" | tr -d ' ')
    print_success "Events table: ${EVENT_COUNT} records"
    
    # Test API health
    sleep 10
    if curl -f http://localhost/api/v1/health &> /dev/null; then
        print_success "API health check passed"
    else
        print_warning "API health check failed - check logs"
    fi
}

# Show migration info
show_migration_info() {
    print_header "Migration Complete"
    
    echo -e "${GREEN}Database migration completed successfully!${NC}"
    echo ""
    echo "Database Information:"
    echo "- Database: trailguide_production"
    echo "- User: trailguide_prod"
    echo "- Host: localhost:5432 (local access only)"
    echo ""
    echo "Backup Information:"
    echo "- Backups stored in: ${PROJECT_DIR}/backups/"
    echo "- Latest backup: $(ls -t ${PROJECT_DIR}/backups/pre_migration_backup_*.sql.gz | head -n1 2>/dev/null || echo 'None')"
    echo ""
    print_warning "Next steps:"
    echo "1. Verify your application is working correctly"
    echo "2. Test all critical functionality"
    echo "3. Monitor logs for any issues"
    echo ""
    echo "To check logs:"
    echo "  docker-compose -f docker-compose.prod.yml logs api"
}

# Main migration process
main() {
    print_header "TrailGuide PWA Database Migration"
    
    load_environment
    check_database
    backup_database
    check_migration_status
    run_migrations
    seed_production_data
    verify_migration
    show_migration_info
}

# Handle script arguments
case "${1:-migrate}" in
    "migrate"|"")
        main
        ;;
    "status")
        load_environment
        check_migration_status
        ;;
    "backup")
        load_environment
        check_database
        backup_database
        ;;
    "seed")
        load_environment
        seed_production_data
        ;;
    "verify")
        load_environment
        verify_migration
        ;;
    *)
        echo "Usage: $0 {migrate|status|backup|seed|verify}"
        echo ""
        echo "Commands:"
        echo "  migrate - Run full migration process (default)"
        echo "  status  - Check current migration status"
        echo "  backup  - Create database backup only"
        echo "  seed    - Seed production data only"
        echo "  verify  - Verify migration only"
        exit 1
        ;;
esac
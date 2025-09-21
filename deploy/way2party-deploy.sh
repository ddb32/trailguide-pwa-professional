#!/bin/bash
# Deployment Script for way2party.co.il
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
DOMAIN="way2party.co.il"
ENV_FILE="${PROJECT_DIR}/.env.way2party.production"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.way2party.yml"

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

# Generate secure secrets
generate_secrets() {
    print_header "Generating Secure Secrets"

    cd "$PROJECT_DIR"

    # Check if we need to generate secrets
    if grep -q "GENERATE_" "$ENV_FILE"; then
        print_warning "Found placeholder secrets in $ENV_FILE"

        # Generate JWT secret
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
        sed -i "s/GENERATE_NEW_JWT_SECRET_HERE/$JWT_SECRET/" "$ENV_FILE"
        print_success "Generated JWT secret"

        # Generate session secret
        SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        sed -i "s/GENERATE_NEW_SESSION_SECRET_HERE/$SESSION_SECRET/" "$ENV_FILE"
        print_success "Generated session secret"

        # Generate database password
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        sed -i "s/GENERATE_SECURE_PASSWORD_HERE/$DB_PASSWORD/" "$ENV_FILE"
        print_success "Generated database password"

        # Generate Redis password
        REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
        sed -i "s/GENERATE_REDIS_PASSWORD_HERE/$REDIS_PASSWORD/" "$ENV_FILE"
        print_success "Generated Redis password"

        # Generate email password placeholder
        EMAIL_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-12)
        sed -i "s/GENERATE_EMAIL_PASSWORD_HERE/$EMAIL_PASSWORD/" "$ENV_FILE"
        print_warning "Generated placeholder email password - update with real SMTP credentials"

        print_success "All secrets generated successfully"
    else
        print_success "Secrets already configured"
    fi
}

# Validate environment
validate_environment() {
    print_header "Validating Environment"

    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not found: $ENV_FILE"
        exit 1
    fi

    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a

    # Validate critical variables
    local missing_vars=()

    [[ -z "${DB_PASSWORD:-}" ]] && missing_vars+=("DB_PASSWORD")
    [[ -z "${JWT_SECRET:-}" ]] && missing_vars+=("JWT_SECRET")
    [[ -z "${SESSION_SECRET:-}" ]] && missing_vars+=("SESSION_SECRET")
    [[ -z "${REDIS_PASSWORD:-}" ]] && missing_vars+=("REDIS_PASSWORD")

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi

    print_success "Environment validation passed"
}

# Check system requirements
check_requirements() {
    print_header "Checking System Requirements"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
    print_success "Docker Compose found: $(docker-compose --version)"

    # Check available disk space
    AVAILABLE_SPACE=$(df -BG --output=avail . | tail -n1 | tr -d 'G ')
    if [[ $AVAILABLE_SPACE -lt 10 ]]; then
        print_error "Insufficient disk space. Need at least 10GB, available: ${AVAILABLE_SPACE}GB"
        exit 1
    fi
    print_success "Disk space check passed: ${AVAILABLE_SPACE}GB available"

    # Check memory
    AVAILABLE_MEMORY=$(free -g | awk 'NR==2{print $7}')
    if [[ $AVAILABLE_MEMORY -lt 2 ]]; then
        print_warning "Low available memory: ${AVAILABLE_MEMORY}GB. Recommended: 4GB+"
    else
        print_success "Memory check passed: ${AVAILABLE_MEMORY}GB available"
    fi
}

# Setup directories and permissions
setup_directories() {
    print_header "Setting Up Directories"

    cd "$PROJECT_DIR"

    # Create necessary directories
    mkdir -p data/postgres data/redis logs/nginx logs/api logs/postgres logs/redis uploads backups

    # Set proper permissions
    chmod 755 data logs uploads backups
    chmod 700 data/postgres data/redis

    print_success "Directories created and permissions set"
}

# Build Docker images
build_images() {
    print_header "Building Docker Images"

    cd "$PROJECT_DIR"

    # Build images with no cache for production
    docker-compose -f "$COMPOSE_FILE" build --no-cache --pull

    print_success "Docker images built successfully"
}

# Deploy services
deploy_services() {
    print_header "Deploying Services"

    cd "$PROJECT_DIR"

    # Stop any existing services
    docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

    # Deploy with environment file
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    print_success "Services deployed successfully"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    cd "$PROJECT_DIR"

    # Wait for database to be ready
    print_warning "Waiting for database to be ready..."
    sleep 30

    # Run migrations
    docker-compose -f "$COMPOSE_FILE" exec -T api npm run migrate

    print_success "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"

    cd "$PROJECT_DIR"

    # Wait for services to start
    sleep 30

    # Check service health
    local services=("postgres" "redis" "api" "frontend" "nginx")
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            docker-compose -f "$COMPOSE_FILE" logs "$service" | tail -20
            exit 1
        fi
    done

    # Test HTTP access
    if curl -f http://localhost/health &> /dev/null; then
        print_success "HTTP health check passed"
    else
        print_error "HTTP health check failed"
        exit 1
    fi

    # Test API access
    if curl -f http://localhost/api/v1/health &> /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        exit 1
    fi

    print_success "Deployment verification passed"
}

# Show deployment info
show_deployment_info() {
    print_header "Deployment Complete"

    echo -e "${GREEN}TrailGuide PWA deployed successfully for way2party.co.il!${NC}"
    echo ""
    echo "Service URLs:"
    echo "- Local HTTP: http://localhost"
    echo "- Local API: http://localhost/api/v1/health"
    echo "- Production: https://way2party.co.il (after SSL setup)"
    echo ""
    echo "Next steps:"
    echo "1. Configure DNS A record: way2party.co.il -> $(curl -s http://ipv4.icanhazip.com || echo 'YOUR_SERVER_IP')"
    echo "2. Run SSL setup: ./deploy/ssl-setup.sh"
    echo "3. Test production: https://way2party.co.il/health"
    echo ""
    echo "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    print_warning "Remember to:"
    echo "- Update SMTP credentials in $ENV_FILE"
    echo "- Configure backup schedule"
    echo "- Set up monitoring alerts"
    echo "- Test Hebrew RTL functionality"
}

# Main deployment process
main() {
    print_header "TrailGuide PWA Deployment for way2party.co.il"

    generate_secrets
    validate_environment
    check_requirements
    setup_directories
    build_images
    deploy_services
    run_migrations
    verify_deployment
    show_deployment_info
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy"|"")
        main
        ;;
    "update")
        print_header "Updating way2party.co.il Deployment"
        validate_environment
        build_images
        deploy_services
        verify_deployment
        print_success "Update completed"
        ;;
    "restart")
        print_header "Restarting Services"
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" restart
        verify_deployment
        print_success "Services restarted"
        ;;
    "logs")
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "status")
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 {deploy|update|restart|logs|status}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  update  - Update existing deployment"
        echo "  restart - Restart all services"
        echo "  logs    - Show logs (optionally specify service)"
        echo "  status  - Show service status"
        exit 1
        ;;
esac
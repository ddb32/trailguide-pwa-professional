#!/bin/bash
# TrailGuide PWA Production Deployment Script
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

# Check requirements
check_requirements() {
    print_header "Checking Requirements"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed"
    
    # Check if .env.production exists
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error ".env.production file not found"
        print_warning "Please create .env.production file with production settings"
        exit 1
    fi
    print_success ".env.production file exists"
}

# Load environment variables
load_environment() {
    print_header "Loading Environment Variables"
    
    # Load environment variables
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

# Create necessary directories
create_directories() {
    print_header "Creating Directories"
    
    cd "$PROJECT_DIR"
    
    directories=(
        "data/postgres"
        "data/redis"
        "logs"
        "backups"
        "uploads"
        "nginx/ssl"
        "nginx/logs"
        "nginx/cache"
        "nginx/certbot-webroot"
    )
    
    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        else
            print_success "Directory exists: $dir"
        fi
    done
    
    # Set proper permissions
    chmod 755 data/postgres data/redis logs backups uploads
    chmod 755 nginx/ssl nginx/logs nginx/cache nginx/certbot-webroot
}

# Build production images
build_images() {
    print_header "Building Production Images"
    
    cd "$PROJECT_DIR"
    
    # Build API image
    print_success "Building API production image..."
    docker build -f api/Dockerfile.prod -t trailguide-api:prod api/
    
    # Build Frontend image
    print_success "Building Frontend production image..."
    docker build -f frontend/Dockerfile.prod -t trailguide-frontend:prod frontend/
    
    print_success "All images built successfully"
}

# Database operations
setup_database() {
    print_header "Setting Up Database"
    
    cd "$PROJECT_DIR"
    
    # Check if database is already running
    if docker-compose -f docker-compose.prod.yml ps postgres | grep -q "Up"; then
        print_warning "Database is already running"
    else
        print_success "Starting database..."
        docker-compose -f docker-compose.prod.yml up -d postgres redis
        
        # Wait for database to be ready
        print_success "Waiting for database to be ready..."
        sleep 30
    fi
    
    # Run migrations
    print_success "Running database migrations..."
    docker-compose -f docker-compose.prod.yml exec -T api npm run migrate
}

# Deploy services
deploy_services() {
    print_header "Deploying Services"
    
    cd "$PROJECT_DIR"
    
    # Stop existing services (if any)
    print_success "Stopping existing services..."
    docker-compose -f docker-compose.prod.yml down || true
    
    # Start all services
    print_success "Starting all services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    print_success "Waiting for services to start..."
    sleep 60
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    print_header "Checking Service Health"
    
    services=("postgres" "redis" "api" "frontend" "nginx")
    
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            docker-compose -f docker-compose.prod.yml logs "$service"
            exit 1
        fi
    done
    
    # Test API health endpoint
    sleep 10
    if curl -f http://localhost/api/v1/health &> /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        docker-compose -f docker-compose.prod.yml logs api
        exit 1
    fi
    
    # Test frontend
    if curl -f http://localhost/health &> /dev/null; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        docker-compose -f docker-compose.prod.yml logs frontend nginx
        exit 1
    fi
}

# Show deployment info
show_deployment_info() {
    print_header "Deployment Information"
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo ""
    echo "Services:"
    echo "- Application: http://localhost"
    echo "- API: http://localhost/api/v1/health"
    echo "- Database: localhost:5432 (local access only)"
    echo "- Redis: localhost:6379 (local access only)"
    echo ""
    echo "To view logs:"
    echo "  docker-compose -f docker-compose.prod.yml logs [service_name]"
    echo ""
    echo "To stop services:"
    echo "  docker-compose -f docker-compose.prod.yml down"
    echo ""
    print_warning "Next steps for full production:"
    echo "1. Update .env.production with your domain name"
    echo "2. Configure DNS to point to this server"
    echo "3. Run SSL setup: ./ssl-setup.sh"
    echo "4. Update nginx configuration to use HTTPS"
}

# Main deployment process
main() {
    print_header "TrailGuide PWA Production Deployment"
    
    check_requirements
    load_environment
    create_directories
    build_images
    setup_database
    deploy_services
    show_deployment_info
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy"|"")
        main
        ;;
    "build")
        check_requirements
        load_environment
        build_images
        ;;
    "start")
        cd "$PROJECT_DIR"
        docker-compose -f docker-compose.prod.yml up -d
        check_service_health
        ;;
    "stop")
        cd "$PROJECT_DIR"
        docker-compose -f docker-compose.prod.yml down
        ;;
    "restart")
        cd "$PROJECT_DIR"
        docker-compose -f docker-compose.prod.yml restart
        check_service_health
        ;;
    "logs")
        cd "$PROJECT_DIR"
        docker-compose -f docker-compose.prod.yml logs -f "${2:-}"
        ;;
    "health")
        check_service_health
        ;;
    *)
        echo "Usage: $0 {deploy|build|start|stop|restart|logs|health}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  build   - Build images only"
        echo "  start   - Start services"
        echo "  stop    - Stop services"
        echo "  restart - Restart services"
        echo "  logs    - Show logs (optionally specify service)"
        echo "  health  - Check service health"
        exit 1
        ;;
esac
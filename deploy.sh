#!/bin/bash

# TrailGuide PWA - Production Deployment Script
# Usage: ./deploy.sh [domain] [email]
# Example: ./deploy.sh trailguide.example.com admin@example.com

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get domain and email from arguments
DOMAIN=${1:-"localhost"}
SSL_EMAIL=${2:-"admin@localhost"}

print_status "Starting TrailGuide PWA Production Deployment..."
print_status "Domain: $DOMAIN"
print_status "SSL Email: $SSL_EMAIL"

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production file not found. Creating template..."
    cp .env.example .env.production
    print_warning "Please edit .env.production with your production values before continuing."
    print_warning "Required variables: DB_PASSWORD, REDIS_PASSWORD, JWT_SECRET, SESSION_SECRET"
    exit 1
fi

# Create necessary directories
print_status "Creating required directories..."
mkdir -p nginx/ssl nginx/logs nginx/cache nginx/certbot-webroot
mkdir -p data/postgres data/redis
mkdir -p logs uploads backups

# Set proper permissions
print_status "Setting directory permissions..."
chmod 755 nginx/ssl nginx/logs nginx/cache logs uploads backups
chmod 755 data/postgres data/redis

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build application images
print_status "Building application images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Start database and Redis first
print_status "Starting database services..."
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm api npm run migrate

# Start all services
print_status "Starting all services..."
DOMAIN_NAME=$DOMAIN SSL_EMAIL=$SSL_EMAIL docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check if nginx is responding
if curl -f http://localhost/health &> /dev/null; then
    print_success "NGINX is responding correctly"
else
    print_error "NGINX health check failed"
    docker-compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# Check if API is responding
if curl -f http://localhost/api/v1/health &> /dev/null; then
    print_success "API is responding correctly"
else
    print_error "API health check failed"
    docker-compose -f docker-compose.prod.yml logs api
    exit 1
fi

# Setup SSL if domain is not localhost
if [ "$DOMAIN" != "localhost" ]; then
    print_status "Setting up SSL certificates with Let's Encrypt..."

    # Create initial certificate
    docker-compose -f docker-compose.prod.yml run --rm certbot \
        certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email $SSL_EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN

    # Restart nginx to use SSL
    docker-compose -f docker-compose.prod.yml restart nginx

    print_success "SSL certificates installed successfully"

    # Setup automatic renewal
    print_status "Setting up SSL certificate auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * cd $(pwd) && docker-compose -f docker-compose.prod.yml run --rm certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart nginx") | crontab -

    print_success "SSL auto-renewal configured"
fi

# Setup database backup
print_status "Setting up database backup..."
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && docker-compose -f docker-compose.prod.yml --profile backup run --rm backup") | crontab -
print_success "Database backup scheduled (daily at 2 AM)"

# Display final status
print_success "=== DEPLOYMENT COMPLETE ==="
print_success "Application is running at: http${DOMAIN != "localhost" && echo "s"}://$DOMAIN"
print_success "API health check: http${DOMAIN != "localhost" && echo "s"}://$DOMAIN/api/v1/health"

print_status "=== SERVICE STATUS ==="
docker-compose -f docker-compose.prod.yml ps

print_status "=== NEXT STEPS ==="
echo "1. Test the application at http${DOMAIN != "localhost" && echo "s"}://$DOMAIN"
echo "2. Login with demo credentials:"
echo "   - Email: demo@example.com / Password: demo123"
echo "   - Username: trailguide_user_a / Password: TgUa#2o25!"
echo "3. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "4. To stop: docker-compose -f docker-compose.prod.yml down"

if [ "$DOMAIN" != "localhost" ]; then
    print_status "=== SSL INFORMATION ==="
    echo "SSL certificates are installed and auto-renewal is configured"
    echo "Certificates location: ./nginx/ssl/"
    echo "Next renewal check: $(date -d '+90 days')"
fi

print_success "TrailGuide PWA is now running in production!"
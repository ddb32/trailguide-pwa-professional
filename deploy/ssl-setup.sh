#!/bin/bash
# SSL Setup Script for TrailGuide PWA
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
    
    # Validate required variables
    if [[ -z "${DOMAIN_NAME:-}" ]]; then
        print_error "DOMAIN_NAME not set in .env.production"
        print_warning "Please add DOMAIN_NAME=yourdomain.com to .env.production"
        exit 1
    fi
    
    if [[ -z "${SSL_EMAIL:-}" ]]; then
        print_error "SSL_EMAIL not set in .env.production"
        print_warning "Please add SSL_EMAIL=admin@yourdomain.com to .env.production"
        exit 1
    fi
}

# Check DNS configuration
check_dns() {
    print_header "Checking DNS Configuration"
    
    print_success "Checking DNS for ${DOMAIN_NAME}..."
    
    # Get server IP
    SERVER_IP=$(curl -s http://ipv4.icanhazip.com || echo "unknown")
    print_success "Server IP: ${SERVER_IP}"
    
    # Check domain DNS
    DOMAIN_IP=$(dig +short "${DOMAIN_NAME}" | tail -n1)
    
    if [[ "$DOMAIN_IP" == "$SERVER_IP" ]]; then
        print_success "DNS is correctly configured"
    else
        print_error "DNS mismatch!"
        print_warning "Domain ${DOMAIN_NAME} points to: ${DOMAIN_IP}"
        print_warning "Server IP is: ${SERVER_IP}"
        print_warning "Please update your DNS records to point to the server IP"
        
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Test HTTP access
test_http_access() {
    print_header "Testing HTTP Access"
    
    cd "$PROJECT_DIR"
    
    # Make sure services are running
    if ! docker-compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
        print_warning "Services not running, starting them..."
        docker-compose -f docker-compose.prod.yml up -d
        sleep 30
    fi
    
    # Test local access
    if curl -f http://localhost/health &> /dev/null; then
        print_success "Local HTTP access working"
    else
        print_error "Local HTTP access failed"
        exit 1
    fi
    
    # Test domain access
    if curl -f "http://${DOMAIN_NAME}/health" &> /dev/null; then
        print_success "Domain HTTP access working"
    else
        print_error "Domain HTTP access failed"
        print_warning "Make sure port 80 is open and domain DNS is correct"
        exit 1
    fi
}

# Obtain SSL certificate
obtain_certificate() {
    print_header "Obtaining SSL Certificate"
    
    cd "$PROJECT_DIR"
    
    # Create certificate directory
    mkdir -p nginx/ssl/live/${DOMAIN_NAME}
    
    # Stop nginx temporarily for standalone mode
    docker-compose -f docker-compose.prod.yml stop nginx
    
    print_success "Requesting SSL certificate for ${DOMAIN_NAME}..."
    
    # Request certificate using standalone mode
    docker run --rm \
        -p 80:80 \
        -v "${PWD}/nginx/ssl:/etc/letsencrypt" \
        -v "${PWD}/nginx/certbot-webroot:/var/www/certbot" \
        certbot/certbot certonly \
        --standalone \
        --email "${SSL_EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --domains "${DOMAIN_NAME}"
    
    # Verify certificate was created
    if [[ -f "nginx/ssl/live/${DOMAIN_NAME}/fullchain.pem" ]]; then
        print_success "SSL certificate obtained successfully"
    else
        print_error "Failed to obtain SSL certificate"
        exit 1
    fi
    
    # Set proper permissions
    chmod -R 644 nginx/ssl/
    chmod 700 nginx/ssl/live nginx/ssl/archive
}

# Configure HTTPS
configure_https() {
    print_header "Configuring HTTPS"
    
    cd "$PROJECT_DIR"
    
    # Update domain in HTTPS configuration
    sed "s/yourdomain.com/${DOMAIN_NAME}/g" nginx/conf.d/https.conf.template > nginx/conf.d/https.conf
    
    # Backup HTTP configuration
    mv nginx/conf.d/http.conf nginx/conf.d/http.conf.backup
    
    # Update environment to use HTTPS URLs
    sed -i "s|http://yourdomain.com|https://${DOMAIN_NAME}|g" .env.production
    sed -i "s|https://yourdomain.com|https://${DOMAIN_NAME}|g" .env.production
    
    print_success "HTTPS configuration updated"
}

# Restart services with HTTPS
restart_with_https() {
    print_header "Restarting Services with HTTPS"
    
    cd "$PROJECT_DIR"
    
    # Restart all services
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to start
    sleep 60
    
    # Test HTTPS
    test_https_access
}

# Test HTTPS access
test_https_access() {
    print_header "Testing HTTPS Access"
    
    # Test HTTPS health check
    if curl -f "https://${DOMAIN_NAME}/health" &> /dev/null; then
        print_success "HTTPS access working"
    else
        print_error "HTTPS access failed"
        docker-compose -f docker-compose.prod.yml logs nginx
        exit 1
    fi
    
    # Test API over HTTPS
    if curl -f "https://${DOMAIN_NAME}/api/v1/health" &> /dev/null; then
        print_success "HTTPS API access working"
    else
        print_error "HTTPS API access failed"
        docker-compose -f docker-compose.prod.yml logs api
        exit 1
    fi
    
    # Test HTTP to HTTPS redirect
    REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN_NAME}/")
    if [[ "$REDIRECT_STATUS" == "301" ]]; then
        print_success "HTTP to HTTPS redirect working"
    else
        print_warning "HTTP to HTTPS redirect may not be working (status: ${REDIRECT_STATUS})"
    fi
}

# Setup certificate renewal
setup_renewal() {
    print_header "Setting Up Certificate Renewal"
    
    cd "$PROJECT_DIR"
    
    # Create renewal script
    cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "Renewing SSL certificates..."

# Renew certificates
docker run --rm \
    -v "${PWD}/nginx/ssl:/etc/letsencrypt" \
    -v "${PWD}/nginx/certbot-webroot:/var/www/certbot" \
    certbot/certbot renew --webroot --webroot-path=/var/www/certbot

# Reload nginx if certificate was renewed
if [ $? -eq 0 ]; then
    echo "Reloading nginx..."
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    echo "SSL renewal completed successfully"
else
    echo "SSL renewal failed"
    exit 1
fi
EOF
    
    chmod +x scripts/renew-ssl.sh
    
    print_success "Certificate renewal script created"
    print_warning "Add this to your crontab for automatic renewal:"
    echo "0 12 * * * ${PROJECT_DIR}/scripts/renew-ssl.sh >> ${PROJECT_DIR}/logs/ssl-renewal.log 2>&1"
}

# Show SSL info
show_ssl_info() {
    print_header "SSL Setup Complete"
    
    echo -e "${GREEN}SSL certificate setup completed successfully!${NC}"
    echo ""
    echo "Your application is now available at:"
    echo "- HTTPS: https://${DOMAIN_NAME}"
    echo "- API: https://${DOMAIN_NAME}/api/v1/health"
    echo ""
    echo "Certificate information:"
    openssl x509 -in "nginx/ssl/live/${DOMAIN_NAME}/cert.pem" -text -noout | grep -E "(Subject|Issuer|Not Before|Not After)" || true
    echo ""
    print_warning "Certificate expires in 90 days. Set up automatic renewal:"
    echo "  crontab -e"
    echo "  Add: 0 12 * * * ${PROJECT_DIR}/scripts/renew-ssl.sh >> ${PROJECT_DIR}/logs/ssl-renewal.log 2>&1"
}

# Main SSL setup process
main() {
    print_header "TrailGuide PWA SSL Setup"
    
    load_environment
    check_dns
    test_http_access
    obtain_certificate
    configure_https
    restart_with_https
    setup_renewal
    show_ssl_info
}

# Handle script arguments
case "${1:-setup}" in
    "setup"|"")
        main
        ;;
    "renew")
        load_environment
        cd "$PROJECT_DIR"
        ./scripts/renew-ssl.sh
        ;;
    "test")
        load_environment
        test_https_access
        ;;
    "check")
        load_environment
        check_dns
        ;;
    *)
        echo "Usage: $0 {setup|renew|test|check}"
        echo ""
        echo "Commands:"
        echo "  setup - Complete SSL setup (default)"
        echo "  renew - Renew existing certificate"
        echo "  test  - Test HTTPS access"
        echo "  check - Check DNS configuration"
        exit 1
        ;;
esac
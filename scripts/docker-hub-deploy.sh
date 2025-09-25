#!/bin/bash
# Complete Docker Hub Deployment Script for TrailGuide PWA
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
VERSION=${1:-"latest"}
SKIP_BUILD=${SKIP_BUILD:-"false"}
SKIP_PUSH=${SKIP_PUSH:-"false"}

# Docker Hub configuration
REGISTRY_PREFIX=${REGISTRY_PREFIX:-"trailguide"}

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

# Show usage
show_usage() {
    echo "Usage: $0 [version] [options]"
    echo ""
    echo "Arguments:"
    echo "  version          Version to build and deploy (default: latest)"
    echo ""
    echo "Environment variables:"
    echo "  REGISTRY_PREFIX  Docker Hub username/org (default: trailguide)"
    echo "  SKIP_BUILD      Skip building images (default: false)"
    echo "  SKIP_PUSH       Skip pushing to Docker Hub (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.0                    # Build and push version 1.0.0"
    echo "  SKIP_BUILD=true $0 1.0.0    # Only push existing images"
    echo "  SKIP_PUSH=true $0 1.0.0     # Only build, don't push"
    echo ""
    echo "Full workflow:"
    echo "  1. Build multi-architecture images"
    echo "  2. Push to Docker Hub"
    echo "  3. Create deployment compose file"
    echo "  4. Update production configuration"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker found"

    # Check Docker Hub login
    if [[ "$SKIP_PUSH" != "true" ]]; then
        if ! docker info | grep -q "Username"; then
            print_error "Not logged into Docker Hub. Please run 'docker login' first."
            exit 1
        fi
        print_success "Docker Hub login verified"
    fi

    # Check git repository
    if ! git rev-parse --git-dir &> /dev/null; then
        print_warning "Not in a git repository. Some metadata will be unavailable."
    else
        print_success "Git repository detected"
    fi

    # Check project structure
    if [[ ! -f "$PROJECT_DIR/api/Dockerfile.prod" ]]; then
        print_error "API Dockerfile not found. Are you in the right directory?"
        exit 1
    fi

    if [[ ! -f "$PROJECT_DIR/frontend/Dockerfile.prod" ]]; then
        print_error "Frontend Dockerfile not found. Are you in the right directory?"
        exit 1
    fi

    print_success "Project structure verified"
}

# Build images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        print_header "Skipping Build (SKIP_BUILD=true)"
        return
    fi

    print_header "Building Docker Images"

    cd "$SCRIPT_DIR"
    ./docker-hub-build.sh "$VERSION"

    print_success "Images built successfully"
}

# Push to Docker Hub
push_images() {
    if [[ "$SKIP_PUSH" == "true" ]]; then
        print_header "Skipping Push (SKIP_PUSH=true)"
        return
    fi

    print_header "Pushing to Docker Hub"

    cd "$SCRIPT_DIR"
    ./docker-hub-push.sh "$VERSION"

    print_success "Images pushed successfully"
}

# Create production deployment files
create_deployment_files() {
    print_header "Creating Production Deployment Files"

    # Create way2party.co.il specific compose file
    cat > "$PROJECT_DIR/docker-compose.way2party.hub.yml" << EOF
# Production Docker Compose for way2party.co.il using Docker Hub images
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: way2party-db-hub
    restart: unless-stopped
    environment:
      POSTGRES_DB: trailguide_production
      POSTGRES_USER: trailguide_prod
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=he_IL.UTF-8 --lc-ctype=he_IL.UTF-8"
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./backups:/backups
      - ./logs/postgres:/var/log/postgresql
    networks:
      - way2party-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
      - DAC_OVERRIDE
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trailguide_prod -d trailguide_production"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "127.0.0.1:5432:5432"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: way2party-redis-hub
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --requirepass \${REDIS_PASSWORD}
      --maxclients 1000
    volumes:
      - redis_prod_data:/data
      - ./logs/redis:/var/log/redis
    networks:
      - way2party-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    ports:
      - "127.0.0.1:6379:6379"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  # API Backend (from Docker Hub)
  api:
    image: ${REGISTRY_PREFIX}/api:${VERSION}
    container_name: way2party-api-hub
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=trailguide_production
      - DB_USER=trailguide_prod
      - DB_PASSWORD=\${DB_PASSWORD}
      - REDIS_URL=redis://:\${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=\${JWT_SECRET}
      - JWT_EXPIRES_IN=15m
      - JWT_REFRESH_EXPIRES_IN=7d
      - SESSION_SECRET=\${SESSION_SECRET}
      - PORT=3000
      - FRONTEND_URL=https://way2party.co.il
      - CORS_ORIGIN=https://way2party.co.il
      - DOMAIN_NAME=way2party.co.il
    volumes:
      - ./uploads:/app/uploads
      - ./logs/api:/app/logs
    networks:
      - way2party-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"

  # Frontend (from Docker Hub)
  frontend:
    image: ${REGISTRY_PREFIX}/frontend:${VERSION}
    container_name: way2party-frontend-hub
    restart: unless-stopped
    networks:
      - way2party-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
      - NET_BIND_SERVICE
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  # NGINX Reverse Proxy
  nginx:
    image: nginx:1.25-alpine
    container_name: way2party-nginx-hub
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
      - ./nginx/cache:/var/cache/nginx
      - ./nginx/certbot-webroot:/var/www/certbot:ro
    networks:
      - way2party-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
      - NET_BIND_SERVICE
    depends_on:
      - frontend
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    environment:
      - NGINX_HOST=way2party.co.il
      - NGINX_PORT=80
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"

volumes:
  postgres_prod_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/postgres
  redis_prod_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data/redis

networks:
  way2party-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: way2party-hub
    ipam:
      config:
        - subnet: 172.21.0.0/16
EOF

    print_success "Created docker-compose.way2party.hub.yml"

    # Create deployment script for Hub images
    cat > "$PROJECT_DIR/deploy/way2party-hub-deploy.sh" << 'EOF'
#!/bin/bash
# Deployment script for way2party.co.il using Docker Hub images
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION=${1:-"latest"}
REGISTRY_PREFIX=${REGISTRY_PREFIX:-"trailguide"}

echo "🚀 Deploying way2party.co.il with Docker Hub images"
echo "Version: $VERSION"
echo "Registry: $REGISTRY_PREFIX"
echo ""

cd "$PROJECT_DIR"

# Pull latest images
echo "📥 Pulling latest images from Docker Hub..."
docker pull "${REGISTRY_PREFIX}/api:${VERSION}"
docker pull "${REGISTRY_PREFIX}/frontend:${VERSION}"

# Deploy with Hub images
echo "🚀 Deploying services..."
docker-compose -f docker-compose.way2party.hub.yml --env-file .env.way2party.production up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 30

# Verify deployment
echo "✅ Verifying deployment..."
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ way2party.co.il deployment successful!"
    echo ""
    echo "Service status:"
    docker-compose -f docker-compose.way2party.hub.yml ps
    echo ""
    echo "🌐 Access at: http://localhost (or https://way2party.co.il after SSL setup)"
else
    echo "❌ Deployment verification failed"
    docker-compose -f docker-compose.way2party.hub.yml logs
    exit 1
fi
EOF

    chmod +x "$PROJECT_DIR/deploy/way2party-hub-deploy.sh"
    print_success "Created way2party-hub-deploy.sh"
}

# Update production documentation
update_documentation() {
    print_header "Updating Documentation"

    # Create Docker Hub specific documentation
    cat > "$PROJECT_DIR/DOCKER_HUB_DEPLOYMENT.md" << EOF
# 🐳 Docker Hub Deployment Guide for TrailGuide PWA

## 📋 **OVERVIEW**

TrailGuide PWA is now available on Docker Hub with production-ready, multi-architecture images optimized for way2party.co.il deployment.

## 🏷️ **DOCKER HUB IMAGES**

### **Available Images**
- \`${REGISTRY_PREFIX}/api:${VERSION}\` - Backend API service
- \`${REGISTRY_PREFIX}/frontend:${VERSION}\` - Frontend PWA service

### **Supported Architectures**
- ✅ \`linux/amd64\` - Intel/AMD x64 processors
- ✅ \`linux/arm64\` - ARM processors (Apple Silicon, ARM servers)

### **Image Tags**
- \`latest\` - Latest stable version
- \`${VERSION}\` - Specific version
- \`[git-commit]\` - Git commit-based tags

## 🚀 **QUICK START**

### **1. Pull Images**
\`\`\`bash
docker pull ${REGISTRY_PREFIX}/api:${VERSION}
docker pull ${REGISTRY_PREFIX}/frontend:${VERSION}
\`\`\`

### **2. Deploy with Docker Compose**
\`\`\`bash
# Use the Hub-optimized compose file
docker-compose -f docker-compose.way2party.hub.yml up -d
\`\`\`

### **3. Deploy to way2party.co.il**
\`\`\`bash
# Complete deployment with SSL
./deploy/way2party-hub-deploy.sh ${VERSION}
./deploy/ssl-setup.sh
\`\`\`

## 🔧 **PRODUCTION DEPLOYMENT**

### **Environment Setup**
1. Copy environment configuration:
   \`\`\`bash
   cp .env.way2party.production .env.production
   \`\`\`

2. Update secrets (see DEPLOYMENT_WAY2PARTY.md for details)

3. Configure DNS: \`way2party.co.il\` → \`[SERVER_IP]\`

### **Deployment Commands**
\`\`\`bash
# Deploy with specific version
./deploy/way2party-hub-deploy.sh 1.0.0

# Deploy latest version
./deploy/way2party-hub-deploy.sh latest
\`\`\`

## 📦 **IMAGE DETAILS**

### **API Image (\`${REGISTRY_PREFIX}/api\`)**
- **Base**: \`node:18-alpine\`
- **Size**: ~150MB optimized
- **User**: Non-root (\`trailguide:1001\`)
- **Port**: 3000
- **Health Check**: \`/api/v1/health\`

### **Frontend Image (\`${REGISTRY_PREFIX}/frontend\`)**
- **Base**: \`nginx:1.25-alpine\`
- **Size**: ~50MB optimized
- **User**: Non-root (\`nginx:101\`)
- **Port**: 80
- **Features**: PWA, Hebrew RTL support

## 🔒 **SECURITY FEATURES**

- ✅ Multi-stage builds for minimal attack surface
- ✅ Non-root user execution
- ✅ Security scanning and vulnerability alerts
- ✅ Signed images with metadata
- ✅ Regular security updates

## 🌐 **HEBREW RTL SUPPORT**

Both images include complete Hebrew RTL support:
- Hebrew interface translations
- Right-to-left layout optimization
- Israeli timezone (Asia/Jerusalem)
- Cultural adaptations for Israeli market

## 📊 **MONITORING & HEALTH**

### **Health Checks**
- API: \`curl http://localhost:3000/api/v1/health\`
- Frontend: \`curl http://localhost/\`
- Full Stack: \`curl https://way2party.co.il/health\`

### **Logs**
\`\`\`bash
# View API logs
docker logs way2party-api-hub

# View frontend logs
docker logs way2party-frontend-hub

# View all service logs
docker-compose -f docker-compose.way2party.hub.yml logs
\`\`\`

## 🔄 **UPDATES & MAINTENANCE**

### **Update to New Version**
\`\`\`bash
# Pull new version
docker pull ${REGISTRY_PREFIX}/api:new-version
docker pull ${REGISTRY_PREFIX}/frontend:new-version

# Update deployment
./deploy/way2party-hub-deploy.sh new-version
\`\`\`

### **Rollback**
\`\`\`bash
# Rollback to previous version
./deploy/way2party-hub-deploy.sh previous-version
\`\`\`

## 📞 **SUPPORT**

- **Docker Hub**: https://hub.docker.com/r/${REGISTRY_PREFIX}
- **Documentation**: Complete guides in \`docs/\`
- **Issues**: Report via project repository

---

**🎉 TrailGuide PWA is production-ready on Docker Hub!**
EOF

    print_success "Created DOCKER_HUB_DEPLOYMENT.md"
}

# Show deployment summary
show_summary() {
    print_header "Deployment Summary"

    echo -e "${GREEN}TrailGuide PWA Docker Hub deployment completed!${NC}"
    echo ""
    echo "🐳 Docker Hub Images:"
    echo "  - ${REGISTRY_PREFIX}/api:${VERSION}"
    echo "  - ${REGISTRY_PREFIX}/frontend:${VERSION}"
    echo ""
    echo "📦 Multi-architecture support:"
    echo "  - linux/amd64 (Intel/AMD)"
    echo "  - linux/arm64 (ARM/Apple Silicon)"
    echo ""
    echo "🚀 Production deployment files created:"
    echo "  - docker-compose.way2party.hub.yml"
    echo "  - deploy/way2party-hub-deploy.sh"
    echo "  - DOCKER_HUB_DEPLOYMENT.md"
    echo ""
    echo "🌐 Next steps for way2party.co.il:"
    echo "  1. Configure DNS: way2party.co.il → [SERVER_IP]"
    echo "  2. Deploy: ./deploy/way2party-hub-deploy.sh ${VERSION}"
    echo "  3. Setup SSL: ./deploy/ssl-setup.sh"
    echo "  4. Verify: curl https://way2party.co.il/health"
    echo ""
    echo "📋 Docker Hub URLs:"
    echo "  🔗 API: https://hub.docker.com/r/${REGISTRY_PREFIX}/api"
    echo "  🔗 Frontend: https://hub.docker.com/r/${REGISTRY_PREFIX}/frontend"
}

# Main deployment process
main() {
    print_header "TrailGuide PWA - Complete Docker Hub Deployment"

    echo "Deploying version: $VERSION"
    echo "Registry prefix: $REGISTRY_PREFIX"
    echo "Skip build: $SKIP_BUILD"
    echo "Skip push: $SKIP_PUSH"
    echo ""

    check_prerequisites
    build_images
    push_images
    create_deployment_files
    update_documentation
    show_summary
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy"|"")
        shift
        VERSION=${1:-"latest"}
        main
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        VERSION="$1"
        main
        ;;
esac
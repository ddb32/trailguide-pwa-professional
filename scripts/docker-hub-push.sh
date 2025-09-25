#!/bin/bash
# Docker Hub Push Script for TrailGuide PWA
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
PUSH_LATEST=${PUSH_LATEST:-"true"}

# Docker Hub configuration
DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-""}
REGISTRY_PREFIX=${DOCKER_HUB_USERNAME:-"trailguide"}

# Image names
API_IMAGE="${REGISTRY_PREFIX}/trailguide-api"
FRONTEND_IMAGE="${REGISTRY_PREFIX}/trailguide-frontend"

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

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check Docker Hub login
    if ! docker info | grep -q "Username"; then
        print_error "Not logged into Docker Hub. Please run 'docker login' first."
        exit 1
    fi
    print_success "Docker Hub login verified"

    # Check if images exist locally
    if ! docker images "$API_IMAGE" | grep -q "$VERSION"; then
        print_error "API image $API_IMAGE:$VERSION not found locally. Run build script first."
        exit 1
    fi
    print_success "API image found locally"

    if ! docker images "$FRONTEND_IMAGE" | grep -q "$VERSION"; then
        print_error "Frontend image $FRONTEND_IMAGE:$VERSION not found locally. Run build script first."
        exit 1
    fi
    print_success "Frontend image found locally"
}

# Push API image with multi-architecture support
push_api() {
    print_header "Pushing API Image: $API_IMAGE:$VERSION"

    # Use buildx to push multi-architecture image
    cd "$PROJECT_DIR"

    # Get build metadata
    BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # Build and push with buildx for multi-arch support
    docker buildx build \
        --platform "linux/amd64,linux/arm64" \
        --file api/Dockerfile.prod \
        --tag "$API_IMAGE:$VERSION" \
        --tag "$API_IMAGE:latest" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg VERSION="$VERSION" \
        --push \
        ./api

    print_success "API image pushed to Docker Hub"

    # Show pushed image info
    echo "Pushed tags:"
    echo "- $API_IMAGE:$VERSION"
    if [[ "$PUSH_LATEST" == "true" ]]; then
        echo "- $API_IMAGE:latest"
    fi
}

# Push Frontend image with multi-architecture support
push_frontend() {
    print_header "Pushing Frontend Image: $FRONTEND_IMAGE:$VERSION"

    cd "$PROJECT_DIR"

    # Get build metadata
    BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # Build and push with buildx for multi-arch support
    docker buildx build \
        --platform "linux/amd64,linux/arm64" \
        --file frontend/Dockerfile.prod \
        --tag "$FRONTEND_IMAGE:$VERSION" \
        --tag "$FRONTEND_IMAGE:latest" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg VERSION="$VERSION" \
        --build-arg VITE_API_URL="/api" \
        --build-arg VITE_PUBLIC_URL="/" \
        --push \
        ./frontend

    print_success "Frontend image pushed to Docker Hub"

    # Show pushed image info
    echo "Pushed tags:"
    echo "- $FRONTEND_IMAGE:$VERSION"
    if [[ "$PUSH_LATEST" == "true" ]]; then
        echo "- $FRONTEND_IMAGE:latest"
    fi
}

# Verify pushed images
verify_push() {
    print_header "Verifying Pushed Images"

    print_success "Checking API image on Docker Hub..."
    if docker manifest inspect "$API_IMAGE:$VERSION" &> /dev/null; then
        print_success "API image manifest verified on Docker Hub"

        # Show architectures
        echo "Available architectures:"
        docker manifest inspect "$API_IMAGE:$VERSION" | jq -r '.manifests[].platform | "\(.architecture)/\(.os)"' 2>/dev/null || echo "  - Multi-architecture manifest confirmed"
    else
        print_error "Failed to verify API image on Docker Hub"
    fi

    print_success "Checking Frontend image on Docker Hub..."
    if docker manifest inspect "$FRONTEND_IMAGE:$VERSION" &> /dev/null; then
        print_success "Frontend image manifest verified on Docker Hub"

        # Show architectures
        echo "Available architectures:"
        docker manifest inspect "$FRONTEND_IMAGE:$VERSION" | jq -r '.manifests[].platform | "\(.architecture)/\(.os)"' 2>/dev/null || echo "  - Multi-architecture manifest confirmed"
    else
        print_error "Failed to verify Frontend image on Docker Hub"
    fi
}

# Show Docker Hub URLs
show_hub_info() {
    print_header "Docker Hub Information"

    echo -e "${GREEN}Images successfully pushed to Docker Hub!${NC}"
    echo ""
    echo "Docker Hub URLs:"
    echo "🔗 API Image: https://hub.docker.com/r/$API_IMAGE"
    echo "🔗 Frontend Image: https://hub.docker.com/r/$FRONTEND_IMAGE"
    echo ""
    echo "Pull commands:"
    echo "📥 docker pull $API_IMAGE:$VERSION"
    echo "📥 docker pull $FRONTEND_IMAGE:$VERSION"
    echo ""
    echo "Usage in Docker Compose:"
    echo "  api:"
    echo "    image: $API_IMAGE:$VERSION"
    echo "  frontend:"
    echo "    image: $FRONTEND_IMAGE:$VERSION"
    echo ""
    echo "Multi-architecture support:"
    echo "✅ linux/amd64 (Intel/AMD x64)"
    echo "✅ linux/arm64 (Apple Silicon, ARM servers)"
    echo ""
    echo "Next steps:"
    echo "1. Update production compose files to use Hub images"
    echo "2. Deploy to way2party.co.il: ./scripts/docker-hub-deploy.sh $VERSION"
    echo "3. Test deployment: curl https://way2party.co.il/health"
}

# Create deployment compose file
create_hub_compose() {
    print_header "Creating Docker Hub Compose File"

    cat > "$PROJECT_DIR/docker-compose.hub.yml" << EOF
# Docker Compose using Docker Hub images
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: trailguide-db-hub
    restart: unless-stopped
    environment:
      POSTGRES_DB: trailguide_production
      POSTGRES_USER: trailguide_prod
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - trailguide-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trailguide_prod -d trailguide_production"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: trailguide-redis-hub
    restart: unless-stopped
    command: redis-server --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - trailguide-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # API Backend (from Docker Hub)
  api:
    image: $API_IMAGE:$VERSION
    container_name: trailguide-api-hub
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
      - SESSION_SECRET=\${SESSION_SECRET}
      - PORT=3000
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - trailguide-network
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

  # Frontend (from Docker Hub)
  frontend:
    image: $FRONTEND_IMAGE:$VERSION
    container_name: trailguide-frontend-hub
    restart: unless-stopped
    networks:
      - trailguide-network
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # NGINX Reverse Proxy
  nginx:
    image: nginx:1.25-alpine
    container_name: trailguide-nginx-hub
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    networks:
      - trailguide-network
    depends_on:
      - frontend
      - api

volumes:
  postgres_data:
  redis_data:

networks:
  trailguide-network:
    driver: bridge
EOF

    print_success "Created docker-compose.hub.yml with Docker Hub images"
}

# Main push process
main() {
    print_header "TrailGuide PWA - Docker Hub Push"

    echo "Pushing version: $VERSION"
    echo "Registry: Docker Hub ($REGISTRY_PREFIX)"
    echo "Push latest tag: $PUSH_LATEST"
    echo ""

    check_prerequisites
    push_api
    push_frontend
    verify_push
    create_hub_compose
    show_hub_info
}

# Handle script arguments
case "${1:-push}" in
    "push"|"")
        shift
        VERSION=${1:-"latest"}
        main
        ;;
    "api")
        shift
        VERSION=${1:-"latest"}
        check_prerequisites
        push_api
        print_success "API image pushed: $API_IMAGE:$VERSION"
        ;;
    "frontend")
        shift
        VERSION=${1:-"latest"}
        check_prerequisites
        push_frontend
        print_success "Frontend image pushed: $FRONTEND_IMAGE:$VERSION"
        ;;
    "verify")
        shift
        VERSION=${1:-"latest"}
        verify_push
        ;;
    *)
        echo "Usage: $0 {push|api|frontend|verify} [version]"
        echo ""
        echo "Commands:"
        echo "  push      - Push both API and frontend images (default)"
        echo "  api       - Push only API image"
        echo "  frontend  - Push only frontend image"
        echo "  verify    - Verify images on Docker Hub"
        echo ""
        echo "Environment variables:"
        echo "  REGISTRY_PREFIX    - Docker Hub username/org (default: trailguide)"
        echo "  PUSH_LATEST       - Also push 'latest' tag (default: true)"
        echo ""
        echo "Examples:"
        echo "  $0 push 1.0.0              # Push version 1.0.0"
        echo "  $0 api latest              # Push API only"
        echo "  REGISTRY_PREFIX=myorg $0 push 1.0.0  # Custom registry"
        exit 1
        ;;
esac
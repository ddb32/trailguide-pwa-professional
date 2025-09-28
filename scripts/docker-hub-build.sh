#!/bin/bash
# Docker Hub Multi-Architecture Build Script for TrailGuide PWA
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
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
VERSION=${1:-"latest"}

# Docker Hub configuration
DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-"horenalon"}
REGISTRY_PREFIX=${DOCKER_HUB_USERNAME:-"horenalon"}

# Image names
API_IMAGE="${REGISTRY_PREFIX}/trailguide-api"
FRONTEND_IMAGE="${REGISTRY_PREFIX}/trailguide-frontend"

# Supported platforms
PLATFORMS="linux/amd64,linux/arm64"

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

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not found. Please install Docker."
        exit 1
    fi
    print_success "Docker found: $(docker --version)"

    # Check Docker Buildx
    if ! docker buildx version &> /dev/null; then
        print_error "Docker Buildx not found. Please enable BuildKit."
        exit 1
    fi
    print_success "Docker Buildx available"

    # Check Docker Hub login
    if ! docker info | grep -q "Username"; then
        print_warning "Not logged into Docker Hub. Run 'docker login' first."
        if [[ -n "$DOCKER_HUB_USERNAME" ]]; then
            print_warning "Using DOCKER_HUB_USERNAME: $DOCKER_HUB_USERNAME"
        else
            print_error "Please set DOCKER_HUB_USERNAME or login to Docker Hub"
            exit 1
        fi
    else
        print_success "Docker Hub login verified"
    fi

    # Check git repository
    if ! git rev-parse --git-dir &> /dev/null; then
        print_warning "Not in a git repository. Some metadata will be unavailable."
    else
        print_success "Git repository detected"
    fi
}

# Create buildx builder
setup_buildx() {
    print_header "Setting Up Multi-Architecture Builder"

    # Create or use existing builder
    BUILDER_NAME="trailguide-builder"

    if ! docker buildx ls | grep -q "$BUILDER_NAME"; then
        docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
        print_success "Created new buildx builder: $BUILDER_NAME"
    else
        docker buildx use "$BUILDER_NAME"
        print_success "Using existing buildx builder: $BUILDER_NAME"
    fi

    # Inspect builder
    docker buildx inspect --bootstrap
    print_success "Builder ready for multi-architecture builds"
}

# Build API image
build_api() {
    print_header "Building API Image: $API_IMAGE:$VERSION"

    cd "$PROJECT_DIR"

    # Build multi-architecture image
    docker buildx build \
        --platform "$PLATFORMS" \
        --file api/Dockerfile.prod \
        --tag "$API_IMAGE:$VERSION" \
        --tag "$API_IMAGE:latest" \
        --tag "$API_IMAGE:$GIT_COMMIT" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg GIT_BRANCH="$GIT_BRANCH" \
        --build-arg VERSION="$VERSION" \
        --label org.opencontainers.image.created="$BUILD_DATE" \
        --label org.opencontainers.image.source=https://github.com/trailguide/trailguide-pwa \
        --label org.opencontainers.image.version="$VERSION" \
        --label org.opencontainers.image.revision="$GIT_COMMIT" \
        --label org.opencontainers.image.title="TrailGuide API" \
        --label org.opencontainers.image.description="TrailGuide PWA API backend with Hebrew RTL support" \
        --label org.opencontainers.image.vendor="TrailGuide Team" \
        --label org.opencontainers.image.licenses=MIT \
        --cache-from type=registry,ref="$API_IMAGE:cache" \
        --cache-to type=registry,ref="$API_IMAGE:cache,mode=max" \
        --push \
        ./api

    print_success "API image built successfully"
}

# Build Frontend image
build_frontend() {
    print_header "Building Frontend Image: $FRONTEND_IMAGE:$VERSION"

    cd "$PROJECT_DIR"

    # Build multi-architecture image
    docker buildx build \
        --platform "$PLATFORMS" \
        --file frontend/Dockerfile.prod \
        --tag "$FRONTEND_IMAGE:$VERSION" \
        --tag "$FRONTEND_IMAGE:latest" \
        --tag "$FRONTEND_IMAGE:$GIT_COMMIT" \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg GIT_BRANCH="$GIT_BRANCH" \
        --build-arg VERSION="$VERSION" \
        --build-arg VITE_API_URL=/api \
        --build-arg VITE_PUBLIC_URL=/ \
        --label org.opencontainers.image.created="$BUILD_DATE" \
        --label org.opencontainers.image.source=https://github.com/trailguide/trailguide-pwa \
        --label org.opencontainers.image.version="$VERSION" \
        --label org.opencontainers.image.revision="$GIT_COMMIT" \
        --label org.opencontainers.image.title="TrailGuide Frontend" \
        --label org.opencontainers.image.description="TrailGuide PWA React frontend with Hebrew RTL support" \
        --label org.opencontainers.image.vendor="TrailGuide Team" \
        --label org.opencontainers.image.licenses=MIT \
        --cache-from type=registry,ref="$FRONTEND_IMAGE:cache" \
        --cache-to type=registry,ref="$FRONTEND_IMAGE:cache,mode=max" \
        --push \
        ./frontend

    print_success "Frontend image built successfully"
}

# Verify built images
verify_images() {
    print_header "Verifying Built Images"

    # List built images
    echo "API Images:"
    docker images "$API_IMAGE" --format "table {{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

    echo ""
    echo "Frontend Images:"
    docker images "$FRONTEND_IMAGE" --format "table {{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

    # Test API image
    print_success "Testing API image..."
    API_TEST_CONTAINER=$(docker run -d --rm -p 3001:3000 "$API_IMAGE:$VERSION")
    sleep 5

    if curl -f http://localhost:3001/api/v1/health &> /dev/null; then
        print_success "API image health check passed"
    else
        print_error "API image health check failed"
    fi

    docker stop "$API_TEST_CONTAINER" &> /dev/null || true

    # Test Frontend image
    print_success "Testing Frontend image..."
    FRONTEND_TEST_CONTAINER=$(docker run -d --rm -p 8081:80 "$FRONTEND_IMAGE:$VERSION")
    sleep 5

    if curl -f http://localhost:8081/ &> /dev/null; then
        print_success "Frontend image health check passed"
    else
        print_error "Frontend image health check failed"
    fi

    docker stop "$FRONTEND_TEST_CONTAINER" &> /dev/null || true
}

# Show build summary
show_summary() {
    print_header "Build Summary"

    echo -e "${GREEN}Successfully built TrailGuide PWA images!${NC}"
    echo ""
    echo "Images created:"
    echo "- $API_IMAGE:$VERSION"
    echo "- $API_IMAGE:latest"
    echo "- $API_IMAGE:$GIT_COMMIT"
    echo "- $FRONTEND_IMAGE:$VERSION"
    echo "- $FRONTEND_IMAGE:latest"
    echo "- $FRONTEND_IMAGE:$GIT_COMMIT"
    echo ""
    echo "Build metadata:"
    echo "- Version: $VERSION"
    echo "- Git commit: $GIT_COMMIT"
    echo "- Git branch: $GIT_BRANCH"
    echo "- Build date: $BUILD_DATE"
    echo "- Platforms: $PLATFORMS"
    echo ""
    echo "Next steps:"
    echo "1. Push to Docker Hub: ./scripts/docker-hub-push.sh $VERSION"
    echo "2. Deploy to production: ./scripts/docker-hub-deploy.sh $VERSION"
    echo "3. Verify deployment: curl https://way2party.co.il/health"
}

# Main build process
main() {
    print_header "TrailGuide PWA - Docker Hub Build"

    echo "Building version: $VERSION"
    echo "Git commit: $GIT_COMMIT"
    echo "Git branch: $GIT_BRANCH"
    echo "Platforms: $PLATFORMS"
    echo ""

    check_prerequisites
    setup_buildx
    build_api
    build_frontend
    # Skip local verification since images are pushed directly to registry
    # verify_images
    show_summary
}

# Handle script arguments
case "${1:-build}" in
    "build"|"")
        shift
        VERSION=${1:-"latest"}
        main
        ;;
    "api")
        shift
        VERSION=${1:-"latest"}
        check_prerequisites
        setup_buildx
        build_api
        print_success "API image built: $API_IMAGE:$VERSION"
        ;;
    "frontend")
        shift
        VERSION=${1:-"latest"}
        check_prerequisites
        setup_buildx
        build_frontend
        print_success "Frontend image built: $FRONTEND_IMAGE:$VERSION"
        ;;
    "test")
        shift
        VERSION=${1:-"latest"}
        verify_images
        ;;
    *)
        echo "Usage: $0 {build|api|frontend|test} [version]"
        echo ""
        echo "Commands:"
        echo "  build     - Build both API and frontend images (default)"
        echo "  api       - Build only API image"
        echo "  frontend  - Build only frontend image"
        echo "  test      - Test existing images"
        echo ""
        echo "Examples:"
        echo "  $0 build 1.0.0        # Build version 1.0.0"
        echo "  $0 api latest          # Build API only"
        echo "  $0 frontend develop    # Build frontend develop tag"
        exit 1
        ;;
esac
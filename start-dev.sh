#!/bin/bash
# Start TrailGuide PWA in Development Mode with NGINX on Port 80
# This simulates the production routing architecture

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting TrailGuide PWA Development with NGINX${NC}"
echo -e "${BLUE}=================================================${NC}"

# Stop any existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.dev-nginx.yml down 2>/dev/null || true

# Start NGINX development environment
echo -e "${YELLOW}Starting NGINX development environment...${NC}"
docker-compose -f docker-compose.dev-nginx.yml up -d

# Wait a moment for containers to fully start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check service health
echo -e "${YELLOW}Checking service health...${NC}"

# Test NGINX
if curl -sf http://localhost/health > /dev/null; then
    echo -e "${GREEN}✓ NGINX: Healthy${NC}"
else
    echo -e "${RED}✗ NGINX: Not responding${NC}"
    exit 1
fi

# Test API through NGINX
if curl -sf http://localhost/api/v1/health > /dev/null; then
    echo -e "${GREEN}✓ API (via NGINX): Healthy${NC}"
else
    echo -e "${RED}✗ API (via NGINX): Not responding${NC}"
    exit 1
fi

# Test Frontend through NGINX
if curl -sf http://localhost/ > /dev/null; then
    echo -e "${GREEN}✓ Frontend (via NGINX): Healthy${NC}"
else
    echo -e "${RED}✗ Frontend (via NGINX): Not responding${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 TrailGuide PWA is running with NGINX!${NC}"
echo ""
echo -e "${BLUE}Access your application:${NC}"
echo -e "  🌐 Frontend: http://localhost"
echo -e "  🔌 API: http://localhost/api/v1/health"
echo -e "  ❤️  Health: http://localhost/health"
echo ""
echo -e "${BLUE}Development Features:${NC}"
echo -e "  ✓ Hot reload still works"
echo -e "  ✓ All requests routed through NGINX (production simulation)"
echo -e "  ✓ Direct container access blocked (security simulation)"
echo -e "  ✓ CORS configured for NGINX routing"
echo ""
echo -e "${YELLOW}To stop: docker-compose -f docker-compose.dev-nginx.yml down${NC}"
echo -e "${YELLOW}To view logs: docker-compose -f docker-compose.dev-nginx.yml logs -f [service]${NC}"
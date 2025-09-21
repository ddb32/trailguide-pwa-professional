#!/bin/bash
# TrailGuide PWA - Environment Validation Script
# Prevents common development environment confusion

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 TrailGuide PWA Environment Validation${NC}"
echo "================================================="

# Check current directory
CURRENT_DIR=$(pwd)
echo -e "\n📂 Current Directory: ${CURRENT_DIR}"

# Determine environment
if [[ "$CURRENT_DIR" == *"/home/neo/dev/trailguide/trailguide-pwa"* ]]; then
    echo -e "${GREEN}✅ Docker Environment Detected${NC}"
    ENVIRONMENT="docker"
elif [[ "$CURRENT_DIR" == *"/home/neo/tools/mvp"* ]]; then
    echo -e "${YELLOW}⚠️  npm Environment Detected${NC}"
    ENVIRONMENT="npm"
    echo -e "${YELLOW}   Note: This is experimental environment - use only for prototyping${NC}"
else
    echo -e "${RED}❌ Unknown Environment${NC}"
    echo -e "${RED}   Expected: /home/neo/dev/trailguide/trailguide-pwa/ or /home/neo/tools/mvp/${NC}"
    exit 1
fi

echo ""

# Docker Environment Checks
if [[ "$ENVIRONMENT" == "docker" ]]; then
    echo -e "${BLUE}🐳 Docker Environment Validation${NC}"
    
    # Check if docker-compose.yml exists
    if [[ -f "docker-compose.yml" ]]; then
        echo -e "${GREEN}✅ docker-compose.yml found${NC}"
    else
        echo -e "${RED}❌ docker-compose.yml not found${NC}"
        echo -e "${RED}   Are you in the project root?${NC}"
        exit 1
    fi
    
    # Check Docker service
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Docker command available${NC}"
        
        # Check if Docker is running
        if docker info &> /dev/null; then
            echo -e "${GREEN}✅ Docker daemon running${NC}"
            
            # Check containers status
            if docker-compose ps 2>/dev/null | grep -q "Up"; then
                echo -e "${GREEN}✅ Docker containers running${NC}"
                
                # List running services
                echo -e "\n📊 Running Services:"
                docker-compose ps --format "table" 2>/dev/null || true
                
            else
                echo -e "${YELLOW}⚠️  Docker containers not running${NC}"
                echo -e "${BLUE}   Start with: docker-compose up -d${NC}"
            fi
        else
            echo -e "${RED}❌ Docker daemon not running${NC}"
            echo -e "${RED}   Start Docker desktop or service${NC}"
        fi
    else
        echo -e "${RED}❌ Docker not installed${NC}"
        echo -e "${RED}   Install Docker first${NC}"
    fi
    
    # Check environment file
    if [[ -f ".env.development" ]]; then
        echo -e "${GREEN}✅ .env.development found${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.development missing${NC}"
        echo -e "${BLUE}   Copy from: cp .env.example .env.development${NC}"
    fi
    
fi

# npm Environment Checks
if [[ "$ENVIRONMENT" == "npm" ]]; then
    echo -e "${BLUE}📦 npm Environment Validation${NC}"
    
    # Check if we're in frontend directory
    if [[ "$CURRENT_DIR" == *"/frontend" ]]; then
        echo -e "${GREEN}✅ In frontend directory${NC}"
        
        # Check package.json
        if [[ -f "package.json" ]]; then
            echo -e "${GREEN}✅ package.json found${NC}"
        else
            echo -e "${RED}❌ package.json not found${NC}"
            exit 1
        fi
        
        # Check node_modules
        if [[ -d "node_modules" ]]; then
            echo -e "${GREEN}✅ node_modules exists${NC}"
        else
            echo -e "${YELLOW}⚠️  node_modules missing${NC}"
            echo -e "${BLUE}   Run: npm install${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️  Not in frontend directory${NC}"
        echo -e "${BLUE}   Expected: /home/neo/tools/mvp/frontend/${NC}"
    fi
fi

# Port checks
echo -e "\n🌐 Port Availability Check"
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port &> /dev/null; then
        local process=$(lsof -i :$port -t)
        echo -e "${YELLOW}⚠️  Port $port ($service) in use by process $process${NC}"
        
        # Try to identify if it's our service
        if [[ "$ENVIRONMENT" == "docker" ]] && docker-compose ps 2>/dev/null | grep -q ":$port"; then
            echo -e "${GREEN}   ✅ Port used by our Docker service${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port $port ($service) available${NC}"
    fi
}

check_port 5173 "Frontend"
check_port 3000 "API"
check_port 5432 "PostgreSQL"

# Environment recommendations
echo -e "\n💡 Environment Recommendations"
if [[ "$ENVIRONMENT" == "docker" ]]; then
    echo -e "${GREEN}✅ Using recommended Docker environment${NC}"
    echo -e "   Perfect for: Production features, bug fixes, collaboration"
    
    if ! docker-compose ps 2>/dev/null | grep -q "Up"; then
        echo -e "\n🚀 To start development:"
        echo -e "   ${BLUE}docker-compose up -d${NC}"
        echo -e "   ${BLUE}open http://localhost:5173${NC}"
    else
        echo -e "\n🚀 Development URLs:"
        echo -e "   ${BLUE}Frontend: http://localhost:5173${NC}"
        echo -e "   ${BLUE}API: http://localhost:3000${NC}"
    fi
    
elif [[ "$ENVIRONMENT" == "npm" ]]; then
    echo -e "${YELLOW}⚠️  Using experimental npm environment${NC}"
    echo -e "   Good for: Quick prototypes, UI component testing"
    echo -e "   ${RED}Not suitable for: Production features, database work, final testing${NC}"
    
    echo -e "\n📚 Consider switching to Docker for:"
    echo -e "   • Authentication testing"
    echo -e "   • Database operations"  
    echo -e "   • Hebrew RTL testing"
    echo -e "   • Production feature development"
    echo -e "   • Final testing before commits"
    
    echo -e "\n🔄 To switch to Docker environment:"
    echo -e "   ${BLUE}cd /home/neo/dev/trailguide/trailguide-pwa/${NC}"
    echo -e "   ${BLUE}docker-compose up -d${NC}"
fi

# Final status
echo -e "\n📋 Summary"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Directory: ${CURRENT_DIR}"

if [[ "$ENVIRONMENT" == "docker" ]] && docker-compose ps 2>/dev/null | grep -q "Up"; then
    echo -e "Status: ${GREEN}Ready for development${NC}"
elif [[ "$ENVIRONMENT" == "npm" ]]; then
    echo -e "Status: ${YELLOW}Ready for prototyping${NC}"
else
    echo -e "Status: ${YELLOW}Needs setup${NC}"
fi

echo -e "\n💡 Need help? Check:"
echo -e "   📋 Developer Onboarding: ${BLUE}/DEVELOPER_ONBOARDING.md${NC}"
echo -e "   🚀 Quick Start Guide: ${BLUE}/dev/quick-start.md${NC}"

echo -e "\n================================================="
echo -e "${GREEN}Environment validation complete!${NC}"
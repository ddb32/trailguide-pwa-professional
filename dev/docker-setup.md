# Docker Setup Guide - TrailGuide PWA

## 1. Overview

This guide provides complete Docker-first development and deployment instructions for TrailGuide PWA. The entire system is containerized from day one, ensuring consistency between development and production environments.

### Docker-First Benefits
- **Consistent Environments**: Identical setup across all developers and deployment targets
- **One-Command Setup**: Complete system startup with `docker-compose up`
- **Production Parity**: Development environment mirrors production
- **Easy Scaling**: Horizontal scaling ready with container orchestration
- **Fast Onboarding**: New developers productive within minutes

> **🌐 Localization Requirement**: 
> Ensure that the TrailGuide PWA supports Hebrew with proper RTL layout for the Israeli audience.
> All text content should be stored in separate language-specific files (e.g., he.json or he.md), so that adding English (or other languages) in the future will be straightforward and maintainable.
> 
> **Docker Environment Considerations:**
> - Include locale environment variables in .env files (LOCALE=he-IL, TEXT_DIRECTION=rtl)
> - Set up development containers with Hebrew fonts and RTL testing tools
> - Configure browser developer tools and extensions for RTL layout testing

## 2. Prerequisites

### Required Software
- **Docker Desktop**: 20.10+ (includes Docker Compose V2)
- **Git**: For repository management
- **Code Editor**: VS Code recommended with Docker extension

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space for images and containers
- **OS**: Windows 10+, macOS 10.15+, or Linux with kernel 3.10+

### Installation Links
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- [Docker Engine for Linux](https://docs.docker.com/engine/install/)

## 3. Project Structure

```
trailguide-pwa/
├── api/                          # Backend API service
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/                     # Frontend React PWA
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── nginx/                        # Reverse proxy configuration
│   ├── nginx.conf
│   ├── dev.conf
│   └── prod.conf
├── postgres/                     # Database initialization
│   ├── init/
│   │   ├── 01-init-database.sql
│   │   └── 02-create-tables.sql
│   └── data/                     # Local development data (gitignored)
├── docker/                       # Docker configuration files
│   ├── docker-compose.yml        # Development environment
│   ├── docker-compose.prod.yml   # Production environment
│   └── docker-compose.override.yml # Local overrides (optional)
├── .env.example                  # Environment template
├── .env.development             # Development environment variables
├── .env.production              # Production environment variables
├── README.md
└── DOCKER-SETUP.md              # This file
```

## 4. Environment Configuration

### 4.1 Environment Files

#### `.env.example` (Template)
```bash
# ================================
# TrailGuide PWA Environment Template
# ================================

# Node Environment
NODE_ENV=development

# API Configuration
API_PORT=3000
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
DATABASE_URL=postgresql://trailguide:password@postgres:5432/trailguide_dev
POSTGRES_USER=trailguide
POSTGRES_PASSWORD=password
POSTGRES_DB=trailguide_dev

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 Configuration (Optional for local development)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=trailguide-images-dev

# Analytics Configuration
ENABLE_ANALYTICS=true
PLAUSIBLE_DOMAIN=localhost
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Development Tools
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Redis Configuration (Optional - for caching)
REDIS_URL=redis://redis:6379

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

#### `.env.development`
```bash
NODE_ENV=development
API_PORT=3000
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Local PostgreSQL
DATABASE_URL=postgresql://trailguide:devpassword123@postgres:5432/trailguide_dev
POSTGRES_USER=trailguide
POSTGRES_PASSWORD=devpassword123
POSTGRES_DB=trailguide_dev

# Development JWT (weaker security acceptable)
JWT_SECRET=development-jwt-secret-key-for-local-development-only
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Local file storage (S3 simulation)
USE_LOCAL_STORAGE=true
LOCAL_STORAGE_PATH=./uploads

# Development analytics
ENABLE_ANALYTICS=false
LOG_LEVEL=debug
CORS_ORIGIN=*

# Development rate limiting (more permissive)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10000
```

#### `.env.production`
```bash
NODE_ENV=production
API_PORT=3000
API_BASE_URL=https://api.trailguide.app
FRONTEND_URL=https://app.trailguide.app

# Production PostgreSQL
DATABASE_URL=postgresql://username:password@production-host:5432/trailguide_prod
# SSL required for production
DATABASE_SSL=true

# Strong production JWT
JWT_SECRET=your-super-strong-production-jwt-secret-minimum-64-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3 Production
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=trailguide-images-prod

# Production analytics
ENABLE_ANALYTICS=true
GA4_MEASUREMENT_ID=G-PROD12345678
PLAUSIBLE_DOMAIN=app.trailguide.app

# Production security
LOG_LEVEL=warn
CORS_ORIGIN=https://app.trailguide.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SSL/Security
SSL_CERT_PATH=/etc/ssl/certs/trailguide.crt
SSL_KEY_PATH=/etc/ssl/private/trailguide.key
```

### 4.2 Setting Up Environment Files

```bash
# Copy template and customize for development
cp .env.example .env.development

# For production (on server)
cp .env.example .env.production
# Then edit .env.production with actual production values
```

## 5. Docker Configuration Files

### 5.1 API Server Dockerfile

#### `api/Dockerfile`
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trailguide -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=trailguide:nodejs /app/dist ./dist
COPY --from=build --chown=trailguide:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=trailguide:nodejs /app/package.json ./package.json

# Create uploads directory with correct permissions
RUN mkdir -p ./uploads && chown -R trailguide:nodejs ./uploads

# Switch to non-root user
USER trailguide

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

#### `api/.dockerignore`
```
node_modules
dist
.git
.gitignore
README.md
.env*
.nyc_output
coverage
.DS_Store
*.log
uploads/*
!uploads/.gitkeep
```

### 5.2 Frontend Dockerfile

#### `frontend/Dockerfile`
```dockerfile
# Multi-stage build for optimized production bundle
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/prod.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### `frontend/.dockerignore`
```
node_modules
dist
.git
.gitignore
README.md
.env*
.DS_Store
*.log
coverage
```

### 5.3 Nginx Configuration

#### `nginx/nginx.conf`
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    gzip on;
    
    # Gzip compression
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    include /etc/nginx/conf.d/*.conf;
}
```

#### `nginx/prod.conf`
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # PWA service worker and manifest
    location /sw.js {
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /manifest.json {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (for production deployment)
    location /api/ {
        proxy_pass http://api:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

### 5.4 Database Initialization

#### `postgres/init/01-init-database.sql`
```sql
-- Create development database and user
CREATE USER trailguide WITH PASSWORD 'devpassword123';
CREATE DATABASE trailguide_dev OWNER trailguide;
GRANT ALL PRIVILEGES ON DATABASE trailguide_dev TO trailguide;

-- Create test database
CREATE DATABASE trailguide_test OWNER trailguide;
GRANT ALL PRIVILEGES ON DATABASE trailguide_test TO trailguide;

-- Connect to development database
\c trailguide_dev;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO trailguide;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trailguide;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trailguide;
```

## 6. Docker Compose Configuration

### 6.1 Development Environment

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: trailguide-postgres
    environment:
      POSTGRES_USER: trailguide
      POSTGRES_PASSWORD: devpassword123
      POSTGRES_DB: trailguide_dev
    ports:
      - "5432:5432"
    volumes:
      - ./postgres/init:/docker-entrypoint-initdb.d
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trailguide -d trailguide_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - trailguide-network

  # Redis (Optional - for caching and sessions)
  redis:
    image: redis:7-alpine
    container_name: trailguide-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - trailguide-network

  # API Server
  api:
    build:
      context: ./api
      target: development
      dockerfile: Dockerfile
    container_name: trailguide-api
    env_file:
      - .env.development
    ports:
      - "3000:3000"
    volumes:
      - ./api:/app
      - /app/node_modules  # Anonymous volume for node_modules
      - ./uploads:/app/uploads  # Local file storage
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
    networks:
      - trailguide-network
    restart: unless-stopped

  # Frontend Development Server
  frontend:
    build:
      context: ./frontend
      target: development
      dockerfile: Dockerfile
    container_name: trailguide-frontend
    env_file:
      - .env.development
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules  # Anonymous volume for node_modules
    depends_on:
      - api
    networks:
      - trailguide-network
    restart: unless-stopped

  # Nginx Reverse Proxy (Optional for development)
  nginx:
    image: nginx:alpine
    container_name: trailguide-nginx
    ports:
      - "8080:80"
    volumes:
      - ./nginx/dev.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api
      - frontend
    networks:
      - trailguide-network
    profiles:
      - proxy  # Only start with --profile proxy

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  trailguide-network:
    driver: bridge
    name: trailguide-network
```

### 6.2 Production Environment

#### `docker-compose.prod.yml`
```yaml
version: '3.8'

services:
  # Production API Server
  api:
    build:
      context: ./api
      target: production
      dockerfile: Dockerfile
    container_name: trailguide-api-prod
    env_file:
      - .env.production
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - trailguide-prod-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Production Frontend with Nginx
  frontend:
    build:
      context: ./frontend
      target: production
      dockerfile: Dockerfile
    container_name: trailguide-frontend-prod
    ports:
      - "80:80"
      - "443:443"  # For SSL in production
    volumes:
      - ./ssl:/etc/ssl:ro  # SSL certificates
      - ./logs/nginx:/var/log/nginx
    depends_on:
      api:
        condition: service_healthy
    restart: always
    networks:
      - trailguide-prod-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  trailguide-prod-network:
    driver: bridge
    name: trailguide-prod-network
```

## 7. Local Development Workflow

### 7.1 Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/trailguide-pwa.git
cd trailguide-pwa

# Copy environment configuration
cp .env.example .env.development

# Edit environment variables as needed
nano .env.development

# Start the entire development stack
docker-compose up -d

# View logs (optional)
docker-compose logs -f

# Check service health
docker-compose ps
```

### 7.2 Common Development Commands

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up api

# View logs
docker-compose logs -f api
docker-compose logs -f frontend

# Restart a service
docker-compose restart api

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild containers after code changes
docker-compose build api
docker-compose up -d api

# Execute commands inside containers
docker-compose exec api npm run migrate
docker-compose exec postgres psql -U trailguide -d trailguide_dev

# Access container shell
docker-compose exec api sh
docker-compose exec postgres bash
```

### 7.3 Database Operations

```bash
# Run database migrations
docker-compose exec api npm run migrate

# Seed database with test data
docker-compose exec api npm run seed

# Access PostgreSQL shell
docker-compose exec postgres psql -U trailguide -d trailguide_dev

# Backup database
docker-compose exec postgres pg_dump -U trailguide trailguide_dev > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U trailguide -d trailguide_dev
```

### 7.4 Testing in Docker

```bash
# Run API tests
docker-compose exec api npm test

# Run frontend tests
docker-compose exec frontend npm test

# Run E2E tests
docker-compose exec frontend npm run test:e2e

# Run tests with coverage
docker-compose exec api npm run test:coverage
```

## 8. Production Deployment

### 8.1 Server Requirements

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ LTS or CentOS 8+

**Recommended Requirements:**
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### 8.2 Server Setup

#### Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Install additional tools
sudo apt install -y git nginx certbot python3-certbot-nginx htop
```

#### Clone and Configure Application

```bash
# Create application directory
sudo mkdir -p /opt/trailguide
sudo chown $USER:$USER /opt/trailguide
cd /opt/trailguide

# Clone repository
git clone https://github.com/your-org/trailguide-pwa.git .

# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production

# Create necessary directories
mkdir -p uploads logs ssl
chmod 755 uploads logs
```

### 8.3 SSL Certificate Setup

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --nginx -d yourdomain.com -d api.yourdomain.com

# Copy certificates to application directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/trailguide/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/trailguide/ssl/
sudo chown $USER:$USER /opt/trailguide/ssl/*

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 8.4 Production Deployment

```bash
# Navigate to application directory
cd /opt/trailguide

# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run database migrations
docker-compose -f docker-compose.prod.yml exec api npm run migrate
```

### 8.5 Production Monitoring

#### Health Check Script

```bash
#!/bin/bash
# /opt/trailguide/scripts/health-check.sh

API_URL="https://api.yourdomain.com/api/v1/health"
FRONTEND_URL="https://yourdomain.com/health"

# Check API health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
if [ $API_STATUS -eq 200 ]; then
    echo "$(date): API is healthy"
else
    echo "$(date): API is down (Status: $API_STATUS)"
    # Restart API service
    cd /opt/trailguide
    docker-compose -f docker-compose.prod.yml restart api
fi

# Check Frontend health
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "$(date): Frontend is healthy"
else
    echo "$(date): Frontend is down (Status: $FRONTEND_STATUS)"
    # Restart frontend service
    cd /opt/trailguide
    docker-compose -f docker-compose.prod.yml restart frontend
fi
```

#### Setup Monitoring Cron Job

```bash
# Make script executable
chmod +x /opt/trailguide/scripts/health-check.sh

# Add to cron (check every 5 minutes)
echo "*/5 * * * * /opt/trailguide/scripts/health-check.sh >> /opt/trailguide/logs/health-check.log 2>&1" | crontab -
```

### 8.6 Backup Strategy

#### Automated Backup Script

```bash
#!/bin/bash
# /opt/trailguide/scripts/backup.sh

BACKUP_DIR="/opt/trailguide/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker-compose -f /opt/trailguide/docker-compose.prod.yml exec -T postgres pg_dump -U trailguide trailguide_prod > $BACKUP_DIR/database_$TIMESTAMP.sql

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz -C /opt/trailguide uploads/

# Environment backup
cp /opt/trailguide/.env.production $BACKUP_DIR/env_$TIMESTAMP.backup

# Clean old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "$(date): Backup completed - $TIMESTAMP"
```

#### Setup Backup Cron Job

```bash
# Make script executable
chmod +x /opt/trailguide/scripts/backup.sh

# Daily backup at 2 AM
echo "0 2 * * * /opt/trailguide/scripts/backup.sh >> /opt/trailguide/logs/backup.log 2>&1" | crontab -
```

## 9. Scaling and Orchestration

### 9.1 Docker Swarm Setup (Simple Orchestration)

```bash
# Initialize Docker Swarm on manager node
docker swarm init

# Create overlay network
docker network create -d overlay trailguide-swarm-network

# Deploy stack
docker stack deploy -c docker-compose.prod.yml trailguide

# Scale services
docker service scale trailguide_api=3
docker service scale trailguide_frontend=2

# Monitor services
docker service ls
docker service ps trailguide_api
```

### 9.2 Load Balancer Configuration

#### Nginx Load Balancer for API

```nginx
# /etc/nginx/sites-available/trailguide-lb
upstream api_servers {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    location / {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 10. Troubleshooting

### 10.1 Common Issues

#### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Host port 3001 instead of 3000
```

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U trailguide -d trailguide_dev -c "SELECT 1;"

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### Container Build Failures

```bash
# Clear Docker build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache api

# Check Dockerfile syntax
docker build -t test-build ./api
```

#### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/trailguide
chmod -R 755 /opt/trailguide

# Fix Docker socket permissions (Linux)
sudo chmod 666 /var/run/docker.sock
```

### 10.2 Performance Optimization

#### Container Resource Limits

```yaml
# In docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

#### Docker System Cleanup

```bash
# Remove unused containers, networks, images
docker system prune -a

# Remove specific images
docker image rm $(docker image ls -q)

# Clean up volumes (careful - removes data)
docker volume prune
```

### 10.3 Debugging

#### Container Debugging

```bash
# Access container shell
docker-compose exec api sh

# Check container logs
docker-compose logs -f --tail=100 api

# Inspect container
docker inspect trailguide-api

# Check container resource usage
docker stats
```

#### Application Debugging

```bash
# Debug API with Node.js debugger
docker-compose exec api npm run debug

# Check application logs
tail -f /opt/trailguide/logs/app.log

# Monitor database queries
docker-compose exec postgres tail -f /var/log/postgresql/postgresql.log
```

## 11. Security Guidelines

### 11.1 MVP Security Requirements

> **🔒 Essential Security for MVP Deployment**
> These security measures must be implemented from day one to prevent unauthorized access while keeping setup manageable.

#### 11.1.1 Environment Variables Security

**❌ NEVER commit `.env` files to version control**

```bash
# Add to .gitignore
.env
.env.development
.env.production
.env.local
*.env

# Secure environment file permissions
chmod 600 .env.development
chmod 600 .env.production

# Example secure environment variables
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://trailguide_app:SECURE_DEV_PASSWORD_123@postgres:5432/trailguide_dev
JWT_SECRET=your-development-jwt-secret-minimum-32-chars-long
JWT_EXPIRES_IN=24h  # Longer for development convenience
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_MAX_REQUESTS=1000  # More permissive for development

# .env.production  
NODE_ENV=production
DATABASE_URL=postgresql://trailguide_app:ULTRA_SECURE_PRODUCTION_PASSWORD@postgres:5432/trailguide_prod
JWT_SECRET=ultra-secure-production-jwt-secret-minimum-64-characters-long-random-string
JWT_EXPIRES_IN=15m  # Short expiry for security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100  # Strict limits for production
```

#### 11.1.2 Container Security - Non-Root Users

**⚠️ Run all containers as non-root users to limit attack surface**

Update Dockerfiles to include security measures:

```dockerfile
# API Dockerfile security enhancements
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trailguide -u 1001

# Set working directory with proper ownership
WORKDIR /app
RUN chown -R trailguide:nodejs /app

# Copy files with correct ownership
COPY --from=build --chown=trailguide:nodejs /app/dist ./dist
COPY --from=build --chown=trailguide:nodejs /app/node_modules ./node_modules

# Create uploads directory with secure permissions
RUN mkdir -p ./uploads && \
    chown -R trailguide:nodejs ./uploads && \
    chmod 750 ./uploads

# Remove unnecessary packages and clear cache
RUN apk del .build-deps && \
    rm -rf /var/cache/apk/* && \
    rm -rf /tmp/*

# Switch to non-root user
USER trailguide

# Security headers and health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

#### 11.1.3 Network Security - Docker Networks

```yaml
# docker-compose.yml security configuration
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    networks:
      - backend-network  # Isolated network
    # DO NOT expose ports in production
    # ports:
    #   - "5432:5432"  # Remove this line for production
    environment:
      POSTGRES_USER: trailguide_app
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password  # Use secrets
      POSTGRES_DB: trailguide_prod
    secrets:
      - postgres_password

  api:
    networks:
      - backend-network  # Database access
      - frontend-network  # Frontend communication
    # Only expose necessary ports
    ports:
      - "3000:3000"

  frontend:
    networks:
      - frontend-network
    ports:
      - "80:80"
      - "443:443"  # HTTPS only in production

networks:
  backend-network:
    driver: bridge
    internal: true  # No external access
  frontend-network:
    driver: bridge

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
```

#### 11.1.4 HTTPS Enforcement (Production)

```nginx
# nginx/prod.conf with security headers
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/yourdomain.com.pem;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none';" always;
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
}
```

#### 11.1.5 Rate Limiting and API Security

```yaml
# docker-compose.yml with rate limiting
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/rate-limit.conf:/etc/nginx/conf.d/rate-limit.conf
    
# nginx/rate-limit.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

server {
    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://api:3000;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://api:3000;
    }
}
```

#### 11.1.6 Secrets Management

```bash
# Create secrets directory (never commit to git)
mkdir -p secrets
chmod 700 secrets

# Store sensitive data in separate files
echo "ultra_secure_database_password" > secrets/postgres_password.txt
echo "jwt_secret_key_minimum_64_chars" > secrets/jwt_secret.txt
chmod 600 secrets/*

# Add to .gitignore
secrets/
*.key
*.pem
*.crt
```

### 11.2 Application Security Integration

#### 11.2.1 API Security Requirements

**All API endpoints must implement:**
- [ ] JWT authentication for protected routes
- [ ] Input validation and sanitization
- [ ] Rate limiting per endpoint
- [ ] Request logging (without sensitive data)
- [ ] Error handling that doesn't expose system information

#### 11.2.2 Frontend Security Requirements  

**PWA security checklist:**
- [ ] HTTPS enforcement in production
- [ ] Secure storage practices (no sensitive data in localStorage)
- [ ] Content Security Policy (CSP) headers
- [ ] Proper handling of authentication tokens
- [ ] Secure cookie settings for sessions

#### 11.2.3 Logging Security

```bash
# Log rotation and security
# /etc/logrotate.d/trailguide
/opt/trailguide/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 640 trailguide trailguide
    postrotate
        docker-compose -f /opt/trailguide/docker-compose.prod.yml restart api
    endscript
}

# Example secure logging configuration
LOG_LEVEL=warn  # Don't log sensitive debug info in production
LOG_SANITIZE=true  # Remove sensitive data from logs
LOG_MAX_FILES=10  # Limit log file retention
```

### 11.3 Best Practices

### 11.2 Performance

- **Multi-stage Builds**: Use multi-stage Dockerfiles to reduce image size
- **Layer Caching**: Optimize Dockerfile layer order for better caching
- **Resource Limits**: Set appropriate CPU and memory limits
- **Health Checks**: Implement proper health checks for all services

### 11.3 Monitoring

- **Logging**: Centralize logs with proper log rotation
- **Metrics**: Monitor container metrics and application performance
- **Alerting**: Set up alerts for critical service failures
- **Backups**: Automate database and file backups

This comprehensive Docker setup ensures that TrailGuide PWA can be developed locally and deployed to production with consistency, reliability, and ease of management.
# TrailGuide PWA - Docker Hub Repository

[![Docker Image Size](https://img.shields.io/docker/image-size/your-dockerhub-username/trailguide-api/latest)](https://hub.docker.com/r/your-dockerhub-username/trailguide-api)
[![Docker Pulls](https://img.shields.io/docker/pulls/your-dockerhub-username/trailguide-api)](https://hub.docker.com/r/your-dockerhub-username/trailguide-api)
[![Multi-Architecture](https://img.shields.io/badge/arch-amd64%20%7C%20arm64-blue)](https://hub.docker.com/r/your-dockerhub-username/trailguide-api)

A production-ready Progressive Web Application (PWA) for creating and managing trail guides with complete Hebrew RTL support. Built with React, Node.js, PostgreSQL, and optimized for enterprise deployment.

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# Download the production compose file
curl -O https://raw.githubusercontent.com/your-username/trailguide-pwa/main/docker-compose.hub.yml

# Set up environment variables
curl -O https://raw.githubusercontent.com/your-username/trailguide-pwa/main/.env.production.example
mv .env.production.example .env.production

# Edit environment variables (required)
nano .env.production

# Start the application
docker-compose -f docker-compose.hub.yml up -d
```

### Manual Docker Run

```bash
# Create network
docker network create trailguide-network

# Start PostgreSQL
docker run -d --name trailguide-db \
  --network trailguide-network \
  -e POSTGRES_DB=trailguide_prod \
  -e POSTGRES_USER=trailguide \
  -e POSTGRES_PASSWORD=your_secure_password \
  -v trailguide-db-data:/var/lib/postgresql/data \
  postgres:15-alpine

# Start Redis
docker run -d --name trailguide-redis \
  --network trailguide-network \
  redis:7-alpine

# Start API
docker run -d --name trailguide-api \
  --network trailguide-network \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://trailguide:your_secure_password@trailguide-db:5432/trailguide_prod \
  -e REDIS_URL=redis://trailguide-redis:6379 \
  -e JWT_SECRET=your_jwt_secret_here \
  -e NODE_ENV=production \
  your-dockerhub-username/trailguide-api:latest

# Start Frontend
docker run -d --name trailguide-frontend \
  --network trailguide-network \
  -p 80:80 \
  -e VITE_API_URL=http://localhost:3000 \
  your-dockerhub-username/trailguide-frontend:latest
```

## 📦 Available Images

### API Backend
- **Repository**: `your-dockerhub-username/trailguide-api`
- **Port**: 3000
- **Base**: Node.js 18 Alpine
- **Size**: ~150MB
- **Architectures**: amd64, arm64

### Frontend PWA
- **Repository**: `your-dockerhub-username/trailguide-frontend`
- **Port**: 80
- **Base**: NGINX Alpine
- **Size**: ~50MB
- **Architectures**: amd64, arm64

## 🔧 Configuration

### Required Environment Variables

#### API Backend
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your_256_bit_secret_key_here
JWT_EXPIRES_IN=24h

# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com

# Hebrew/RTL Support
DEFAULT_LANGUAGE=he
TIMEZONE=Asia/Jerusalem
```

#### Frontend PWA
```env
# API Configuration
VITE_API_URL=https://your-api-domain.com

# Application Settings
VITE_APP_NAME=TrailGuide
VITE_DEFAULT_LANGUAGE=he
VITE_ENABLE_RTL=true
```

### Optional Environment Variables

#### API Backend
```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Web Server**: NGINX (production)

### Key Features
- ✅ **Hebrew RTL Support** - Complete right-to-left interface
- ✅ **Progressive Web App** - Offline capability and mobile optimization
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **File Upload Support** - Image handling for trail guides
- ✅ **Multi-language** - Hebrew/English localization
- ✅ **Enterprise Security** - Rate limiting, CORS, security headers
- ✅ **Docker Optimized** - Multi-stage builds and Alpine Linux

## 🔒 Security Features

### Built-in Security
- SQL injection prevention with parameterized queries
- XSS protection with Content Security Policy
- CSRF protection and secure headers
- Rate limiting and DoS protection
- File upload validation with magic number verification
- JWT token security with secure key generation

### Security Headers
```
Content-Security-Policy: strict
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: restricted
```

## 🚀 Production Deployment

### SSL/HTTPS Setup (Recommended)

```yaml
version: '3.8'
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@domain.com"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-data:/data
    labels:
      - "traefik.enable=true"

  trailguide-api:
    image: your-dockerhub-username/trailguide-api:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"

  trailguide-frontend:
    image: your-dockerhub-username/trailguide-frontend:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
```

### Health Checks

Both images include comprehensive health checks:

```bash
# API Health Check
curl http://localhost:3000/api/v1/health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Scaling Configuration

```yaml
services:
  trailguide-api:
    image: your-dockerhub-username/trailguide-api:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## 📊 Monitoring

### Built-in Metrics
- Request/response times
- Error rates and types
- Database connection health
- Memory and CPU usage
- Security threat detection

### Log Format
```json
{
  "timestamp": "2024-01-20T10:30:00.000Z",
  "level": "info",
  "message": "Request processed",
  "method": "GET",
  "url": "/api/v1/guides",
  "status": 200,
  "duration": 45,
  "userAgent": "Mozilla/5.0..."
}
```

## 🔄 Updates

### Updating to Latest Version

```bash
# Pull latest images
docker-compose -f docker-compose.hub.yml pull

# Restart with zero downtime
docker-compose -f docker-compose.hub.yml up -d --force-recreate
```

### Version Pinning (Recommended)

```yaml
services:
  trailguide-api:
    image: your-dockerhub-username/trailguide-api:v1.2.3
  trailguide-frontend:
    image: your-dockerhub-username/trailguide-frontend:v1.2.3
```

## 🐛 Troubleshooting

### Common Issues

#### API Container Won't Start
```bash
# Check logs
docker logs trailguide-api

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Invalid JWT secret format
```

#### Database Connection Issues
```bash
# Test database connectivity
docker exec trailguide-api node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(r => console.log('✅ Connected:', r.rows[0])).catch(console.error);
"
```

#### Frontend Build Issues
```bash
# Check environment variables
docker exec trailguide-frontend printenv | grep VITE_

# Verify API connectivity
docker exec trailguide-frontend wget -qO- http://trailguide-api:3000/api/v1/health
```

### Debug Mode

```bash
# Enable debug logging
docker run -e LOG_LEVEL=debug your-dockerhub-username/trailguide-api:latest

# Enable development mode (not for production)
docker run -e NODE_ENV=development your-dockerhub-username/trailguide-api:latest
```

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Support

- **Documentation**: [GitHub Repository](https://github.com/your-username/trailguide-pwa)
- **Issues**: [GitHub Issues](https://github.com/your-username/trailguide-pwa/issues)
- **Docker Hub**: [Repository](https://hub.docker.com/r/your-dockerhub-username/trailguide-api)

---

**Note**: Replace `your-dockerhub-username` and `your-username` with your actual Docker Hub and GitHub usernames before deployment.
# TrailGuide PWA - Production Deployment Guide

*Last Updated: September 6, 2025*

## 🚀 Overview

This guide provides complete instructions for deploying TrailGuide PWA to production on a Contabo server (or any VPS) with custom domain, SSL/HTTPS, and automated deployment processes.

**Deployment Status**: ✅ **Production Ready** - Complete infrastructure implemented

---

## 📋 Prerequisites

### Server Requirements
- **VPS Provider**: Contabo (recommended) or any VPS with:
  - Ubuntu 20.04+ or Debian 11+
  - 4GB RAM minimum (8GB recommended)
  - 40GB SSD storage minimum
  - Docker and Docker Compose installed

### Domain Requirements
- Custom domain name (e.g., `your-domain.com`)
- DNS access for A record configuration
- Email address for Let's Encrypt SSL certificates

### Local Requirements
- Git access to the TrailGuide repository
- SSH access to your production server
- Basic familiarity with Docker and Linux commands

---

## 🔧 Server Setup

### 1. Initial Server Configuration

```bash
# Connect to your server
ssh root@your-server-ip

# Update system packages
apt update && apt upgrade -y

# Install required packages
apt install -y docker.io docker-compose git curl wget

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add user to docker group (optional)
usermod -aG docker $USER
```

### 2. Clone Repository

```bash
# Clone the project
git clone https://github.com/your-username/trailguide-pwa.git
cd trailguide-pwa

# Make deployment scripts executable
chmod +x deploy/deploy.sh
chmod +x deploy/ssl-setup.sh
chmod +x start-dev-nginx.sh
chmod +x start-dev-direct.sh
```

### 3. Configure Environment

```bash
# Copy production environment template
cp .env.production .env

# Edit production environment variables
nano .env
```

**Required Environment Variables**:
```bash
# Domain Configuration
DOMAIN=your-domain.com
SSL_EMAIL=your-email@domain.com

# Database Configuration
POSTGRES_DB=trailguide_prod
POSTGRES_USER=trailguide_user
POSTGRES_PASSWORD=your-secure-database-password

# API Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
NODE_ENV=production
API_PORT=3000

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100

# Optional: External Services
REDIS_URL=redis://redis:6379
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=your-s3-bucket
```

---

## 🌐 DNS Configuration

### Configure DNS Records

Point your domain to your server:

```dns
# A Record
Type: A
Name: @  (or your-domain.com)
Value: YOUR_SERVER_IP_ADDRESS
TTL: 300

# CNAME Record (optional for www)
Type: CNAME  
Name: www
Value: your-domain.com
TTL: 300
```

### Verify DNS Propagation

```bash
# Test DNS resolution
dig your-domain.com
nslookup your-domain.com

# Wait for DNS propagation (can take up to 48 hours)
```

---

## 🚀 Automated Deployment

### Option 1: Complete Automated Setup (Recommended)

```bash
# Run complete deployment with SSL setup
./deploy/deploy.sh your-domain.com

# This script will:
# 1. Validate environment configuration
# 2. Build production Docker images
# 3. Start production services
# 4. Run health checks
# 5. Setup SSL certificates automatically
# 6. Configure NGINX for HTTPS
```

### Option 2: Step-by-Step Manual Deployment

#### Step 1: Environment Setup
```bash
# Validate environment configuration
./deploy/deploy.sh --check-env

# Build production images
docker-compose -f docker-compose.prod.yml build
```

#### Step 2: Initial HTTP Deployment
```bash
# Start services with HTTP configuration
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

#### Step 3: SSL Certificate Setup
```bash
# Setup SSL certificates
./deploy/ssl-setup.sh your-domain.com your-email@domain.com

# This will:
# 1. Obtain Let's Encrypt certificates
# 2. Configure NGINX for HTTPS
# 3. Setup automatic certificate renewal
# 4. Restart services with SSL configuration
```

---

## 🔍 Verification & Testing

### 1. Service Health Checks

```bash
# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# NAME           STATE     PORTS
# nginx          Up        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# frontend       Up        
# api            Up        
# database       Up        5432/tcp
# redis          Up        6379/tcp
```

### 2. API Health Check

```bash
# Test API endpoints
curl https://your-domain.com/api/v1/health
# Expected: {"status":"healthy","timestamp":"..."}

curl https://your-domain.com/api/v1/info  
# Expected: API information JSON
```

### 3. Frontend Verification

```bash
# Test frontend loading
curl -I https://your-domain.com/
# Expected: HTTP/1.1 200 OK

# Test authentication page
curl -I https://your-domain.com/login
# Expected: HTTP/1.1 200 OK
```

### 4. SSL Certificate Check

```bash
# Check SSL certificate
curl -I https://your-domain.com
# Look for SSL-related headers

# Detailed SSL information
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

---

## 🔄 Ongoing Maintenance

### Regular Updates

```bash
# Update application code
git pull origin main

# Rebuild and restart services
./deploy/deploy.sh your-domain.com --update
```

### Database Backups

```bash
# Create database backup
docker exec trailguide-db pg_dump -U trailguide_user trailguide_prod > backup-$(date +%Y%m%d).sql

# Restore database backup
docker exec -i trailguide-db psql -U trailguide_user trailguide_prod < backup-20250906.sql
```

### Log Monitoring

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f database
```

### SSL Certificate Renewal

```bash
# Certificates auto-renew via certbot cron job
# Manual renewal if needed:
docker-compose -f docker-compose.prod.yml exec certbot certbot renew

# Check certificate expiry
docker-compose -f docker-compose.prod.yml exec certbot certbot certificates
```

---

## 🔧 Configuration Management

### Environment Variables

**Production Environment (`.env`)**:
```bash
# Core Configuration
DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com
NODE_ENV=production

# Database
POSTGRES_DB=trailguide_prod
POSTGRES_USER=trailguide_user  
POSTGRES_PASSWORD=ultra-secure-password

# Security
JWT_SECRET=super-secure-jwt-secret-minimum-32-characters
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100

# Optional Services
REDIS_URL=redis://redis:6379
```

### NGINX Configuration

**Production NGINX** (`nginx/nginx.conf`):
- SSL/TLS termination with A+ rating
- Security headers (HSTS, CSP, X-Frame-Options)
- Rate limiting and DDoS protection
- Gzip compression for static assets
- Proper proxy headers for backend API

### Docker Configuration

**Production Stack** (`docker-compose.prod.yml`):
- Multi-stage builds for optimized images
- Non-root container users for security
- Health checks for all services
- Persistent volumes for data storage
- Internal networking for security

---

## 🚨 Troubleshooting

### Common Issues

**1. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose -f docker-compose.prod.yml logs certbot

# Manual certificate acquisition
docker-compose -f docker-compose.prod.yml exec certbot \
  certbot --nginx -d your-domain.com --email your-email@domain.com --agree-tos --no-eff-email
```

**2. Database Connection Issues**
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs database

# Test database connectivity
docker-compose -f docker-compose.prod.yml exec api \
  node -e "require('./src/config/database.js').authenticate().then(() => console.log('DB Connected')).catch(console.error)"
```

**3. Frontend Build Issues**
```bash
# Rebuild frontend with verbose output
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# Check frontend container logs
docker-compose -f docker-compose.prod.yml logs frontend
```

**4. API Authentication Issues**
```bash
# Test authentication endpoint
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# Check JWT secret configuration
docker-compose -f docker-compose.prod.yml exec api env | grep JWT_SECRET
```

### Performance Optimization

**Database Performance**:
```bash
# Monitor database performance
docker exec trailguide-db psql -U trailguide_user -d trailguide_prod \
  -c "SELECT * FROM pg_stat_activity;"

# Database vacuum and analyze
docker exec trailguide-db psql -U trailguide_user -d trailguide_prod \
  -c "VACUUM ANALYZE;"
```

**NGINX Performance**:
```bash
# Check NGINX access logs
docker-compose -f docker-compose.prod.yml logs nginx | tail -100

# Monitor response times
docker-compose -f docker-compose.prod.yml exec nginx \
  tail -f /var/log/nginx/access.log
```

---

## 📊 Monitoring & Alerts

### Health Monitoring Setup

**System Monitoring**:
```bash
# CPU and Memory usage
docker stats

# Disk usage
df -h

# Check service uptime
docker-compose -f docker-compose.prod.yml ps
```

**Application Monitoring**:
```bash
# API health endpoint
curl https://your-domain.com/api/v1/health

# Database connectivity
curl https://your-domain.com/api/v1/info
```

### Log Rotation

```bash
# Configure logrotate for Docker logs
echo '/var/lib/docker/containers/*/*.log {
  daily
  rotate 7
  compress
  size=100M
  missingok
  delaycompress
  copytruncate
}' > /etc/logrotate.d/docker
```

---

## 🎯 Production Checklist

### Pre-Deployment
- [ ] Domain DNS configured and propagated
- [ ] Server meets minimum requirements  
- [ ] Environment variables configured
- [ ] SSL email address verified
- [ ] Backup strategy planned

### Post-Deployment
- [ ] All services running and healthy
- [ ] API endpoints responding correctly
- [ ] Frontend loading properly
- [ ] SSL certificate valid and A+ rated
- [ ] Authentication flow working
- [ ] Hebrew RTL interface working
- [ ] Mobile responsiveness verified
- [ ] Database backups scheduled
- [ ] Monitoring and alerting configured

### Security Verification
- [ ] HTTPS enforcement active
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] Database access restricted
- [ ] Container security hardened
- [ ] Firewall configured properly

---

## 🌟 Success Metrics

### Performance Targets
- **Page Load Time**: < 3 seconds
- **API Response Time**: < 200ms
- **SSL Rating**: A+ (SSLLabs)
- **Uptime**: > 99.9%

### Security Targets
- **SSL/TLS**: TLS 1.2+ only
- **Security Headers**: All major headers present
- **Authentication**: JWT with secure configuration
- **Rate Limiting**: Active on all public endpoints

**🎉 Your TrailGuide PWA is now production-ready with enterprise-grade infrastructure!**

For support and updates, refer to the project documentation or create an issue in the repository.
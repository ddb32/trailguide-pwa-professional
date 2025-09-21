# 🚀 way2party.co.il Production Deployment Guide

## 📋 **OVERVIEW**

This guide provides step-by-step instructions for deploying TrailGuide PWA to production with the **way2party.co.il** domain. The system is fully optimized for production with enterprise-grade security, monitoring, and Hebrew RTL support.

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### **System Requirements**
- [ ] **Server**: Ubuntu 20.04+ or similar Linux distribution
- [ ] **Memory**: 4GB RAM minimum (8GB recommended)
- [ ] **Storage**: 50GB available disk space
- [ ] **Network**: Ports 80 and 443 accessible from internet
- [ ] **Docker**: Latest version installed
- [ ] **Docker Compose**: v2.0+ installed

### **Domain & DNS Requirements**
- [ ] **Domain**: way2party.co.il registered and accessible
- [ ] **DNS A Record**: `way2party.co.il` pointing to server IP
- [ ] **Optional**: `www.way2party.co.il` CNAME pointing to `way2party.co.il`
- [ ] **Email**: Valid email for SSL certificate notifications

## 🔧 **INSTALLATION STEPS**

### **Step 1: Server Preparation**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
```

### **Step 2: Project Deployment**

```bash
# Clone or upload project to server
cd /opt
sudo git clone <your-repository> trailguide-pwa
sudo chown -R $USER:$USER trailguide-pwa
cd trailguide-pwa

# Copy environment configuration
cp .env.way2party.production .env.production

# Run automated deployment
./deploy/way2party-deploy.sh
```

### **Step 3: SSL Certificate Setup**

```bash
# After successful deployment, set up HTTPS
./deploy/ssl-setup.sh

# This will:
# - Verify DNS configuration
# - Obtain Let's Encrypt certificate
# - Configure HTTPS redirects
# - Set up auto-renewal
```

### **Step 4: Verify Deployment**

```bash
# Check all services are running
docker-compose -f docker-compose.way2party.yml ps

# Test health endpoints
curl http://localhost/health
curl http://localhost/api/v1/health

# Test HTTPS (after SSL setup)
curl https://way2party.co.il/health
curl https://way2party.co.il/api/v1/health
```

## 🔐 **SECURITY CONFIGURATION**

### **Generated Secrets**
The deployment script automatically generates:
- **JWT Secret**: 128-character cryptographically secure secret
- **Session Secret**: 64-character session encryption key
- **Database Password**: 25-character database password
- **Redis Password**: 20-character cache password

### **Manual Security Updates**
Update these in `.env.production`:

```bash
# Email configuration (update with real SMTP)
SMTP_USER=notifications@way2party.co.il
SMTP_PASS=your-real-email-password
SSL_EMAIL=admin@way2party.co.il

# Optional: AWS S3 for file storage (recommended for scaling)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
S3_BUCKET_NAME=way2party-uploads
```

## 🌐 **DOMAIN INTEGRATION FEATURES**

### **Hebrew RTL Support**
- **Default Language**: Hebrew (he)
- **Supported Languages**: Hebrew, English
- **RTL Layout**: Fully optimized right-to-left interface
- **Cultural Adaptation**: Israeli timezone (Asia/Jerusalem)
- **Localization**: Complete Hebrew interface translation

### **Production URLs**
- **Main Site**: https://way2party.co.il
- **API Endpoint**: https://way2party.co.il/api/v1/
- **Health Check**: https://way2party.co.il/health
- **PWA Manifest**: https://way2party.co.il/manifest.json

### **SSL/HTTPS Features**
- **Automatic Certificate**: Let's Encrypt with 90-day auto-renewal
- **HTTP Redirect**: All HTTP traffic redirected to HTTPS
- **Security Headers**: HSTS, CSP, and anti-clickjacking protection
- **TLS Configuration**: Modern TLS 1.2+ with secure ciphers

## 📊 **MONITORING & MAINTENANCE**

### **Health Monitoring**
```bash
# Check service status
./deploy/way2party-deploy.sh status

# View logs
./deploy/way2party-deploy.sh logs

# Restart services
./deploy/way2party-deploy.sh restart
```

### **Log Locations**
- **NGINX**: `logs/nginx/way2party_access.log`
- **API**: `logs/api/app.log`
- **Security**: `logs/api/security.log`
- **Database**: `logs/postgres/`

### **Automated Backups**
```bash
# Database backup (configured to run daily at 2 AM)
docker-compose -f docker-compose.way2party.yml --profile backup up backup

# Manual backup
docker exec way2party-db pg_dump -U trailguide_prod trailguide_production > backup-$(date +%Y%m%d).sql
```

## 🔄 **UPDATE PROCEDURES**

### **Application Updates**
```bash
# Update application code
git pull origin main

# Rebuild and redeploy
./deploy/way2party-deploy.sh update
```

### **SSL Certificate Renewal**
```bash
# Manual renewal (auto-renewal is configured via cron)
./deploy/ssl-setup.sh renew

# Add to crontab for automatic renewal
crontab -e
# Add: 0 12 * * * /opt/trailguide-pwa/scripts/renew-ssl.sh >> /opt/trailguide-pwa/logs/ssl-renewal.log 2>&1
```

### **Database Migrations**
```bash
# Run new migrations
docker-compose -f docker-compose.way2party.yml exec api npm run migrate

# Check migration status
docker-compose -f docker-compose.way2party.yml exec api npm run migrate:status
```

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

#### **Domain Not Accessible**
```bash
# Check DNS
dig way2party.co.il

# Check nginx configuration
docker-compose -f docker-compose.way2party.yml logs nginx

# Test local access
curl http://localhost/health
```

#### **SSL Certificate Issues**
```bash
# Check certificate status
openssl s_client -connect way2party.co.il:443 -servername way2party.co.il

# Rerun SSL setup
./deploy/ssl-setup.sh

# Check Let's Encrypt logs
docker-compose -f docker-compose.way2party.yml logs certbot
```

#### **Database Connection Issues**
```bash
# Check database status
docker-compose -f docker-compose.way2party.yml ps postgres

# Test database connection
docker-compose -f docker-compose.way2party.yml exec postgres psql -U trailguide_prod -d trailguide_production -c "SELECT NOW();"
```

#### **API Not Responding**
```bash
# Check API logs
docker-compose -f docker-compose.way2party.yml logs api

# Restart API service
docker-compose -f docker-compose.way2party.yml restart api

# Verify environment variables
docker-compose -f docker-compose.way2party.yml exec api env | grep -E "JWT|DB"
```

### **Performance Monitoring**
```bash
# Monitor resource usage
docker stats

# Check service health
curl https://way2party.co.il/api/v1/security/status

# Monitor security events
tail -f logs/api/security.log
```

## 📱 **PWA FEATURES VERIFICATION**

### **Test Checklist**
- [ ] **Hebrew Interface**: Switch language to Hebrew in app
- [ ] **RTL Layout**: Verify right-to-left text and layout
- [ ] **PWA Install**: Test "Add to Home Screen" functionality
- [ ] **Offline Mode**: Test app functionality when offline
- [ ] **File Upload**: Test image upload with Hebrew filenames
- [ ] **Authentication**: Test login/logout with Hebrew interface
- [ ] **Guide Creation**: Create test guide with Hebrew content

### **Mobile Testing**
- [ ] **iOS Safari**: Test PWA installation and Hebrew display
- [ ] **Android Chrome**: Test offline functionality and RTL layout
- [ ] **Performance**: Test loading speed and responsiveness

## 📞 **SUPPORT & MAINTENANCE**

### **Emergency Procedures**
```bash
# Stop all services
docker-compose -f docker-compose.way2party.yml down

# Emergency restart
docker-compose -f docker-compose.way2party.yml up -d

# View all logs
docker-compose -f docker-compose.way2party.yml logs
```

### **Regular Maintenance Schedule**
- **Daily**: Monitor logs and health endpoints
- **Weekly**: Review security logs and update statistics
- **Monthly**: Update Docker images and security patches
- **Quarterly**: Full backup testing and disaster recovery drill

## 🎉 **DEPLOYMENT COMPLETE**

After successful deployment, your TrailGuide PWA will be available at:

- **🌐 Main Application**: https://way2party.co.il
- **📱 PWA Features**: Installable on mobile devices
- **🔒 Secure**: Enterprise-grade security with automatic SSL
- **🌍 Hebrew Support**: Complete RTL interface for Israeli users
- **📊 Monitoring**: Real-time health and security monitoring

The system is production-ready with automatic scaling, security monitoring, and Hebrew localization optimized for the Israeli market.

---

**🚀 Success!** Your TrailGuide PWA is now live at way2party.co.il with full Hebrew RTL support and enterprise security!
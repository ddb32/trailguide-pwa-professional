# Docker Hub Repository Setup Guide

This guide provides step-by-step instructions for creating Docker Hub repositories and uploading the TrailGuide PWA project.

## 📋 Prerequisites

1. **Docker Hub Account**: Ensure you have a Docker Hub account
2. **Docker Hub Access Token**: Generate a personal access token for authentication
3. **Local Docker**: Docker installed and running on your machine
4. **GitHub Repository**: Optional, for automated CI/CD

## 🏗️ Step 1: Create Docker Hub Repositories

### Manual Repository Creation

1. **Login to Docker Hub**
   - Go to [hub.docker.com](https://hub.docker.com)
   - Sign in with your credentials

2. **Create API Repository**
   - Click "Create Repository"
   - Repository Name: `trailguide-api`
   - Description: `TrailGuide PWA Backend API with Hebrew RTL support`
   - Visibility: Public (or Private if preferred)
   - Click "Create"

3. **Create Frontend Repository**
   - Click "Create Repository"
   - Repository Name: `trailguide-frontend`
   - Description: `TrailGuide PWA Frontend Application with Hebrew RTL support`
   - Visibility: Public (or Private if preferred)
   - Click "Create"

### Automated Repository Creation (CLI)

```bash
# Install Docker Hub CLI (if not already installed)
npm install -g docker-hub-api

# Login to Docker Hub
docker login

# Create repositories using the provided scripts
./scripts/docker-hub-create-repos.sh
```

## 🔑 Step 2: Set Up Authentication

### Generate Docker Hub Access Token

1. Go to [Account Settings > Security](https://hub.docker.com/settings/security)
2. Click "New Access Token"
3. Token Description: `TrailGuide PWA CI/CD`
4. Access Permissions: `Read, Write, Delete`
5. Click "Generate"
6. **Save the token securely** - you won't see it again

### Configure Local Docker

```bash
# Login with your Docker Hub credentials
docker login

# Verify login
docker info | grep Username
```

## 📦 Step 3: Build and Push Images

### Option A: Using Automated Scripts (Recommended)

```bash
# Set your Docker Hub username
export DOCKER_HUB_USERNAME="your-dockerhub-username"

# Build multi-architecture images
./scripts/docker-hub-build.sh

# Push to Docker Hub
./scripts/docker-hub-push.sh

# Deploy complete stack
./scripts/docker-hub-deploy.sh
```

### Option B: Manual Build and Push

```bash
# Set variables
DOCKER_HUB_USERNAME="your-dockerhub-username"
VERSION="v1.0.0"  # or "latest"

# Create multi-architecture builder
docker buildx create --name trailguide-builder --use
docker buildx inspect --bootstrap

# Build and push API
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag $DOCKER_HUB_USERNAME/trailguide-api:$VERSION \
  --tag $DOCKER_HUB_USERNAME/trailguide-api:latest \
  --file ./api/Dockerfile.prod \
  --push \
  ./api

# Build and push Frontend
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag $DOCKER_HUB_USERNAME/trailguide-frontend:$VERSION \
  --tag $DOCKER_HUB_USERNAME/trailguide-frontend:latest \
  --file ./frontend/Dockerfile.prod \
  --push \
  ./frontend
```

## 🔄 Step 4: Set Up Automated CI/CD (Optional)

### GitHub Actions Setup

1. **Add Repository Secrets**
   - Go to your GitHub repository
   - Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `DOCKER_HUB_USERNAME`: Your Docker Hub username
     - `DOCKER_HUB_ACCESS_TOKEN`: Your Docker Hub access token

2. **Workflow Configuration**
   - The GitHub Actions workflow is already configured in `.github/workflows/docker-hub-deploy.yml`
   - It will automatically build and push on:
     - Push to `main` branch
     - Version tags (`v*`)
     - Manual workflow dispatch

### Trigger Automated Build

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# Or push to main branch
git push origin main
```

## 🚀 Step 5: Deploy Using Docker Hub Images

### Quick Deployment

```bash
# Download deployment files
curl -O https://raw.githubusercontent.com/your-username/trailguide-pwa/main/docker-compose.hub.yml
curl -O https://raw.githubusercontent.com/your-username/trailguide-pwa/main/.env.hub.example

# Configure environment
cp .env.hub.example .env.production
nano .env.production  # Edit with your values

# Deploy
docker-compose -f docker-compose.hub.yml up -d
```

### Production Deployment

1. **Set Environment Variables**
   ```bash
   # Copy example environment file
   cp .env.hub.example .env.production

   # Required configuration
   DOCKER_HUB_USERNAME=your-dockerhub-username
   POSTGRES_PASSWORD=your_secure_database_password
   JWT_SECRET=your_256_bit_jwt_secret
   CORS_ORIGIN=https://your-domain.com
   VITE_API_URL=https://api.your-domain.com
   ```

2. **Deploy Stack**
   ```bash
   # Start all services
   docker-compose -f docker-compose.hub.yml up -d

   # Check status
   docker-compose -f docker-compose.hub.yml ps

   # View logs
   docker-compose -f docker-compose.hub.yml logs -f
   ```

3. **Health Check**
   ```bash
   # API health check
   curl http://localhost:3000/api/v1/health

   # Frontend access
   curl http://localhost/
   ```

## 📊 Step 6: Monitor and Maintain

### Image Updates

```bash
# Pull latest images
docker-compose -f docker-compose.hub.yml pull

# Restart with new images
docker-compose -f docker-compose.hub.yml up -d --force-recreate
```

### Version Management

```bash
# Deploy specific version
DOCKER_HUB_USERNAME=your-username API_VERSION=v1.2.0 FRONTEND_VERSION=v1.2.0 \
  docker-compose -f docker-compose.hub.yml up -d
```

### Monitoring

```bash
# View resource usage
docker stats

# Check container health
docker-compose -f docker-compose.hub.yml ps

# View application logs
docker-compose -f docker-compose.hub.yml logs -f api
docker-compose -f docker-compose.hub.yml logs -f frontend
```

## 🔧 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check Docker daemon
docker info

# Clear build cache
docker buildx prune

# Rebuild without cache
docker buildx build --no-cache ...
```

**Push Failures**
```bash
# Re-authenticate
docker logout
docker login

# Check repository permissions
docker push your-username/trailguide-api:latest
```

**Deployment Issues**
```bash
# Check environment variables
docker-compose -f docker-compose.hub.yml config

# View detailed logs
docker-compose -f docker-compose.hub.yml logs --timestamps
```

### Support Resources

- **Docker Hub**: [hub.docker.com/r/your-username/trailguide-api](https://hub.docker.com)
- **Documentation**: Project README and docs/ directory
- **Issues**: GitHub repository issues
- **Community**: Docker Community Forums

## 📝 Security Considerations

### Production Security

1. **Use Specific Versions**
   ```yaml
   services:
     api:
       image: your-username/trailguide-api:v1.2.3  # Not 'latest'
   ```

2. **Secure Environment Variables**
   - Use Docker secrets or external secret management
   - Never commit `.env.production` to version control

3. **Regular Updates**
   ```bash
   # Check for security updates
   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
     aquasec/trivy image your-username/trailguide-api:latest
   ```

4. **Network Security**
   - Use private networks in production
   - Configure firewalls and load balancers appropriately

This setup provides a complete Docker Hub deployment pipeline for the TrailGuide PWA with automated builds, security scanning, and production-ready configurations.
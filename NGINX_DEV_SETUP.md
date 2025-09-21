# NGINX Development Setup - Port 80 Production Simulation

## 🎯 Overview

This setup adds NGINX reverse proxy to your development environment, running on **port 80** to simulate the exact production routing architecture. This allows you to test and verify that your application works correctly with NGINX before deploying to production.

## ✅ What's Implemented

### **NGINX Reverse Proxy on Port 80**
- ✅ Routes all requests through NGINX (production simulation)
- ✅ API requests: `http://localhost/api/...` → API container
- ✅ Frontend requests: `http://localhost/...` → Frontend container
- ✅ Direct container access blocked (security simulation)

### **Development-Friendly Features**
- ✅ Hot Module Replacement (HMR) still works
- ✅ Vite development server fully supported
- ✅ WebSocket support for hot reload
- ✅ Development-friendly CORS settings
- ✅ Permissive rate limiting for development

### **Production Simulation**
- ✅ Same routing logic as production
- ✅ Security headers applied
- ✅ Proper proxy headers
- ✅ CORS configured correctly
- ✅ Internal container networking

## 🚀 Quick Start

### **Start NGINX Development Mode**
```bash
./start-dev-nginx.sh
```
**Access your app at: http://localhost**

### **Switch Back to Direct Mode**
```bash
./start-dev-direct.sh
```
**Access your app at: http://localhost:5173**

## 📋 Manual Commands

### **Start NGINX Development Environment**
```bash
# Stop any running containers
docker-compose down
docker-compose -f docker-compose.dev-nginx.yml down

# Start NGINX development stack
docker-compose -f docker-compose.dev-nginx.yml up -d
```

### **Stop NGINX Development Environment**
```bash
docker-compose -f docker-compose.dev-nginx.yml down
```

### **View Logs**
```bash
# All services
docker-compose -f docker-compose.dev-nginx.yml logs -f

# Specific service
docker-compose -f docker-compose.dev-nginx.yml logs -f nginx
docker-compose -f docker-compose.dev-nginx.yml logs -f api
docker-compose -f docker-compose.dev-nginx.yml logs -f frontend
```

## 🔧 Architecture Comparison

### **Regular Development Mode**
```
Browser → http://localhost:5173 → Frontend Container (Direct)
Browser → http://localhost:3000 → API Container (Direct)
```

### **NGINX Development Mode (Production Simulation)**
```
Browser → http://localhost → NGINX → Frontend Container
Browser → http://localhost/api → NGINX → API Container
```

## ✅ Verification Tests

### **Basic Connectivity**
```bash
# NGINX health check
curl http://localhost/health
# Expected: "nginx-dev-healthy"

# API health check
curl http://localhost/api/v1/health
# Expected: JSON with service info

# Frontend accessibility
curl -I http://localhost/
# Expected: HTTP 200 OK
```

### **Security Verification**
```bash
# Direct container access should be blocked
curl http://localhost:5173/
# Expected: Connection refused

curl http://localhost:3000/api/v1/health
# Expected: Connection refused
```

### **CORS Testing**
```bash
# Test with proper origin header
curl -H "Origin: http://localhost" http://localhost/api/v1/welcome
# Expected: JSON response with Hebrew content
```

## 🔍 Key Benefits

### **Production Readiness Testing**
- Test exact same routing as production
- Verify NGINX configuration works
- Catch proxy/routing issues early
- Validate security headers

### **Development Workflow**
- Hot reload still works perfectly
- All development tools functional
- Easy switch between modes
- No code changes required

### **Security Testing**
- Direct container access blocked
- Proper CORS configuration
- Security headers applied
- Rate limiting functional

## 📁 Files Created

```
trailguide-pwa/
├── docker-compose.dev-nginx.yml    # NGINX development stack
├── nginx/dev/default.conf          # Development NGINX config
├── start-dev-nginx.sh             # Start NGINX development mode
├── start-dev-direct.sh             # Start direct development mode
└── NGINX_DEV_SETUP.md             # This documentation
```

## 🎯 When to Use Each Mode

### **Use NGINX Development Mode When:**
- Testing production routing behavior
- Verifying NGINX configuration
- Testing security headers and CORS
- Final testing before production deployment
- Debugging proxy/routing issues

### **Use Direct Development Mode When:**
- Regular development work
- Debugging frontend/API issues
- Maximum development speed needed
- Testing container-specific behavior

## 🚀 Production Migration Benefits

With this setup, you can be confident that:
- ✅ **Routing works identically** in development and production
- ✅ **NGINX configuration is tested** before going live
- ✅ **CORS and security headers** are properly configured
- ✅ **Proxy behavior** matches production exactly
- ✅ **No surprises** when deploying to production server

## 🔄 Switching Between Modes

The setup makes it easy to switch between development modes:

1. **NGINX Mode**: `./start-dev-nginx.sh` → `http://localhost`
2. **Direct Mode**: `./start-dev-direct.sh` → `http://localhost:5173`

Both modes maintain full development functionality while providing different levels of production simulation.

---

**Your development environment now perfectly simulates the production architecture!** 🎉
# TrailGuide PWA - System Architecture

*Last Updated: September 6, 2025*

## 📋 System Overview

TrailGuide PWA is a comprehensive visual navigation system designed for unmapped spaces, featuring a professional organizer dashboard and mobile-optimized end-user experience. The system supports Hebrew RTL interfaces and includes complete production deployment infrastructure.

### 🎯 Core Experiences

1. **🎛️ Organizer Dashboard** - Web interface for creating and managing visual guides
2. **📱 End-User PWA** - Mobile-optimized step-by-step navigation experience

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                     │
│                  (Port 80/443 - SSL/TLS)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌──────────────┐            ┌──────────────┐
│   Frontend   │            │   Backend    │
│ React 18 PWA │            │  Express.js  │
│ (Port 5173)  │            │ (Port 3000)  │
└──────┬───────┘            └──────┬───────┘
       │                           │
       │                           ▼
       │                  ┌──────────────┐
       │                  │ PostgreSQL   │
       │                  │ (Port 5432)  │
       │                  └──────────────┘
       │
       ▼
┌──────────────┐
│ Static Files │
│ CDN/Storage  │
└──────────────┘
```

---

## 🖥️ Frontend Architecture

### Technology Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS with custom design system
- **Routing**: React Router v6 with protected routes
- **State Management**: Context API pattern
- **Internationalization**: i18next with Hebrew RTL support

### Component Structure
```
frontend/src/
├── components/           # Reusable UI components
│   ├── Layout/          # Navigation and layout components
│   ├── Auth/            # Authentication components
│   └── common/          # Shared UI elements
├── pages/               # Route-level page components
│   ├── Dashboard/       # Organizer dashboard
│   ├── Login/           # Authentication pages
│   └── CreateGuide/     # Guide creation interface
├── contexts/            # React Context providers
│   └── AuthContext.js   # Authentication state management
├── i18n/                # Internationalization
│   ├── locales/         # Translation files
│   └── useLanguageDirection.js  # RTL utilities
└── hooks/               # Custom React hooks
```

### Design System Features
- **Professional UI/UX**: Consistent spacing, typography, and color schemes
- **Hebrew RTL Excellence**: Complete right-to-left interface with cultural considerations
- **Mobile-First**: Responsive design with touch-friendly interactions
- **Accessibility**: WCAG-compliant focus states and keyboard navigation

---

## 🔧 Backend Architecture

### Technology Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: JWT with bcrypt password hashing
- **Security**: Helmet.js, CORS, rate limiting
- **File Upload**: Multer with cloud storage integration

### API Structure
```
api/src/
├── routes/              # API endpoint definitions
│   ├── auth.js         # Authentication endpoints
│   ├── guides.js       # Guide management (in development)
│   └── public.js       # Public guide access
├── middleware/          # Express middleware
│   ├── auth.js         # JWT authentication
│   └── validation.js   # Input validation
├── config/              # Configuration files
│   └── database.js     # PostgreSQL configuration
└── app.js              # Express application setup
```

### Database Schema
```sql
-- Users table (Implemented)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'organizer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guides/Events table (Planned)
CREATE TABLE guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES users(id),
    event_name VARCHAR(255) NOT NULL,
    status guide_status DEFAULT 'draft',
    expiration_date TIMESTAMP,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Steps table (Planned)
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID REFERENCES guides(id),
    step_order INTEGER NOT NULL,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Production Infrastructure

### Docker Architecture
```yaml
# Production Stack (docker-compose.prod.yml)
services:
  nginx:           # Reverse proxy with SSL termination
  frontend:        # React production build
  api:             # Node.js backend
  database:        # PostgreSQL with persistent storage
  redis:           # Session and caching store
  certbot:         # SSL certificate automation
```

### NGINX Configuration
- **SSL/TLS**: Let's Encrypt certificates with auto-renewal
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **Compression**: Gzip for static assets
- **Caching**: Static file caching with proper cache headers
- **Rate Limiting**: API endpoint protection

### Security Features
- **Container Security**: Non-root users, minimal attack surface
- **Network Security**: Internal container networking
- **Data Security**: Encrypted database connections
- **Access Control**: JWT-based authentication with role management

---

## 🔐 Security Architecture

### Authentication Flow
```
1. User Login → API validates credentials → JWT token issued
2. Frontend stores token → Includes in API requests
3. API middleware validates token → Grants access to protected resources
4. Token refresh mechanism maintains session security
```

### Security Measures
- **Password Security**: bcrypt hashing with secure rounds
- **Rate Limiting**: Protection against brute force attacks
- **CORS**: Configured for specific origins only
- **Security Headers**: Comprehensive security header implementation
- **Input Validation**: Server-side validation for all inputs

---

## 🌐 Internationalization Architecture

### Language Support
- **Primary**: Hebrew (he) with RTL layout
- **Secondary**: English (en) with LTR layout
- **Extensible**: Architecture supports additional languages

### Implementation
```javascript
// Language detection hierarchy:
1. User preference (stored in JWT/localStorage)
2. Accept-Language header
3. Default to Hebrew

// RTL/LTR switching:
- Automatic CSS direction switching
- Icon and layout mirroring
- Text alignment adjustments
```

### File Structure
```
i18n/locales/
├── en.json              # English translations
├── he.json              # Hebrew translations
└── index.js             # i18n configuration
```

---

## 📱 Progressive Web App Features

### PWA Capabilities
- **App Manifest**: Native app-like installation
- **Service Worker**: Offline functionality (temporarily disabled)
- **Responsive Design**: Mobile-first with desktop enhancement
- **Touch Optimization**: Gesture-friendly interactions

### Caching Strategy
```
- Static Assets: Cache-first with versioning
- API Responses: Network-first with fallback
- Images: Cache-first with size optimization
- Offline Pages: Pre-cached essential content
```

---

## 🔄 Development Architecture

### Environment Separation
```bash
# Development Environment
- Direct container access (ports 3000, 5173, 5432)
- Hot module replacement
- Development-friendly CORS
- Debug logging enabled

# NGINX Development (Production Simulation)  
- All requests through NGINX on port 80
- Production routing simulation
- SSL-ready configuration
- Container networking isolation

# Production Environment
- NGINX reverse proxy with SSL
- Optimized container builds
- Security hardening
- Performance monitoring
```

### Development Tools
- **Hot Reload**: Vite dev server with HMR
- **Live Reload**: API server with nodemon
- **Database**: PostgreSQL with persistent volumes
- **Monitoring**: Docker health checks and logging

---

## 📊 Performance Architecture

### Frontend Optimization
- **Bundle Splitting**: Code splitting by routes
- **Lazy Loading**: Dynamic imports for non-critical components
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Aggressive browser and CDN caching

### Backend Optimization
- **Database**: Indexed queries, connection pooling
- **API Responses**: Compression and efficient serialization
- **Static Files**: CDN delivery with cache headers
- **Monitoring**: Performance metrics and health checks

---

## 🔍 Monitoring & Analytics

### System Monitoring
- **Health Checks**: Automated endpoint monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time and resource usage
- **Security Monitoring**: Failed authentication attempts

### User Analytics
- **Usage Tracking**: Guide views and navigation patterns
- **Error Reporting**: Client-side error collection
- **Performance Monitoring**: Core Web Vitals tracking
- **A/B Testing**: Feature flag system (planned)

---

## 🚀 Deployment Architecture

### CI/CD Pipeline
```bash
1. Code Push → Automated Testing
2. Build Production Images → Security Scanning
3. Deploy to Staging → Integration Testing
4. Deploy to Production → Health Verification
5. Monitor & Alert → Performance Tracking
```

### Infrastructure Components
- **Server**: Contabo VPS with Docker
- **Domain**: Custom domain with DNS management
- **SSL**: Let's Encrypt with automatic renewal
- **Backup**: Database backups with rotation
- **Monitoring**: Uptime and performance monitoring

---

## 🎯 Architecture Benefits

### Scalability
- **Horizontal Scaling**: Container-based architecture
- **Database Scaling**: PostgreSQL read replicas ready
- **CDN Integration**: Static asset distribution
- **Microservices Ready**: Modular service architecture

### Maintainability
- **Clean Code**: TypeScript for type safety
- **Documentation**: Comprehensive technical documentation
- **Testing**: Automated testing pipeline ready
- **Monitoring**: Comprehensive logging and metrics

### Security
- **Defense in Depth**: Multiple security layers
- **Regular Updates**: Automated security patching
- **Access Control**: Role-based permissions
- **Data Protection**: Encryption at rest and in transit

---

This architecture supports the current 95% implementation status and provides a solid foundation for scaling to production deployment and future feature development.
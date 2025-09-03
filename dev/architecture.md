# System Architecture - TrailGuide PWA MVP

## 1. Overview

TrailGuide is a Progressive Web Application (PWA) designed to provide visual navigation guidance within unmapped or complex spaces. The system is built with a **Docker-first architecture** ensuring consistent development and deployment experiences. It consists of an organizer-facing web application for creating guidance flows and a mobile-optimized PWA for end-users to follow step-by-step visual directions.

### Key Architectural Principles
- **Docker-First**: All services containerized from development to production
- **Mobile-First**: Optimized for mobile consumption with progressive enhancement
- **PWA-Native**: Offline capabilities, installable, app-like experience
- **Scalable**: Architecture supports growth from MVP to enterprise solution
- **Secure**: Security-first approach with encrypted data and secure authentication
- **Performance**: Sub-3-second load times with optimized image delivery

> **🎨 Comprehensive UI/UX Architectural Requirement**: 
> The TrailGuide PWA must include a comprehensive UI/UX plan.
> Both User Experience (UX) and User Interface (UI) need to be designed at the highest professional level.
> 
> **UX**: Ensure intuitive navigation, logical user flows, accessibility compliance, and seamless interaction across all features.
> 
> **UI**: Create a modern, visually appealing design that is consistent, responsive (mobile & desktop), and optimized for RTL Hebrew while being prepared for future multilingual support.
> The final result should feel polished, professional, and delightful to use for both organizers and end-users.
> 
> **Architectural UI/UX Considerations:**
> - Professional design system integrated into component architecture
> - Accessibility-first approach with ARIA compliance built into all interactive elements
> - Responsive design patterns that work seamlessly across mobile and desktop
> - RTL layout architecture with CSS logical properties and direction-aware components

> **🌐 Localization Requirement**: 
> Ensure that the TrailGuide PWA supports Hebrew with proper RTL layout for the Israeli audience.
> All text content should be stored in separate language-specific files (e.g., he.json or he.md), so that adding English (or other languages) in the future will be straightforward and maintainable.
> 
> **Architecture Considerations:**
> - Internationalization (i18n) layer in the React frontend architecture
> - API endpoints for language-specific content delivery
> - Database schema supporting multilingual content
> - CDN configuration for locale-specific asset delivery

> **📋 Quick Start**: For complete Docker setup instructions, see [`docker-setup.md`](./docker-setup.md)

## 2. System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐              ┌─────────────────────────────┐│
│  │ Organizer Admin │              │    End-User PWA            ││
│  │   Dashboard     │              │   (Mobile-Optimized)       ││
│  │ (Web/Desktop)   │              │                            ││
│  └─────────────────┘              └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                             │
                      ┌──────▼──────┐
                      │   HTTPS/WSS │
                      │ Load Balancer│
                      └──────┬──────┘
                             │
┌─────────────────────────────▼───────────────────────────────────┐
│                    APPLICATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Auth Service  │  │  Event Service  │  │  Media Service  │  │
│  │                 │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Node.js/Express API Gateway                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────▼───────────────────────────────────┐
│                      DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐              ┌─────────────────────────────┐│
│  │   PostgreSQL    │              │        AWS S3 Bucket       ││
│  │    Database     │              │      (Image Storage)       ││
│  │                 │              │                            ││
│  └─────────────────┘              └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 3. Frontend Architecture

### 3.1 Technology Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router v6 for SPA navigation
- **State Management**: React Context API + useReducer (lightweight for MVP)
- **Styling**: Tailwind CSS for rapid UI development
- **Design System**: Professional component library with consistent typography, spacing, colors, and interactions
- **UI/UX Framework**: Accessibility-first components with ARIA compliance, keyboard navigation, and screen reader support
- **PWA**: Workbox for service worker management
- **HTTP Client**: Axios with interceptors for API communication

### 3.2 Application Structure
```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Modal, etc.)
│   ├── organizer/       # Organizer-specific components
│   └── enduser/         # End-user PWA components
├── pages/               # Route-level components
│   ├── organizer/       # Organizer dashboard pages
│   └── guidance/        # End-user guidance flow pages
├── services/            # API communication layer
├── hooks/               # Custom React hooks
├── context/             # Global state management
├── utils/               # Helper functions and utilities
├── types/               # TypeScript type definitions
└── assets/              # Static assets (icons, images)
```

### 3.3 PWA Configuration
- **Manifest**: App installation prompts and behavior
- **Service Worker**: Caching strategies and offline functionality
- **Cache Strategy**: 
  - API responses: Network-first with 24h fallback
  - Images: Cache-first with network fallback
  - App shell: Cache-first for instant loading

## 4. Backend Architecture

### 4.1 Technology Stack
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT with refresh tokens
- **Validation**: Joi for request validation
- **File Upload**: Multer with AWS S3 integration
- **Security**: Helmet.js, CORS, rate limiting
- **Logging**: Winston with structured logging

### 4.2 Service Architecture
```
src/
├── controllers/         # Request handlers and route logic
├── services/           # Business logic layer
├── models/             # Database models and schemas
├── middleware/         # Authentication, validation, logging
├── routes/             # API route definitions
├── utils/              # Helper functions and utilities
├── config/             # Configuration management
└── types/              # TypeScript interfaces
```

### 4.3 API Design Patterns
- **RESTful**: Standard HTTP methods and status codes
- **Resource-Based**: Clear resource hierarchy (users, events, steps)
- **Stateless**: No server-side sessions, JWT-based authentication
- **Versioning**: URL-based versioning (/api/v1/)
- **Error Handling**: Consistent error response format

## 5. Database Architecture

### 5.1 Database Choice: PostgreSQL
**Rationale**: 
- ACID compliance for data integrity
- Excellent performance for read-heavy workloads
- JSON support for flexible event metadata
- Strong ecosystem and tooling support

### 5.2 Core Schema Design
```sql
-- Users table (Organizers)
users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Events table (Guidance Sessions)
events (
    id UUID PRIMARY KEY,
    organizer_id UUID REFERENCES users(id),
    event_name VARCHAR(255) NOT NULL,
    status event_status DEFAULT 'draft',
    expiration_date TIMESTAMP,
    clicks_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Steps table (Individual Guidance Steps)
steps (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    image_url VARCHAR(1000),
    image_alt VARCHAR(500),
    description TEXT CHECK (LENGTH(description) <= 200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX idx_events_expiration ON events(expiration_date) WHERE status = 'published';
CREATE INDEX idx_steps_event_order ON steps(event_id, step_order);
```

### 5.3 Database Optimization
- **Indexing**: Strategic indexes on query patterns
- **Connection Pooling**: pg-pool for efficient connection management
- **Query Optimization**: Prepared statements and query analysis
- **Data Archival**: Automated cleanup of expired events

## 6. File Storage Architecture

### 6.1 AWS S3 Configuration
- **Bucket Structure**: 
  - `trailguide-images-prod/events/{event_id}/{step_id}/`
  - Organized by event for easy cleanup and access control
- **CDN**: CloudFront for global image delivery
- **Security**: Presigned URLs for direct browser uploads
- **Image Processing**: Automatic resizing and optimization

### 6.2 Image Upload Flow
```
1. Frontend requests upload URL → Backend generates presigned S3 URL
2. Frontend uploads directly to S3 → S3 returns success confirmation
3. Frontend sends image metadata → Backend stores reference in database
4. S3 triggers Lambda → Automatic image processing (resize, optimize)
```

## 7. Security Architecture

### 7.1 Authentication & Authorization
- **JWT Tokens**: Stateless authentication with 15-minute expiry
- **Refresh Tokens**: 7-day expiry stored securely (httpOnly cookies)
- **Password Security**: bcrypt with salt rounds (12+)
- **Session Management**: Automatic token refresh on API calls

### 7.2 Data Security
- **Encryption in Transit**: HTTPS everywhere (TLS 1.3)
- **Encryption at Rest**: Database and S3 encryption enabled
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection**: Parameterized queries and ORM protection
- **XSS Protection**: Content Security Policy and input sanitization

### 7.3 Access Control
- **Organizer Isolation**: Users can only access their own events
- **Public Access**: Read-only access to published, non-expired events
- **Rate Limiting**: API throttling to prevent abuse
- **CORS Policy**: Restricted cross-origin requests

## 8. Performance Architecture

### 8.1 Frontend Performance
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: WebP format with fallbacks
- **Caching**: Aggressive caching with cache invalidation
- **Bundle Size**: <1MB initial bundle target
- **Loading States**: Progressive loading and skeleton screens

### 8.2 Backend Performance
- **Response Time**: <200ms API response target
- **Database**: Connection pooling and query optimization
- **Caching**: Redis for frequently accessed data (future)
- **Compression**: Gzip/Brotli compression enabled
- **Monitoring**: Performance tracking and alerting

## 9. Scalability Considerations

### 9.1 Horizontal Scaling
- **Stateless Design**: Easy to scale with load balancers
- **Database**: Read replicas for query scaling
- **CDN**: Global content delivery for images
- **Auto-scaling**: Container-based deployment (future)

### 9.2 Vertical Scaling
- **Database Optimization**: Query performance and indexing
- **Memory Management**: Efficient memory usage patterns
- **CPU Optimization**: Asynchronous processing where possible

## 10. Monitoring and Observability

### 10.1 Application Monitoring
- **Health Checks**: /health endpoint for load balancer monitoring
- **Error Tracking**: Structured logging with error aggregation
- **Performance Metrics**: Response times, throughput, error rates
- **User Analytics**: Basic usage tracking (GDPR compliant)

### 10.2 Infrastructure Monitoring
- **System Metrics**: CPU, memory, disk usage
- **Database Monitoring**: Query performance, connection pools
- **Network Monitoring**: Latency, throughput, error rates
- **Alerting**: Automated alerts for critical issues

## 11. Docker-First Development Environment

### 11.1 Container-Based Local Development
- **Single Command Setup**: Complete system starts with `docker-compose up -d`
- **Development Stack**: PostgreSQL, Redis, API, Frontend, and Nginx in containers
- **Hot Reload**: Live code reloading within containers for fast iteration
- **Environment Parity**: Development environment mirrors production exactly
- **Port Management**: Consistent port mapping (API: 3000, Frontend: 5173, DB: 5432)

### 11.2 Development Workflow
```bash
# Initial setup (one-time)
git clone repo && cd trailguide-pwa
cp .env.example .env.development
docker-compose up -d

# Daily development
docker-compose logs -f api          # View API logs
docker-compose exec api npm test    # Run tests
docker-compose restart api          # Restart after config changes
```

### 11.3 Container Services
- **API Container**: Node.js with TypeScript, hot-reload enabled
- **Frontend Container**: Vite dev server with HMR
- **Database Container**: PostgreSQL 15 with init scripts
- **Redis Container**: Caching and session storage
- **Nginx Container**: Reverse proxy (optional for development)

### 11.4 Development Tools (Containerized)
- **Version Control**: Git with conventional commits and Husky hooks
- **Code Quality**: ESLint, Prettier running in containers
- **Testing**: Jest, React Testing Library, Supertest in isolated containers
- **Database Tools**: pgAdmin accessible via container for DB management
- **API Documentation**: OpenAPI/Swagger auto-generated and served in container

### 11.5 Production Migration Path
The Docker-first approach ensures seamless transition from development to production:

1. **Local Development**: `docker-compose up -d` (development containers)
2. **Staging Deployment**: `docker-compose -f docker-compose.staging.yml up -d`
3. **Production Deployment**: `docker-compose -f docker-compose.prod.yml up -d`

All environments use identical container images with different configuration, ensuring consistency and eliminating "works on my machine" issues.

## 12. Comprehensive Security Architecture

> **🔒 Security-First Architecture for MVP**
> All system components must implement defense-in-depth security measures to protect against common vulnerabilities and ensure data protection compliance.

### 12.1 Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Network       │  │  Application    │  │     Data        │  │
│  │   Security      │  │   Security      │  │   Security      │  │
│  │                 │  │                 │  │                 │  │
│  │ • HTTPS/TLS     │  │ • Authentication│  │ • Encryption    │  │
│  │ • Firewall      │  │ • Authorization │  │ • Access Control│  │
│  │ • Rate Limiting │  │ • Input Valid.  │  │ • Audit Logs    │  │
│  │ • DDoS Protect. │  │ • CSRF/XSS Prot │  │ • Data Privacy  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Authentication & Authorization Architecture

#### Multi-Layer Authentication System
```typescript
// Security architecture for authentication
interface AuthenticationLayers {
  // Layer 1: Network-Level Security
  networkSecurity: {
    httpsEnforcement: 'mandatory',
    tlsVersion: 'TLS 1.3',
    hsts: 'max-age=31536000; includeSubDomains',
    certificatePinning: 'production-only'
  },
  
  // Layer 2: Application-Level Authentication
  applicationAuth: {
    jwtTokens: {
      algorithm: 'HS256',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      secretRotation: 'monthly'
    },
    passwordPolicies: {
      minLength: 8,
      complexity: 'alphanumeric + special',
      hashAlgorithm: 'bcrypt',
      saltRounds: 12
    }
  },
  
  // Layer 3: Session Management
  sessionSecurity: {
    cookieSettings: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    },
    tokenValidation: 'every-request',
    automaticExpiry: true
  }
}
```

#### Authorization Matrix
| User Type | Events | Steps | Analytics | Admin |
|-----------|--------|-------|-----------|--------|
| Anonymous | Read (published only) | Read (published only) | None | None |
| Organizer | CRUD (own only) | CRUD (own events) | Read (own events) | None |
| Admin | Read All | Read All | Read All | Full |

### 12.3 Data Protection Architecture

#### Encryption Strategy
```typescript
// Data protection layers
interface DataProtectionLayers {
  // Encryption in Transit
  transitEncryption: {
    external: 'TLS 1.3',
    internal: 'TLS 1.2+', // Between services
    websockets: 'WSS',
    apiCalls: 'HTTPS only'
  },
  
  // Encryption at Rest
  restEncryption: {
    database: 'AES-256-GCM',
    fileStorage: 'S3 server-side encryption',
    backups: 'encrypted',
    logs: 'sensitive data redacted'
  },
  
  // Key Management
  keyManagement: {
    rotation: 'quarterly',
    storage: 'environment variables',
    access: 'role-based',
    backup: 'secure key escrow'
  }
}
```

#### Sensitive Data Handling
```typescript
// Sensitive data classification and handling
const dataClassification = {
  // Level 1: Public Data
  public: {
    examples: ['published event names', 'public step descriptions'],
    encryption: 'none required',
    access: 'public read-only',
    retention: 'indefinite'
  },
  
  // Level 2: Internal Data
  internal: {
    examples: ['user emails', 'analytics data', 'usage patterns'],
    encryption: 'in transit + at rest',
    access: 'authenticated users only',
    retention: '2 years'
  },
  
  // Level 3: Confidential Data
  confidential: {
    examples: ['passwords', 'tokens', 'personal information'],
    encryption: 'strong encryption required',
    access: 'strict need-to-know basis',
    retention: 'minimum required period',
    handling: 'never log, hash irreversibly'
  }
};
```

### 12.4 Input Validation & Sanitization Architecture

#### Validation Pipeline
```typescript
// Multi-layer validation architecture
const validationLayers = {
  // Layer 1: Client-Side Validation (UX only)
  clientSide: {
    purpose: 'immediate user feedback',
    security: 'NOT trusted for security',
    implementation: 'HTML5 + JavaScript validation'
  },
  
  // Layer 2: API Gateway Validation
  apiGateway: {
    purpose: 'request filtering and rate limiting',
    security: 'first line of defense',
    implementation: 'schema validation + rate limiting'
  },
  
  // Layer 3: Application Layer Validation
  applicationLayer: {
    purpose: 'business logic validation',
    security: 'trusted validation layer',
    implementation: 'Joi schemas + sanitization',
    rules: {
      eventName: 'string, 1-255 chars, alphanumeric + spaces',
      description: 'string, 1-200 chars, HTML tags stripped',
      imageUrl: 'valid URL, HTTPS only, whitelist domains'
    }
  },
  
  // Layer 4: Database Layer Validation
  databaseLayer: {
    purpose: 'final data integrity check',
    security: 'last line of defense',
    implementation: 'CHECK constraints + triggers'
  }
};
```

### 12.5 Security Monitoring Architecture

#### Real-time Security Monitoring
```typescript
// Security event monitoring system
interface SecurityMonitoring {
  // Authentication Events
  authenticationEvents: [
    'login_success',
    'login_failure', 
    'password_reset',
    'token_refresh',
    'suspicious_login_pattern'
  ],
  
  // Authorization Events
  authorizationEvents: [
    'unauthorized_access_attempt',
    'privilege_escalation_attempt',
    'resource_access_denied',
    'admin_action_performed'
  ],
  
  // Application Security Events
  applicationEvents: [
    'input_validation_failure',
    'xss_attempt_detected',
    'sql_injection_attempt',
    'csrf_token_mismatch',
    'rate_limit_exceeded'
  ],
  
  // System Security Events
  systemEvents: [
    'unusual_traffic_pattern',
    'multiple_failed_requests',
    'security_header_violation',
    'csp_policy_violation'
  ]
}

// Monitoring thresholds and responses
const securityThresholds = {
  loginFailures: {
    threshold: 5,
    timeWindow: '15 minutes',
    action: 'temporary account lock + alert'
  },
  
  rateLimitViolations: {
    threshold: 100,
    timeWindow: '1 minute', 
    action: 'IP block + escalated alert'
  },
  
  unauthorizedAccess: {
    threshold: 1,
    timeWindow: 'immediate',
    action: 'immediate alert + audit log'
  }
};
```

### 12.6 Security Incident Response Architecture

#### Automated Response System
```typescript
// Security incident response workflow
interface IncidentResponse {
  // Detection Phase
  detection: {
    sources: ['application logs', 'system metrics', 'user reports'],
    automation: 'real-time monitoring + alerting',
    escalation: 'severity-based routing'
  },
  
  // Response Phase  
  response: {
    immediate: [
      'block suspicious IPs',
      'revoke compromised tokens',
      'enable enhanced logging',
      'notify security team'
    ],
    investigation: [
      'preserve evidence',
      'analyze attack vectors',
      'assess impact scope',
      'document findings'
    ],
    remediation: [
      'patch vulnerabilities',
      'update security policies',
      'enhance monitoring',
      'user notification if required'
    ]
  },
  
  // Recovery Phase
  recovery: {
    shortTerm: ['restore normal operations', 'monitor for recurrence'],
    longTerm: ['security architecture review', 'lessons learned integration']
  }
}
```

### 12.7 Compliance & Privacy Architecture

#### GDPR Compliance Framework
```typescript
// Data privacy and compliance architecture
interface ComplianceFramework {
  // Data Processing Lawfulness
  lawfulBasis: {
    userAccounts: 'legitimate interest',
    analytics: 'consent',
    eventData: 'contract performance',
    cookies: 'consent'
  },
  
  // Data Subject Rights
  dataSubjectRights: {
    access: 'user dashboard + data export API',
    rectification: 'user profile editing',
    erasure: 'account deletion + data purge',
    portability: 'data export in JSON format',
    objection: 'opt-out mechanisms'
  },
  
  // Privacy by Design
  privacyByDesign: {
    dataMinimization: 'collect only necessary data',
    purposeLimitation: 'use data only for stated purposes',
    storageMinimization: 'automatic data expiry',
    transparency: 'clear privacy notices'
  },
  
  // Technical Safeguards
  technicalSafeguards: {
    encryption: 'all personal data encrypted',
    anonymization: 'analytics data anonymized',
    accessControl: 'role-based access to personal data',
    auditTrail: 'all personal data access logged'
  }
}
```

### 12.8 Security Testing Architecture

#### Comprehensive Security Testing Strategy
```typescript
// Multi-layer security testing approach
interface SecurityTesting {
  // Static Application Security Testing (SAST)
  staticAnalysis: {
    tools: ['ESLint security rules', 'npm audit', 'CodeQL'],
    frequency: 'every commit',
    coverage: 'source code vulnerabilities'
  },
  
  // Dynamic Application Security Testing (DAST)
  dynamicAnalysis: {
    tools: ['OWASP ZAP', 'custom penetration tests'],
    frequency: 'weekly + before releases',
    coverage: 'runtime vulnerabilities'
  },
  
  // Interactive Application Security Testing (IAST)
  interactiveTesting: {
    implementation: 'security monitoring in test environments',
    coverage: 'real-time vulnerability detection during testing'
  },
  
  // Manual Security Testing
  manualTesting: {
    frequency: 'monthly + major releases',
    focus: [
      'authentication bypass attempts',
      'authorization vulnerabilities',
      'input validation edge cases',
      'business logic flaws'
    ]
  }
}
```

### 12.9 Production Security Hardening

#### Infrastructure Security Configuration
```bash
# Production security hardening checklist
production_security_checklist = {
  # Network Security
  network_hardening: [
    "Configure firewall (only necessary ports open)",
    "Enable DDoS protection",
    "Set up VPN for admin access",
    "Implement network segmentation",
    "Configure intrusion detection system"
  ],
  
  # Server Hardening
  server_hardening: [
    "Disable unused services and ports",
    "Configure automatic security updates",
    "Set up fail2ban for brute force protection",
    "Enable system audit logging",
    "Configure secure SSH (key-based auth only)"
  ],
  
  # Application Hardening
  application_hardening: [
    "Enable all security headers",
    "Configure CSP policies",
    "Set up rate limiting",
    "Enable request/response logging",
    "Configure error handling (no info disclosure)"
  ],
  
  # Database Hardening
  database_hardening: [
    "Use dedicated database users (not postgres superuser)",
    "Enable SSL/TLS for connections",
    "Configure connection limits",
    "Enable query logging and monitoring",
    "Regular security updates and patches"
  ]
}
```

### 12.10 Security Architecture Validation

#### Security Assessment Framework
- [ ] **Penetration Testing**: Quarterly external security assessments
- [ ] **Vulnerability Scanning**: Weekly automated scans of all components
- [ ] **Code Security Review**: Manual review of security-critical code paths
- [ ] **Security Audit**: Annual third-party security audit
- [ ] **Compliance Assessment**: GDPR compliance review and validation
- [ ] **Incident Response Testing**: Quarterly tabletop exercises
- [ ] **Security Training**: Regular security awareness training for team
- [ ] **Threat Modeling**: Updated threat models for new features

#### Security Metrics & KPIs
```typescript
// Security measurement and monitoring
interface SecurityMetrics {
  preventive: {
    vulnerabilityDetection: 'mean time to detection < 1 hour',
    patchDeployment: 'critical patches deployed within 24 hours',
    securityTraining: '100% team completion quarterly'
  },
  
  detective: {
    incidentDetection: 'automated detection for 95% of attack types',
    falsePositiveRate: '< 5% of security alerts',
    logCoverage: '100% of security events logged'
  },
  
  responsive: {
    incidentResponse: 'mean time to response < 30 minutes',
    recoveryTime: 'mean time to recovery < 2 hours',
    communicationTime: 'user notification within 72 hours if required'
  }
}
```

This comprehensive security architecture ensures that TrailGuide PWA maintains strong security posture across all layers while remaining compliant with data protection regulations and industry best practices. The Docker-first approach provides additional isolation and consistency for security measures across all environments.

This Docker-first architecture provides a solid foundation for the MVP while maintaining flexibility for future enhancements and scaling requirements, with security built-in at every layer. See `docker-setup.md` for complete setup instructions and `database-design.md` for detailed security configurations.
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrailGuide PWA is a Progressive Web Application for visual navigation guidance within unmapped or complex spaces (festivals, construction sites, markets). It provides two main experiences:
- **Organizer Dashboard**: Web interface for creating and managing guidance events
- **End-User PWA**: Mobile-optimized interface for following step-by-step visual directions

## Technology Stack & Architecture

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with custom design system
- **PWA**: Workbox for service worker management
- **State Management**: React Context API + useReducer pattern

### Backend
- **Runtime**: Node.js 18+ with Express.js and TypeScript
- **Database**: PostgreSQL 15+ with UUID primary keys
- **Authentication**: JWT with refresh tokens (15min access, 7d refresh)
- **File Storage**: AWS S3 for images with CDN delivery
- **Security**: bcrypt passwords, HTTPS enforcement, rate limiting

### Development Environment
- **Docker-First Architecture**: Complete development stack in containers
- **Database**: PostgreSQL with dedicated users (never use postgres superuser)
- **Environment**: All configs in .env files (never committed to git)

## Key Development Commands

### Docker Development Setup
```bash
# Initial setup
cp .env.example .env.development
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f frontend

# Database operations
docker-compose exec api npm run migrate
docker-compose exec postgres psql -U trailguide -d trailguide_dev

# Restart services
docker-compose restart api
```

### Testing Commands
```bash
# API tests
docker-compose exec api npm test

# Frontend tests
docker-compose exec frontend npm test

# E2E tests
docker-compose exec frontend npm run test:e2e
```

### Code Quality
```bash
# Linting
docker-compose exec api npm run lint
docker-compose exec frontend npm run lint

# Type checking
docker-compose exec api npm run type-check
docker-compose exec frontend npm run type-check
```

## Database Architecture

### Core Tables
- **users**: Organizer authentication (UUID primary keys)
- **events**: Navigation guidance events with status enum ('draft', 'published', 'expired')
- **steps**: Individual guidance steps with sequential ordering
- **event_views**: Analytics tracking for public access
- **step_views**: Detailed step interaction tracking

### Security Requirements
- Use dedicated database users with limited privileges
- Never use the default 'postgres' superuser for application connections
- All sensitive data encrypted (passwords with bcrypt, salt rounds >=12)
- Row Level Security (RLS) enabled for multi-tenant data isolation

### Key Database Functions
- `expire_events()`: Automatically expire published events past expiration date
- `cleanup_old_events()`: Archive/delete old events (30 days expired → archive, 1 year archived → delete)
- `get_event_analytics()`: Get event statistics (views, completion rates, etc.)

## API Architecture

### Authentication
- JWT tokens with 15-minute expiry for access tokens
- 7-day refresh tokens stored in httpOnly cookies
- Rate limiting: 5 requests/minute for login, 10 requests/minute for API

### Core Endpoints
- `POST /api/v1/auth/login`: Organizer authentication
- `GET /api/v1/events`: List organizer's events (authenticated)
- `POST /api/v1/events`: Create new event (authenticated)
- `GET /api/v1/events/:id`: Get event details (authenticated)
- `POST /api/v1/events/:id/steps`: Add steps to event (authenticated)
- `GET /api/v1/public/events/:id`: Public access to published events (no auth)

### Security Headers Required
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HTTPS only)
- Content-Security-Policy with restrictive settings

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── common/          # Reusable UI components (Button, Modal, etc.)
│   ├── organizer/       # Dashboard, EventForm, StepEditor, Analytics
│   └── enduser/         # NavigationFlow, StepCard, ProgressIndicator
├── pages/               # Route-level components
├── hooks/               # Custom React hooks (useAuth, useAnalytics, etc.)
├── services/            # API communication layer
├── context/             # Global state management
└── types/               # TypeScript definitions
```

### PWA Configuration
- Web App Manifest with proper icons and shortcuts
- Service Worker with Workbox for caching strategies:
  - API responses: Network-first with 24h fallback
  - Images: Cache-first with network fallback
  - App shell: Cache-first for instant loading

### Performance Requirements
- Initial bundle size: <1MB target
- API response time: <200ms target
- Image optimization: WebP with fallbacks, lazy loading
- Code splitting: Route-based lazy loading

## Localization & Accessibility

### Hebrew RTL Support
- All text content stored in separate language files (he.json)
- CSS logical properties (margin-inline-start vs margin-left)
- RTL layout testing required for all components
- Text direction detection and handling

### Accessibility Requirements
- WCAG 2.1 AA compliance
- ARIA labels and keyboard navigation
- Screen reader support
- High contrast mode compatibility
- All interactive elements must have proper focus indicators

## Security Requirements

### Authentication Security
- Passwords: bcrypt with minimum 12 salt rounds
- JWT secrets: Minimum 64 characters for production
- Token storage: Use sessionStorage, never localStorage for tokens
- Login attempts: Rate limiting with progressive delays

### Input Validation
- All user inputs must be validated server-side
- HTML content sanitized with DOMPurify
- SQL injection prevention with parameterized queries
- XSS protection with Content Security Policy

### HTTPS Enforcement
- Mandatory HTTPS in production
- Secure cookie settings (httpOnly, secure, sameSite=strict)
- HSTS headers with includeSubDomains
- Certificate pinning for production

### Data Protection
- No sensitive data in client-side logs
- Personal data encryption at rest
- GDPR compliance for user data
- Automatic data cleanup based on retention policies

## Development Workflow

### Environment Setup
1. Copy `.env.example` to `.env.development`
2. Update database and JWT credentials
3. Run `docker-compose up -d` to start all services
4. Access frontend at http://localhost:5173, API at http://localhost:3000

### Making Changes
1. Use feature branches for development
2. Run lint and type-check before commits
3. Test both authenticated and public user flows
4. Verify RTL layout for Hebrew content
5. Check accessibility with screen readers

### Database Changes
1. Create migration scripts in `migrations/` directory
2. Test migrations on development data
3. Update schema documentation
4. Consider security implications of schema changes

## Testing Strategy

### Required Tests
- Unit tests for all business logic components
- Integration tests for API endpoints
- E2E tests for complete user flows (organizer & end-user)
- Security tests for authentication and input validation
- Accessibility tests with automated tools
- RTL layout tests for Hebrew support

### Test Data
- Use test fixtures for consistent data
- Mock external services (S3, email)
- Test offline functionality for PWA features
- Verify analytics tracking accuracy

## Common Issues & Solutions

### Database Connection Issues
- Check if PostgreSQL container is running: `docker-compose ps postgres`
- Verify environment variables match container settings
- Use dedicated database users, not postgres superuser
- Test connection: `docker-compose exec postgres psql -U trailguide -d trailguide_dev -c "SELECT 1;"`

### Authentication Problems
- Verify JWT_SECRET is properly set in environment
- Check token expiration settings (15min for access, 7d for refresh)
- Ensure CORS settings allow credentials
- Validate rate limiting isn't blocking legitimate requests

### PWA Caching Issues
- Clear service worker cache during development
- Check Workbox configuration for cache strategies
- Verify manifest.json is properly served
- Test offline functionality in browser DevTools

### Performance Issues
- Monitor bundle size with `npm run analyze`
- Check for memory leaks in React components
- Optimize images (WebP format, proper sizing)
- Review database query performance with EXPLAIN ANALYZE

## Production Deployment

### Pre-deployment Checklist
- [ ] All environment variables configured for production
- [ ] HTTPS certificates installed and verified
- [ ] Database migrations applied
- [ ] Security headers configured
- [ ] Rate limiting properly configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting setup
- [ ] CSP policies tested and verified

### Health Checks
- API health endpoint: `/api/v1/health`
- Database connectivity verification
- S3 upload functionality test
- PWA installation capability check

This architecture provides a foundation for a secure, performant, and accessible PWA while maintaining Hebrew RTL support and GDPR compliance.
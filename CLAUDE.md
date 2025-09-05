# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

**Primary Development Commands:**
```bash
# Start the complete development stack
docker-compose up -d

# Monitor logs for all services
docker-compose logs -f

# Stop and clean up
docker-compose down

# Restart specific service
docker-compose restart api
docker-compose restart frontend

# Check service status
docker-compose ps
```

**Frontend Development:**
```bash
# Inside frontend/ directory or via docker-compose exec
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run lint         # ESLint checking
npm run lint:fix     # Fix ESLint issues automatically
npm run typecheck    # TypeScript type checking
npm run test         # Run Vitest tests
```

**Backend Development:**
```bash
# Inside api/ directory or via docker-compose exec
npm run dev          # Start with nodemon (auto-restart)
npm run migrate      # Run database migrations
npm run migrate:status  # Check migration status
npm run lint         # ESLint checking
npm run test         # Run Jest tests
```

## Architecture Overview

### Core Application Structure
This is a **bilingual (Hebrew RTL/English) Progressive Web App** for visual navigation guidance with two primary user experiences:

1. **Organizer Dashboard** (`/app/*` routes) - Web interface for creating and managing visual guidance
2. **End-User PWA** (`/guide/:id` route) - Mobile-optimized step-by-step navigation

### Key Architectural Patterns

**Frontend Architecture:**
- **React 18** with TypeScript, using Context API for state management
- **Protected Route Pattern**: All `/app/*` routes require authentication via `ProtectedRoute` component
- **Bilingual RTL Support**: Complete Hebrew/English i18n with automatic direction switching using `useLanguageDirection` hook
- **Services Layer**: Centralized API communication through `authService` and `eventsService`
- **Component Organization**: Pages → Layout → Reusable Components

**Backend Architecture:**
- **Express.js REST API** with modular route structure in `/api/src/routes/`
- **JWT Authentication**: Token-based auth with automatic refresh via axios interceptors
- **Database Layer**: PostgreSQL with connection pooling, comprehensive error handling, and retry logic
- **Security Middleware**: Rate limiting, CORS, Helmet security headers, bcrypt password hashing
- **File Upload**: Multer middleware for image handling with validation

**Database Schema:**
- **UUID Primary Keys** throughout for security and scalability
- **Row Level Security** ready for multi-tenant features
- **JSONB Metadata** columns for flexible data storage
- **Migration System**: Structured migrations in `/api/migrations/`

### Critical Implementation Details

**Authentication Flow:**
- `AuthContext` manages user state across the application
- `ProtectedRoute` automatically redirects unauthenticated users to `/login`
- Axios interceptors handle token injection and automatic refresh
- Demo accounts available: `demo@example.com` / `demo123`

**Internationalization:**
- i18next with React integration for Hebrew/English support
- Translation files in `/frontend/src/i18n/locales/`
- `useLanguageDirection` provides RTL/LTR utilities and CSS classes
- Document direction automatically updated based on language

**Event/Guide Management:**
- "מדריך" (Guide) terminology updated to "הכוונה" (Guidance) throughout Hebrew translations
- Multi-step guidance creation with image upload support
- Step-by-step navigation interface for end users
- Events API requires authentication for CRUD operations

## Development Workflow

**Service URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000  
- Database: localhost:5432 (PostgreSQL)

**Key Files to Know:**
- `/frontend/src/contexts/AuthContext.jsx` - Authentication state and ProtectedRoute
- `/frontend/src/services/authService.js` - API communication with axios interceptors
- `/api/src/routes/events.js` - Event/guidance CRUD operations
- `/api/src/config/database.js` - Database configuration with comprehensive logging
- `/frontend/src/i18n/locales/` - Hebrew/English translation files

**Common Development Tasks:**
- Always test both Hebrew and English interfaces when making UI changes
- Use existing demo accounts for authentication testing
- Check both `/frontend/src/i18n/locales/he.json` and `en.json` when adding new translations
- Database changes require running migrations with `npm run migrate`
- Authentication issues often indicate missing or expired tokens

**Testing Authentication:**
```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# Test Hebrew API support  
curl -H "Accept-Language: he" http://localhost:3000/api/v1/welcome
```

## Current Implementation Status

**Fully Operational (~85% Complete):**
- Docker development environment with hot reload
- JWT authentication system with refresh tokens
- Professional React UI with Hebrew RTL support
- PostgreSQL database with user management
- Event/guide creation with multi-step interface
- Protected routes and proper error handling

**Recent Updates:**
- Enhanced guidance creation flow with improved terminology
- Step-by-step navigation interface for end users  
- Fixed authentication error handling with login redirects
- Comprehensive database connection handling with retries

**Architecture Decisions:**
- Host networking mode for API container (resolves Docker bridge network issues)
- Service Worker temporarily disabled (was causing 404 errors)
- Context API preferred over Redux for state management simplicity
- UUID primary keys for security and distributed system readiness
# TrailGuide PWA - Development Guide

*Last Updated: September 6, 2025*

## 🚀 Quick Start

Get TrailGuide PWA running locally in under 5 minutes:

```bash
# Clone repository
git clone https://github.com/your-username/trailguide-pwa.git
cd trailguide-pwa

# Start development environment
docker-compose up -d

# Visit application
open http://localhost:5173

# Login with test credentials
Email: user.a@trailguide.io
Password: TgUa#2o25!
# OR
Username: trailguide_user_a  
Password: TgUa#2o25!
```

**That's it!** 🎉 You can now explore the professional dashboard and test Hebrew RTL support.

---

## 🛠️ Development Environment

### System Requirements
- **Docker**: 20.0+ with Docker Compose
- **Node.js**: 18+ (for local development)
- **Git**: Latest version
- **OS**: Linux, macOS, or Windows with WSL2

### Development Stack
- **Frontend**: React 18 + Vite (Port 5173)
- **Backend**: Express.js + Node.js (Port 3000)  
- **Database**: PostgreSQL (Port 5432)
- **Cache**: Redis (Development optional)
- **Reverse Proxy**: NGINX (Development optional)

---

## 🐳 Docker Development

### Standard Development Mode

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Access services directly:
# Frontend: http://localhost:5173
# API: http://localhost:3000
# Database: localhost:5432
```

### NGINX Development Mode (Production Simulation)

```bash
# Start NGINX development environment
./start-dev-nginx.sh

# Access everything through NGINX:
# Application: http://localhost
# API: http://localhost/api

# Switch back to direct mode
./start-dev-direct.sh
```

### Container Management

```bash
# View running containers
docker-compose ps

# Restart specific service
docker-compose restart api

# Rebuild service after code changes
docker-compose up -d --build frontend

# Execute commands inside containers
docker-compose exec api npm install
docker-compose exec database psql -U postgres
```

---

## 💻 Local Development (Without Docker)

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:5173

# Available scripts
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run type-check # TypeScript checking
```

### Backend Development

```bash
cd api

# Install dependencies
npm install

# Set up environment
cp .env.example .env.development

# Start development server
npm run dev
# Runs on http://localhost:3000

# Available scripts
npm run start      # Production start
npm run test       # Run tests
npm run lint       # Run ESLint
```

### Database Setup

```bash
# Start PostgreSQL (using Docker)
docker run -d \
  --name trailguide-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=trailguide_dev \
  -p 5432:5432 \
  postgres:15

# Or install PostgreSQL locally and create database
createdb trailguide_dev
```

---

## 🧪 Testing

### Demo Accounts

Use these accounts for testing authentication:

```javascript
const demoUsers = [
  {
    email: "demo@example.com",
    password: "demo123",
    fullName: "Demo User"
  },
  {
    email: "organizer@test.com", 
    password: "test123",
    fullName: "Test Organizer"
  }
];
```

### Feature Testing

**1. Authentication Flow**
```bash
# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# Test protected route
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/auth/me
```

**2. Hebrew RTL Support**
1. Visit http://localhost:5173
2. Click language switcher (EN/עב) 
3. Observe complete interface language change
4. Test navigation and form interactions

**3. Responsive Design**
1. Open browser developer tools
2. Switch to mobile viewport
3. Test hamburger menu functionality
4. Verify touch-friendly navigation

**4. API Health**
```bash
curl http://localhost:3000/api/v1/health
curl -H "Accept-Language: he" http://localhost:3000/api/v1/welcome
```

---

## 🔧 Development Workflow

### Code Structure

```
trailguide-pwa/
├── 📱 frontend/              # React PWA application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Route-level components
│   │   ├── contexts/        # React Context providers
│   │   ├── i18n/           # Hebrew/English translations
│   │   └── hooks/           # Custom React hooks
├── 🔧 api/                  # Node.js backend API
│   ├── src/
│   │   ├── routes/         # API endpoint definitions
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Configuration files
├── 📚 docs/                 # Technical documentation
├── 🚀 deploy/               # Production deployment scripts
├── 🌐 nginx/                # NGINX configurations
└── 🐳 docker-compose.yml    # Development environment
```

### Development Best Practices

**Frontend Development**:
- Use TypeScript for type safety
- Follow React 18 patterns and hooks
- Implement responsive mobile-first design
- Maintain Hebrew RTL compatibility
- Use TailwindCSS utility classes
- Write accessible components

**Backend Development**:
- Use Express.js with proper middleware
- Implement comprehensive error handling
- Follow RESTful API design principles
- Use JWT for authentication
- Validate all inputs server-side
- Write secure, production-ready code

**Database Development**:
- Use UUID primary keys
- Implement proper foreign key relationships
- Design for scalability
- Use migrations for schema changes
- Ensure data validation

---

## 🌐 Internationalization Development

### Adding New Languages

1. **Create Translation File**:
```bash
# Add new language file
touch frontend/src/i18n/locales/es.json

# Copy structure from existing file
cp frontend/src/i18n/locales/en.json frontend/src/i18n/locales/es.json
```

2. **Update i18n Configuration**:
```javascript
// frontend/src/i18n/index.js
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  he: { translation: he },
  es: { translation: es }  // Add new language
};
```

3. **Add Language Switcher Option**:
```javascript
// Update language switcher component
const languages = [
  { code: 'he', name: 'עברית', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' }
];
```

### RTL Language Support

For adding new RTL languages (Arabic, Urdu, etc.):

1. **Update Direction Hook**:
```javascript
// frontend/src/hooks/useLanguageDirection.js
const rtlLanguages = ['he', 'ar', 'ur'];  // Add new RTL codes
```

2. **Test RTL Styling**:
```css
/* Ensure CSS uses logical properties */
margin-inline-start: 1rem;  /* instead of margin-left */
text-align: start;          /* instead of text-align: left */
```

---

## 🔍 Debugging

### Frontend Debugging

```bash
# Development console
# Open browser DevTools (F12)
# Check Console, Network, and React DevTools

# Common issues:
# - i18n translation missing: Check console for missing keys
# - API connection issues: Check Network tab
# - Authentication problems: Check localStorage for token
```

### Backend Debugging

```bash
# API server logs
docker-compose logs -f api

# Database connection test
docker-compose exec api node -e "
  require('./src/config/database.js')
    .authenticate()
    .then(() => console.log('DB OK'))
    .catch(console.error)
"

# Manual API testing
curl -v http://localhost:3000/api/v1/health
```

### Database Debugging

```bash
# Connect to database
docker-compose exec database psql -U postgres trailguide_dev

# Common queries
\dt                    # List tables
SELECT * FROM users;   # View users
\d users              # Describe users table
```

---

## 🚀 Environment Management

### Environment Files

**Development** (`.env.development`):
```bash
NODE_ENV=development
API_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trailguide_dev
JWT_SECRET=dev-secret-key
BCRYPT_ROUNDS=4
LOG_LEVEL=debug
```

**Production** (`.env.production`):
```bash
NODE_ENV=production
DOMAIN=your-domain.com
API_URL=https://your-domain.com
DATABASE_URL=postgresql://user:password@database:5432/trailguide_prod
JWT_SECRET=ultra-secure-production-secret
BCRYPT_ROUNDS=12
LOG_LEVEL=warn
```

### Configuration Management

```javascript
// api/src/config/index.js
const config = {
  development: {
    port: 3000,
    cors: { origin: "http://localhost:5173" },
    rateLimit: { max: 1000 }
  },
  production: {
    port: process.env.API_PORT || 3000,
    cors: { origin: process.env.FRONTEND_URL },
    rateLimit: { max: 100 }
  }
};
```

---

## 📦 Package Management

### Frontend Dependencies

```bash
cd frontend

# Core dependencies
npm install react react-dom react-router-dom
npm install @types/react @types/react-dom typescript
npm install tailwindcss vite

# Internationalization
npm install react-i18next i18next

# Development dependencies
npm install -D eslint prettier @typescript-eslint/parser
```

### Backend Dependencies

```bash
cd api

# Core dependencies  
npm install express cors helmet bcryptjs jsonwebtoken
npm install pg sequelize express-rate-limit
npm install dotenv morgan compression

# Development dependencies
npm install -D nodemon @types/node typescript
npm install -D eslint prettier jest supertest
```

---

## 🔄 Git Workflow

### Branch Management

```bash
# Create feature branch
git checkout -b feature/guide-management

# Make commits with conventional format
git commit -m "feat: add guide creation API endpoint"
git commit -m "fix: resolve authentication token expiry"
git commit -m "docs: update API documentation"

# Push and create pull request
git push origin feature/guide-management
```

### Commit Convention

- `feat:` New features
- `fix:` Bug fixes  
- `docs:` Documentation updates
- `style:` Formatting changes
- `refactor:` Code refactoring
- `test:` Test additions
- `chore:` Maintenance tasks

---

## 📚 Development Resources

### Documentation
- [API Documentation](API.md)
- [Architecture Guide](ARCHITECTURE.md) 
- [Deployment Guide](DEPLOYMENT.md)
- [Implementation Status](STATUS.md)

### External Resources
- [React 18 Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Development Tools
- **VS Code Extensions**: 
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - Auto Rename Tag
  - Bracket Pair Colorizer
  - GitLens

---

## 🎯 **Create/Edit Guide Workflow** ✅ **PRODUCTION READY**

### Complete End-to-End Flow (September 2025)

The Create/Edit Guide workflow has been **fully implemented and production-tested**. All critical issues have been resolved.

#### 🔄 **Development Workflow**

**1. Creating New Guides**
```bash
# Frontend automatically detects create mode
# Route: /app/create
# Component: CreateGuide (isEditMode = false)
# API Call: POST /api/v1/events
```

**2. Editing Existing Guides**
```bash
# Edit button navigates correctly  
# Route: /app/edit/:id
# Component: CreateGuide (isEditMode = true)
# API Call: GET /api/v1/events/:id → Pre-populate form
# Save: PUT /api/v1/events/:id
```

#### 🧪 **Testing the Workflow**

**Frontend Testing**:
```bash
# Test create mode
open http://localhost:5173/app/create

# Test edit mode (replace with actual guide ID)
open http://localhost:5173/app/edit/12345678-1234-1234-1234-123456789abc
```

**Backend Testing**:
```bash
# Test both endpoint paths work
curl -H "Authorization: Bearer <token>" http://localhost/api/v1/events
curl -H "Authorization: Bearer <token>" http://localhost/api/v1/guides

# Both should return 401 (auth required) not 404
```

#### 🔧 **Development Notes**

**Hot Reload Behavior**:
- ✅ **Frontend changes**: Automatic hot reload (no restart needed)
- ⚠️ **Backend changes**: Require container restart:
  ```bash
  docker-compose restart api
  ```

**Common Development Tasks**:
```bash
# Frontend development (automatic)
# Edit files in ./frontend/src/ - changes appear immediately

# Backend development (restart required)
# Edit files in ./api/src/
docker-compose restart api

# Database changes
docker exec -it trailguide-api npm run migrate

# View logs during development
docker-compose logs -f api      # Backend logs
docker-compose logs -f frontend # Frontend logs
```

#### 🚨 **Critical Issues - ALL RESOLVED**

1. **✅ Data Consistency**: Fixed endpoint-aware validation
2. **✅ Edit Button Routing**: Fixed path parameter routing  
3. **✅ API Endpoints**: Added dual `/events` and `/guides` support
4. **✅ Form Pre-population**: Fixed edit mode detection
5. **✅ Hebrew RTL**: Complete RTL support maintained

#### 📋 **Troubleshooting Quick Reference**

**Dashboard Issues**:
- ❌ Hebrew error "טעינת הנתונים נכשלה" → ✅ Fixed: Data validation
- ❌ DataTable crashes → ✅ Fixed: Interface mismatch
- ❌ API 404 errors → ✅ Fixed: Dual endpoint support

**Edit Mode Issues**:  
- ❌ Edit button opens create mode → ✅ Fixed: Route parameters
- ❌ Form not pre-populated → ✅ Fixed: Edit mode detection
- ❌ Save doesn't work → ✅ Fixed: API endpoints

**See Full Documentation**:
- **Troubleshooting**: `docs/GUIDE_WORKFLOW_TROUBLESHOOTING.md`
- **Technical Details**: `docs/GUIDE_WORKFLOW_TECHNICAL.md`

---

## 🎯 Next Development Steps

### ✅ **Core Features - COMPLETE (100%)**

1. **✅ Complete Guide Management API** 
   - ✅ CRUD operations for guides implemented
   - ✅ Step management endpoints working
   - ✅ File upload handling integrated

2. **✅ Frontend Connected to Real Data**
   - ✅ Dashboard shows real guide data
   - ✅ Guide creation flow fully functional  
   - ✅ Error handling and loading states implemented

3. **✅ Production-Ready Infrastructure**
   - ✅ Authentication system implemented
   - ✅ Hebrew RTL support complete
   - ✅ Docker development environment ready

### Future Enhancements
- PWA features (service worker, offline capabilities)
- Advanced analytics dashboard
- Multi-file upload with progress
- Real-time collaboration features
- Advanced search and filtering

---

**Happy coding! 🚀** 

The TrailGuide PWA has a solid foundation with professional authentication, Hebrew RTL support, and production-ready infrastructure. The development environment is optimized for rapid feature development.
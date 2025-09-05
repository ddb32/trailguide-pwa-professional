# 🧭 TrailGuide PWA

**Visual Navigation System for Unmapped Spaces**

> Israel's first visual navigation system for festivals, events, and construction sites. When GPS ends, TrailGuide begins.

[![Status](https://img.shields.io/badge/Status-65%25%20Complete-orange)](dev/implementation-status.md)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018-blue)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-Node.js-green)](api/)
[![Hebrew](https://img.shields.io/badge/Hebrew%20RTL-✓%20Supported-success)](frontend/src/i18n/)

---

## 🎯 Project Overview

TrailGuide PWA solves the "last mile" navigation problem for unmapped indoor and outdoor spaces. When Google Maps or Waze get you to the parking lot, TrailGuide takes over with visual, step-by-step guidance to your final destination.

### **Two Main Experiences:**
1. **🎛️ Organizer Dashboard** - Web interface for creating and managing visual guides
2. **📱 End-User PWA** - Mobile-optimized step-by-step navigation experience

### **Key Features:**
- ✅ **Visual Step-by-Step Navigation** - Images with concise text instructions
- ✅ **Hebrew RTL Support** - Native right-to-left interface with cultural considerations
- ✅ **Mobile-First Design** - Optimized for touch and mobile consumption  
- ✅ **Professional UI/UX** - Enterprise-grade interface with accessibility compliance
- ⚠️ **Offline Capabilities** - PWA features for guide caching (planned)
- ⚠️ **Analytics Dashboard** - Usage tracking and engagement metrics (planned)

---

## 🚀 Quick Start

### **Try It Now** (2 minutes)
```bash
# Start the development environment
docker-compose up -d

# Visit the application
open http://localhost:5173

# Login with demo account:
# Email: demo@example.com
# Password: demo123
```

**That's it!** You can now explore the professional dashboard, test Hebrew RTL support, and see the authentication system in action.

### **Full Setup** (5 minutes)
See our [Developer Quick Start Guide](dev/quick-start.md) for comprehensive setup instructions.

---

## 📊 Current Implementation Status

### ✅ **Fully Operational** (~65% Complete)
- **Authentication System** - Complete login/logout with JWT tokens and demo users
- **Professional UI/UX** - Polished dashboard with responsive navigation and design system
- **Hebrew RTL Excellence** - Complete internationalization with seamless language switching
- **React Architecture** - Modern component library with TypeScript and state management
- **Security Implementation** - Rate limiting, CORS, security headers, and password encryption
- **Database Foundation** - PostgreSQL with user management and authentication tables

### 🔄 **In Development** 
- **Guide Management** - UI implemented, backend API in progress
- **Dashboard Data** - Professional interface ready, needs real data integration

### ❌ **Planned Features**
- **File Upload System** - Image handling for guide creation
- **End-User Navigation** - Step-by-step guide consumption interface  
- **PWA Features** - Offline capabilities and app installation
- **Analytics System** - Usage tracking and organizer insights

👉 **[View Detailed Status](dev/implementation-status.md)**

---

## 🛠️ Technology Stack

### **Frontend** 
- **React 18** + TypeScript + Vite
- **Tailwind CSS** with custom design system
- **React Router v6** with protected routes
- **i18next** for Hebrew/English internationalization
- **React Context API** for state management

### **Backend**
- **Node.js** + Express + TypeScript
- **PostgreSQL** with UUID primary keys
- **JWT Authentication** with secure token management
- **bcrypt** password hashing
- **Security middleware** (Helmet, CORS, rate limiting)

### **Development**
- **Docker Compose** for complete development stack
- **Hot reload** for rapid development
- **Professional code structure** with separation of concerns

---

## 📁 Project Structure

```
trailguide-pwa/
├── 📱 frontend/              # React PWA application
│   ├── src/
│   │   ├── components/       # Reusable UI components  
│   │   ├── pages/           # Route-level page components
│   │   ├── contexts/        # React Context providers
│   │   ├── i18n/           # Hebrew/English translations
│   │   └── hooks/           # Custom React hooks
├── 🖥️  api/                 # Node.js backend API
│   ├── src/
│   │   ├── routes/         # API endpoint definitions
│   │   ├── config/         # Database configuration
│   │   └── app.js          # Express application setup
├── 📚 dev/                  # Comprehensive documentation
│   ├── implementation-status.md    # Current project status
│   ├── quick-start.md              # Developer quick start
│   ├── development-roadmap.md      # Project timeline
│   └── technical-spec.md           # API & database specs
├── 🐳 docker-compose.yml    # Development environment
└── 📖 README.md             # This file
```

---

## 🎨 UI/UX Highlights

### **Professional Design System**
- Consistent spacing, typography, and color schemes
- Mobile-first responsive breakpoints
- Accessibility-compliant focus states and keyboard navigation
- Professional loading states and error handling

### **Hebrew RTL Excellence**  
- Native Hebrew interface with proper text direction
- Cultural considerations in layout and interaction patterns
- Seamless language switching with interface reflow
- RTL-optimized icons and navigation patterns

### **Developer Experience**
- Type-safe development with TypeScript
- Hot reload for instant feedback
- Comprehensive documentation and examples
- Clear component architecture and naming conventions

---

## 🧪 Testing & Demo

### **Authentication Flow**
1. Visit http://localhost:5173
2. Use demo credentials: `demo@example.com` / `demo123`
3. Explore the professional dashboard interface
4. Test user menu and logout functionality

### **Hebrew RTL Support**
1. Click the language switcher (EN/עב) in the header
2. Observe complete interface language change
3. Notice proper RTL text direction and layout mirroring
4. Test navigation and form interactions in Hebrew

### **API Integration**
```bash
# Test authentication endpoint
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# Test Hebrew support
curl -H "Accept-Language: he" http://localhost:3000/api/v1/welcome
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [🚀 Quick Start Guide](dev/quick-start.md) | Get up and running in under 10 minutes |
| [📊 Implementation Status](dev/implementation-status.md) | Detailed feature completion status |
| [🗺️ Development Roadmap](dev/development-roadmap.md) | Project timeline and milestones |
| [🔧 Technical Specification](dev/technical-spec.md) | Database schema and API endpoints |
| [🎨 Frontend Architecture](dev/frontend-architecture.md) | React components and UI patterns |
| [📡 API Specification](dev/api-specification.md) | Backend API documentation |

---

## 🚀 Next Development Phase

### **Ready for Immediate Development** (5-7 hours to MVP)

1. **Database Extension** (1-2 hours)
   - Add guides/events table schema
   - Create steps table with image references
   - Implement proper foreign key relationships

2. **API Implementation** (2-3 hours)
   - Guide CRUD operations  
   - Step management endpoints
   - File upload handling

3. **Frontend Integration** (1-2 hours)
   - Connect dashboard to real data
   - Implement guide creation flow
   - Add file upload components

4. **End-User Interface** (2-3 hours)
   - Public guide viewing page
   - Step navigation interface
   - Mobile optimization

### **Foundation Advantages**
- **Authentication system** is production-ready
- **UI/UX design** is professional and complete
- **Hebrew RTL support** is fully implemented
- **Component architecture** is scalable and maintainable
- **Security implementation** follows best practices

---

## 🤝 Contributing

### **Development Workflow**
1. All services run through Docker Compose for consistency
2. Frontend has hot reload for rapid iteration  
3. Backend requires container restart for changes
4. PostgreSQL data persists between restarts

### **Code Standards**
- TypeScript throughout for type safety
- Tailwind CSS for consistent styling
- React Context API for state management
- RESTful API design with proper error handling

### **Testing**
- Use provided demo accounts for authentication testing
- Test Hebrew RTL functionality with language switcher
- Verify responsive design across device sizes
- Check API endpoints with curl or Postman

---

## 📞 Support & Resources

### **Getting Help**
- 📖 Start with the [Quick Start Guide](dev/quick-start.md)
- 📊 Check [Implementation Status](dev/implementation-status.md) for current capabilities
- 🔧 Review API endpoints in [Technical Specification](dev/technical-spec.md)
- 🐳 Verify Docker containers with `docker-compose ps`

### **Common Issues**
- **Port conflicts**: Update `docker-compose.yml` if ports 3000, 5173, or 5432 are in use
- **Authentication problems**: Use exact demo credentials and check API connectivity
- **Hebrew display issues**: Ensure proper font support and browser language settings

---

## 🌟 Project Vision

TrailGuide PWA represents the next evolution in navigation technology - bridging the gap between GPS systems and final destination arrival. With professional UI/UX, complete Hebrew RTL support, and a scalable architecture, it's positioned to become Israel's premier visual navigation platform.

### **Impact Goals**
- **Eliminate** the "Where are you?" phone calls at events and festivals
- **Reduce** guest frustration and improve event experiences  
- **Enable** organizers to create professional navigation experiences
- **Support** Hebrew-first interface with international expansion capability

---

**🚀 Ready to revolutionize navigation in unmapped spaces!**

*Built with React, Node.js, and a passion for solving real-world navigation challenges.*
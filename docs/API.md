# TrailGuide PWA - API Documentation

*Last Updated: September 6, 2025*

## 📖 Overview

This document provides comprehensive API documentation for the TrailGuide PWA backend services. The API follows RESTful principles and supports both Hebrew and English interfaces.

**Base URL**: `http://localhost:3000/api/v1` (Development)  
**Production URL**: `https://your-domain.com/api/v1`

---

## 🔐 Authentication

### Authentication Flow
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Login Endpoint
**POST** `/api/v1/auth/login`

**Request Body**:
```json
{
  "email": "user.a@trailguide.io",
  "password": "TgUa#2o25!"
}
```

**Success Response (200 OK)**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "demo_user",
    "email": "demo@example.com",
    "fullName": "Demo User",
    "role": "organizer"
  }
}
```

**Error Response (401 Unauthorized)**:
```json
{
  "error": "Invalid email or password"
}
```

### Logout Endpoint
**POST** `/api/v1/auth/logout`

**Headers**: Requires Authorization token

**Success Response (200 OK)**:
```json
{
  "message": "Logged out successfully"
}
```

### Current User
**GET** `/api/v1/auth/me`

**Headers**: Requires Authorization token

**Success Response (200 OK)**:
```json
{
  "id": "uuid",
  "username": "demo_user", 
  "email": "demo@example.com",
  "fullName": "Demo User",
  "role": "organizer",
  "createdAt": "2025-09-06T10:30:00Z"
}
```

---

## 🏥 System Endpoints

### Health Check
**GET** `/api/v1/health`

**Success Response (200 OK)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-06T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### API Information
**GET** `/api/v1/info`

**Success Response (200 OK)**:
```json
{
  "name": "TrailGuide PWA API",
  "version": "1.0.0",
  "description": "Visual navigation system for unmapped spaces",
  "features": [
    "Hebrew RTL Support",
    "JWT Authentication", 
    "Guide Management",
    "File Upload"
  ],
  "documentation": "https://github.com/trailguide/pwa"
}
```

### Welcome Message
**GET** `/api/v1/welcome`

**Headers**: 
- `Accept-Language: he` (for Hebrew)
- `Accept-Language: en` (for English)

**Success Response (200 OK)**:
```json
{
  "message": "ברוכים הבאים ל-TrailGuide PWA",
  "description": "מערכת ניווט חזותית לאזורים לא ממופים",
  "language": "he",
  "features": [
    "תמיכה מלאה בעברית ובכיוון RTL",
    "אימות משתמשים מאובטח",
    "ניהול מדריכים חזותיים"
  ]
}
```

---

## 📱 Guide Management API

> **Status**: ✅ **PRODUCTION READY** - All critical issues resolved, dual endpoint support implemented

### Important: Dual Endpoint Support
The API serves the same routes at **both** endpoints for maximum compatibility:
- **Primary**: `/api/v1/events/*` (recommended for new development)
- **Legacy**: `/api/v1/guides/*` (maintained for backward compatibility)

### List User Guides
**GET** `/api/v1/events` or **GET** `/api/v1/guides`

**Headers**: Requires Authorization token

**Success Response (200 OK)**:
```json
[
  {
    "id": "uuid",
    "eventName": "Festival Navigation 2025",
    "status": "published",
    "expirationDate": "2025-12-31T23:59:59Z",
    "stepsCount": 5,
    "clicksCount": 142,
    "createdAt": "2025-09-01T10:00:00Z",
    "updatedAt": "2025-09-05T15:30:00Z"
  }
]
```

### Create New Guide
**POST** `/api/v1/events` or **POST** `/api/v1/guides`

**Headers**: Requires Authorization token

**Request Body**:
```json
{
  "eventName": "My Navigation Guide",
  "expirationDate": "2025-12-31T23:59:59Z"
}
```

**Success Response (201 Created)**:
```json
{
  "message": "Guide created successfully",
  "guideId": "uuid",
  "publicUrl": "https://your-domain.com/guide/uuid"
}
```

### Get Guide Details
**GET** `/api/v1/events/:id` or **GET** `/api/v1/guides/:id`

**Headers**: Requires Authorization token

**Success Response (200 OK)**:
```json
{
  "id": "uuid",
  "eventName": "Festival Navigation 2025", 
  "status": "published",
  "expirationDate": "2025-12-31T23:59:59Z",
  "clicksCount": 142,
  "createdAt": "2025-09-01T10:00:00Z",
  "steps": [
    {
      "id": "uuid",
      "stepOrder": 1,
      "imageUrl": "https://cdn.example.com/image1.jpg",
      "description": "Exit the parking lot and head towards the main entrance"
    }
  ]
}
```

### Update Guide
**PUT** `/api/v1/events/:id` or **PUT** `/api/v1/guides/:id`

**Headers**: Requires Authorization token

**Request Body**:
```json
{
  "eventName": "Updated Guide Name",
  "status": "published",
  "expirationDate": "2025-12-31T23:59:59Z"
}
```

**Success Response (200 OK)**:
```json
{
  "message": "Guide updated successfully"
}
```

### Delete Guide
**DELETE** `/api/v1/events/:id` or **DELETE** `/api/v1/guides/:id`

**Headers**: Requires Authorization token

**Success Response (200 OK)**:
```json
{
  "message": "Guide deleted successfully"
}
```

---

## 📋 Step Management API

> **Status**: In development

### Add Step to Guide
**POST** `/api/v1/events/:id/steps` or **POST** `/api/v1/guides/:id/steps`

**Headers**: Requires Authorization token

**Request Body**:
```json
{
  "stepOrder": 1,
  "imageUrl": "https://cdn.example.com/step-image.jpg",
  "description": "Walk straight for 100 meters towards the blue sign"
}
```

**Success Response (201 Created)**:
```json
{
  "message": "Step added successfully",
  "stepId": "uuid"
}
```

### Update Step
**PUT** `/api/v1/steps/:stepId`

**Headers**: Requires Authorization token

**Request Body**:
```json
{
  "stepOrder": 2,
  "description": "Updated step description"
}
```

**Success Response (200 OK)**:
```json
{
  "message": "Step updated successfully"
}
```

### Delete Step
**DELETE** `/api/v1/steps/:stepId`

**Headers**: Requires Authorization token

**Success Response (200 OK)**:
```json
{
  "message": "Step deleted successfully"
}
```

---

## 🌐 Public Access API

> **Status**: In development

### Get Public Guide
**GET** `/api/v1/public/guides/:id`

**No authentication required**

**Success Response (200 OK)**:
```json
{
  "eventName": "Festival Navigation 2025",
  "steps": [
    {
      "imageUrl": "https://cdn.example.com/step1.jpg",
      "description": "Exit the parking lot and head towards the main entrance"
    },
    {
      "imageUrl": "https://cdn.example.com/step2.jpg", 
      "description": "Turn right at the information booth"
    }
  ]
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "Guide not found or has expired"
}
```

---

## 📁 File Upload API

> **Status**: In development

### Upload Image
**POST** `/api/v1/upload`

**Headers**: 
- Requires Authorization token
- `Content-Type: multipart/form-data`

**Request Body**: FormData with image file

**Success Response (200 OK)**:
```json
{
  "message": "File uploaded successfully",
  "imageUrl": "https://cdn.example.com/uploads/uuid-filename.jpg",
  "fileId": "uuid"
}
```

---

## 📊 Analytics API

> **Status**: Planned

### Track Guide View
**POST** `/api/v1/analytics/events`

**Request Body**:
```json
{
  "guideId": "uuid",
  "eventType": "guide_view",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://example.com"
  }
}
```

---

## 🔒 Security Features

### Rate Limiting
- **Login endpoint**: 5 attempts per minute per IP
- **API endpoints**: 100 requests per minute per user
- **Public endpoints**: 50 requests per minute per IP

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### CORS Configuration
- **Development**: `http://localhost:5173`
- **Production**: Your custom domain
- **Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, Accept-Language

---

## 🧪 Testing

### Demo Accounts
```javascript
// Admin Account
const adminUser = {
  username: "trailguide_admin",
  email: "admin@trailguide.io",
  password: "TGA!2025Secure",
  role: "admin"
};

// Test User Accounts (can login with username or email)
const testUsers = [
  {
    username: "trailguide_user_a",
    email: "user.a@trailguide.io",
    password: "TgUa#2o25!",
    fullName: "TrailGuide User A"
  },
  {
    username: "trailguide_user_b", 
    email: "user.b@trailguide.io",
    password: "TgUb$4o25@",
    fullName: "TrailGuide User B"
  }
];
```

### Testing Commands
```bash
# Health check
curl http://localhost:3000/api/v1/health

# Login test with email
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user.a@trailguide.io","password":"TgUa#2o25!"}'

# Login test with username  
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trailguide_user_a","password":"TgUa#2o25!"}'

# Hebrew welcome message
curl -H "Accept-Language: he" http://localhost:3000/api/v1/welcome

# Authenticated request
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/v1/auth/me
```

---

## 🚨 Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message in user's language",
  "code": "ERROR_CODE",
  "timestamp": "2025-09-06T10:30:00Z",
  "path": "/api/v1/endpoint"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found  
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## 🔄 **Production-Ready Architecture Updates**

### Dual Endpoint Implementation (September 2025)

**Issue Resolved**: Frontend-backend endpoint mismatch causing 404 errors in production.

**Solution**: The API now serves identical routes at both endpoints:

| Endpoint Type | Path | Purpose |
|--------------|------|---------|
| **Primary** | `/api/v1/events/*` | Recommended for new development |
| **Legacy** | `/api/v1/guides/*` | Maintains backward compatibility |

**Implementation Details**:
```javascript
// Backend route configuration (api/src/app.js)
const guidesRoutes = require('./routes/events');
app.use('/api/v1/guides', guidesRoutes);  // Legacy support
app.use('/api/v1/events', guidesRoutes);  // Primary endpoint
```

**Migration Guide**:
- **New projects**: Use `/api/v1/events/*` endpoints
- **Existing projects**: Can continue using `/api/v1/guides/*` 
- **Frontend**: Updated to use `/api/v1/events/*` for consistency

### Critical Fixes Applied

1. **✅ Data Consistency Validation**
   - Fixed endpoint-aware validation logic
   - Resolves Hebrew error "טעינת הנתונים נכשלה"

2. **✅ Edit Mode Routing** 
   - Fixed Edit button routing from query to path parameters
   - Edit button now correctly navigates to `/app/edit/:id`

3. **✅ Form Pre-population**
   - Fixed edit mode detection and data loading
   - Forms now pre-populate with existing guide data

4. **✅ API Endpoint Consistency**
   - Added dual endpoint support for seamless transitions
   - No breaking changes for existing implementations

### Verification Commands
```bash
# Test both endpoints work
curl -H "Authorization: Bearer <token>" http://localhost/api/v1/events
curl -H "Authorization: Bearer <token>" http://localhost/api/v1/guides

# Both should return 401 (auth required) instead of 404
```

---

## 🌍 Internationalization

### Supported Languages
- **Hebrew (he)**: Primary language with RTL support
- **English (en)**: Secondary language

### Language Detection
1. `Accept-Language` header
2. User preference from JWT token
3. Default to Hebrew

### Response Localization
All error messages and API responses support both Hebrew and English based on the user's language preference.

---

This API documentation will be updated as development progresses. The authentication system is production-ready, while guide management features are currently being implemented.
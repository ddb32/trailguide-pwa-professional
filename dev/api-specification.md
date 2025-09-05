# API Specification - TrailGuide PWA MVP

## 🎯 Implementation Status (Updated: September 2025)

### ✅ **Implemented & Working**
- **Authentication System**: Complete login/logout functionality with JWT tokens
- **Health & Info Endpoints**: System status and API information endpoints  
- **Security Middleware**: Rate limiting, CORS, security headers configured
- **Hebrew RTL Support**: API responses with proper language detection
- **Demo Users**: Test accounts created for immediate testing

### ❌ **Not Yet Implemented** 
- **Event/Guide Management**: CRUD operations for guides and events
- **Step Management**: Adding and managing guide steps
- **File Upload**: Image upload for step creation
- **Public Guide Access**: End-user guide consumption endpoints
- **Analytics**: Usage tracking and statistics endpoints

### 🔗 **Working API Endpoints**
```bash
# Health check
GET /api/v1/health

# API information  
GET /api/v1/info

# Hebrew welcome message
GET /api/v1/welcome (with Accept-Language: he)

# Authentication
POST /api/v1/auth/login
POST /api/v1/auth/logout  
GET /api/v1/auth/me
```

### 🧪 **Test Authentication**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

---

## 1. Overview

This document provides comprehensive API specifications for the TrailGuide PWA backend. The API follows RESTful principles with JSON request/response format, JWT-based authentication, and consistent error handling.

> **🌐 Localization Requirement**: 
> Ensure that the TrailGuide PWA supports Hebrew with proper RTL layout for the Israeli audience.
> All text content should be stored in separate language-specific files (e.g., he.json or he.md), so that adding English (or other languages) in the future will be straightforward and maintainable.
> 
> **API Internationalization Support:**
> - Include `Accept-Language` header support for content localization
> - Provide endpoints for language-specific content delivery
> - Return localized error messages and API responses
> - Support locale-specific date/time formatting in responses

### Base URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.trailguide.app/api/v1`

### Global Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt_token>",
  "X-Client-Version": "1.0.0"
}
```

### Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "event_name",
        "message": "Event name is required"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 2. Authentication Endpoints

### 2.1 User Login ✅ **IMPLEMENTED**
**POST** `/auth/login`

Authenticate organizer and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "string (valid email, required)",
  "password": "string (6+ chars, required)"
}
```

**Demo Accounts Available:**
```json
{
  "email": "demo@example.com",
  "password": "demo123"
}
```
```json
{
  "email": "organizer@test.com", 
  "password": "test123"
}

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 900
    }
  },
  "message": "Login successful"
}
```

**Error Responses:**
- **401 Unauthorized**: Invalid credentials
- **429 Too Many Requests**: Rate limit exceeded (5 attempts/minute)
- **400 Bad Request**: Validation errors

### 2.2 Token Refresh
**POST** `/auth/refresh`

Refresh expired access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- **401 Unauthorized**: Invalid or expired refresh token
- **400 Bad Request**: Missing refresh token

### 2.3 Logout ✅ **IMPLEMENTED** 
**POST** `/auth/logout`

Invalidate current session tokens.

**Headers:** `Authorization: Bearer <access_token>`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 2.4 Get Current User ✅ **IMPLEMENTED**
**GET** `/auth/me`

Get current authenticated user information.

**Headers:** `Authorization: Bearer <access_token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "email": "string", 
    "fullName": "string",
    "createdAt": "timestamp"
  }
}
```

## 3. Event Management Endpoints

### 3.1 Get User's Events
**GET** `/events`

Retrieve all events for authenticated organizer with pagination and filtering.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `page`: Number (default: 1, min: 1)
- `limit`: Number (default: 10, max: 50)
- `status`: Enum (draft, published, expired)
- `sortBy`: Enum (created_at, updated_at, event_name)
- `sortOrder`: Enum (asc, desc)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "uuid",
        "event_name": "string",
        "status": "draft|published|expired",
        "expiration_date": "2024-01-20T18:00:00Z",
        "steps_count": 5,
        "clicks_count": 23,
        "created_at": "2024-01-15T10:00:00Z",
        "updated_at": "2024-01-15T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3.2 Create New Event
**POST** `/events`

Create a new guidance event.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "event_name": "string (1-255 chars, required)",
  "expiration_date": "string (ISO 8601 datetime, optional)",
  "metadata": {
    "description": "string (optional)",
    "location": "string (optional)",
    "contact_info": "string (optional)"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "event_name": "string",
      "status": "draft",
      "expiration_date": "2024-01-20T18:00:00Z",
      "steps_count": 0,
      "clicks_count": 0,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  },
  "message": "Event created successfully"
}
```

**Error Responses:**
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Invalid or expired token
- **409 Conflict**: Event name already exists for user

### 3.3 Get Event Details
**GET** `/events/:id`

Get detailed information about a specific event including all steps.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "event_name": "string",
      "status": "published",
      "expiration_date": "2024-01-20T18:00:00Z",
      "clicks_count": 45,
      "metadata": {
        "description": "string",
        "location": "string"
      },
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z",
      "steps": [
        {
          "id": "uuid",
          "step_order": 1,
          "image_url": "https://cdn.trailguide.app/images/...",
          "image_alt": "Description of image",
          "description": "Walk straight for 50 meters until you see the red tent",
          "created_at": "2024-01-15T11:00:00Z"
        }
      ]
    }
  }
}
```

**Error Responses:**
- **404 Not Found**: Event doesn't exist or doesn't belong to user
- **401 Unauthorized**: Invalid or expired token

### 3.4 Update Event
**PUT** `/events/:id`

Update event information (name, expiration, metadata).

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Request Body:**
```json
{
  "event_name": "string (1-255 chars, optional)",
  "expiration_date": "string (ISO 8601 datetime, optional, null to remove)",
  "metadata": {
    "description": "string (optional)",
    "location": "string (optional)",
    "contact_info": "string (optional)"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "event_name": "Updated Event Name",
      "status": "draft",
      "expiration_date": "2024-01-25T20:00:00Z",
      "updated_at": "2024-01-15T15:45:00Z"
    }
  },
  "message": "Event updated successfully"
}
```

### 3.5 Publish Event
**POST** `/events/:id/publish`

Publish event to make it accessible via public URL.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "status": "published",
      "public_url": "https://guide.trailguide.app/e/uuid",
      "updated_at": "2024-01-15T16:00:00Z"
    }
  },
  "message": "Event published successfully"
}
```

**Error Responses:**
- **400 Bad Request**: Event has no steps or missing required data
- **404 Not Found**: Event doesn't exist or doesn't belong to user

### 3.6 Delete Event
**DELETE** `/events/:id`

Permanently delete an event and all associated steps.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

**Error Responses:**
- **404 Not Found**: Event doesn't exist or doesn't belong to user
- **409 Conflict**: Cannot delete published event with active users

## 4. Step Management Endpoints

### 4.1 Add Step to Event
**POST** `/events/:eventId/steps`

Add a new step to an existing event.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `eventId`: UUID (required) - Event ID

**Request Body:**
```json
{
  "step_order": "number (1-100, optional, auto-assigned if not provided)",
  "image_url": "string (valid URL, optional)",
  "image_alt": "string (1-500 chars, optional)",
  "description": "string (1-200 chars, required)"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "step": {
      "id": "uuid",
      "event_id": "uuid",
      "step_order": 3,
      "image_url": "https://cdn.trailguide.app/images/...",
      "image_alt": "Red tent entrance",
      "description": "Look for the red tent with white banner",
      "created_at": "2024-01-15T12:00:00Z"
    }
  },
  "message": "Step added successfully"
}
```

### 4.2 Update Step
**PUT** `/steps/:id`

Update an existing step's content.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Step ID

**Request Body:**
```json
{
  "step_order": "number (1-100, optional)",
  "image_alt": "string (1-500 chars, optional)",
  "description": "string (1-200 chars, optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "step": {
      "id": "uuid",
      "step_order": 2,
      "description": "Updated description text",
      "updated_at": "2024-01-15T13:15:00Z"
    }
  },
  "message": "Step updated successfully"
}
```

### 4.3 Delete Step
**DELETE** `/steps/:id`

Remove a step from an event.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Step ID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Step deleted successfully"
}
```

### 4.4 Reorder Steps
**PUT** `/events/:eventId/steps/reorder`

Reorder all steps in an event.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `eventId`: UUID (required) - Event ID

**Request Body:**
```json
{
  "steps": [
    {
      "id": "uuid",
      "step_order": 1
    },
    {
      "id": "uuid", 
      "step_order": 2
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Steps reordered successfully"
}
```

## 5. Image Upload Endpoints

### 5.1 Get Upload URL
**POST** `/upload/presigned-url`

Get a presigned URL for direct image upload to S3.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "filename": "string (required, with extension)",
  "contentType": "string (image/jpeg, image/png, image/webp)",
  "fileSize": "number (max 5MB in bytes)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
    "fields": {
      "key": "events/uuid/images/filename.jpg",
      "AWSAccessKeyId": "...",
      "policy": "...",
      "signature": "..."
    },
    "publicUrl": "https://cdn.trailguide.app/events/uuid/images/filename.jpg",
    "expiresIn": 300
  }
}
```

### 5.2 Confirm Upload
**POST** `/upload/confirm`

Confirm successful image upload and get optimized URLs.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "key": "string (S3 object key from presigned URL)",
  "originalFilename": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://cdn.trailguide.app/events/uuid/images/filename.jpg",
    "thumbnailUrl": "https://cdn.trailguide.app/events/uuid/images/filename_thumb.jpg",
    "optimizedUrl": "https://cdn.trailguide.app/events/uuid/images/filename_opt.webp"
  }
}
```

## 6. Public Endpoints (End-User Access)

### 6.1 Get Public Event
**GET** `/public/events/:id`

Get event data for end-users (public access, no authentication required).

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": "uuid",
      "event_name": "Festival Navigation Guide",
      "status": "published",
      "total_steps": 7,
      "estimated_duration": "5-10 minutes",
      "steps": [
        {
          "step_order": 1,
          "image_url": "https://cdn.trailguide.app/images/...",
          "image_alt": "Main entrance gate",
          "description": "Enter through the main gate with the green banner"
        }
      ]
    }
  }
}
```

**Error Responses:**
- **404 Not Found**: Event doesn't exist, is not published, or has expired
- **410 Gone**: Event has been explicitly removed or expired

### 6.2 Track Event View
**POST** `/public/events/:id/view`

Track when someone accesses the public event (analytics).

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Request Body:**
```json
{
  "userAgent": "string (optional)",
  "referrer": "string (optional)",
  "timestamp": "string (ISO 8601, optional)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "View tracked successfully"
}
```

## 7. Analytics Endpoints

### 7.1 Get Event Analytics
**GET** `/events/:id/analytics`

Get basic analytics for an event.

**Headers:** `Authorization: Bearer <access_token>`

**Path Parameters:**
- `id`: UUID (required) - Event ID

**Query Parameters:**
- `period`: Enum (24h, 7d, 30d) - Default: 7d

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "total_views": 156,
      "unique_views": 134,
      "completion_rate": 0.87,
      "avg_time_spent": "4m 32s",
      "views_by_day": [
        {
          "date": "2024-01-15",
          "views": 23
        }
      ],
      "step_analytics": [
        {
          "step_order": 1,
          "views": 156,
          "completion_rate": 0.95
        }
      ]
    }
  }
}
```

## 8. Health and Utility Endpoints

### 8.1 Health Check
**GET** `/health`

System health check endpoint.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "storage": "healthy",
      "cache": "healthy"
    }
  }
}
```

### 8.2 API Version
**GET** `/version`

Get API version information.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "apiVersion": "v1",
    "buildDate": "2024-01-15T10:00:00Z",
    "environment": "production"
  }
}
```

## 9. Rate Limiting

### Rate Limits by Endpoint Category:
- **Authentication**: 5 requests/minute per IP
- **Event Management**: 30 requests/minute per user
- **Image Upload**: 10 uploads/minute per user
- **Public Access**: 100 requests/minute per IP
- **Analytics**: 10 requests/minute per user

### Rate Limit Headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1642248000
```

## 10. Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | Missing or invalid authentication |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `CONFLICT` | 409 | Resource conflict (duplicate, etc.) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service unavailability |

## 11. API Security Requirements

> **🔒 Security First Approach for MVP**
> All API endpoints must implement these security measures to prevent unauthorized access and protect user data.

### 11.1 Authentication & Authorization

#### JWT Token Security
```javascript
// Example JWT configuration (server-side)
const jwtConfig = {
  secret: process.env.JWT_SECRET, // Minimum 64 characters
  algorithm: 'HS256',
  expiresIn: '15m', // Short expiry for access tokens
  issuer: 'trailguide-api',
  audience: 'trailguide-client'
};

// Refresh token configuration
const refreshTokenConfig = {
  expiresIn: '7d', // Longer for refresh tokens
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true, // Prevent XSS access
  sameSite: 'strict' // CSRF protection
};
```

#### Protected Route Middleware
All authenticated endpoints must include JWT validation:
```javascript
// Required middleware for all protected routes
app.use('/api/v1/events', authenticateJWT);
app.use('/api/v1/steps', authenticateJWT);
app.use('/api/v1/upload', authenticateJWT);
app.use('/api/v1/analytics', authenticateJWT);

// Authentication middleware implementation required
function authenticateJWT(req, res, next) {
  // 1. Extract Bearer token from Authorization header
  // 2. Verify JWT signature and expiration
  // 3. Validate token claims (issuer, audience)
  // 4. Attach user info to request object
  // 5. Handle invalid/expired tokens appropriately
}
```

### 11.2 Input Validation & Sanitization

#### Required Validation for All Endpoints
**❌ NEVER trust user input - validate everything**

```javascript
// Example validation schema (using Joi or similar)
const eventCreateSchema = {
  event_name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9\s\-_.()]+$/) // Prevent XSS
    .required(),
  expiration_date: Joi.date()
    .iso()
    .min('now')
    .optional(),
  metadata: {
    description: Joi.string()
      .trim()
      .max(500)
      .pattern(/^[^<>]*$/) // Basic XSS prevention
      .optional()
  }
};

// SQL Injection Prevention
// ✅ Use parameterized queries ONLY
const query = 'SELECT * FROM events WHERE organizer_id = $1 AND status = $2';
const values = [userId, status];

// ❌ NEVER concatenate user input into SQL strings
// const badQuery = `SELECT * FROM events WHERE name = '${userInput}'`;
```

### 11.3 Rate Limiting Implementation

#### Endpoint-Specific Rate Limits
```javascript
// Rate limiting configuration per endpoint type
const rateLimits = {
  // Authentication endpoints - stricter limits
  '/api/v1/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // General API endpoints
  '/api/v1/events': {
    windowMs: 15 * 60 * 1000,
    max: 30, // 30 requests per 15 minutes
    keyGenerator: (req) => req.user.id, // Per user, not IP
  },
  
  // Public endpoints - per IP
  '/api/v1/public': {
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => req.ip,
    standardHeaders: true
  },
  
  // File upload - very limited
  '/api/v1/upload': {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    keyGenerator: (req) => req.user.id
  }
};
```

### 11.4 Error Handling Security

#### Secure Error Responses
```javascript
// ✅ Safe error responses - don't expose system details
const secureErrorHandler = (err, req, res, next) => {
  // Log full error details server-side
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Return sanitized error to client
  const safeErrors = {
    ValidationError: { code: 'VALIDATION_ERROR', status: 400 },
    UnauthorizedError: { code: 'AUTHENTICATION_REQUIRED', status: 401 },
    NotFoundError: { code: 'RESOURCE_NOT_FOUND', status: 404 }
  };
  
  const safeError = safeErrors[err.constructor.name] || {
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
    message: 'An unexpected error occurred'
  };
  
  res.status(safeError.status).json({
    success: false,
    error: {
      code: safeError.code,
      message: safeError.message
    },
    timestamp: new Date().toISOString()
  });
};

// ❌ NEVER expose sensitive information in errors
// Don't return: database errors, file paths, env variables, stack traces
```

### 11.5 Request Logging & Monitoring

#### Security Audit Logging
```javascript
// Log security-relevant events (without sensitive data)
const securityLogger = {
  loginAttempt: (username, ip, success) => {
    logger.info('Login attempt', {
      username: username, // Don't log passwords
      ip: ip,
      success: success,
      timestamp: new Date().toISOString()
    });
  },
  
  unauthorizedAccess: (req, reason) => {
    logger.warn('Unauthorized access attempt', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      reason: reason,
      timestamp: new Date().toISOString()
    });
  },
  
  dataAccess: (userId, resource, action) => {
    logger.info('Data access', {
      userId: userId,
      resource: resource,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
};

// ❌ NEVER log sensitive data: passwords, tokens, personal info
```

### 11.6 CORS & Headers Security

#### Secure CORS Configuration
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://yourdomain.com',
      'https://www.yourdomain.com'
    ];
    
    // Allow development origins in non-production
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:5173');
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Version']
};
```

#### Required Security Headers
```javascript
// Security headers middleware - apply to all responses
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for API responses
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  
  // HSTS (HTTPS only)
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});
```

### 11.7 File Upload Security

#### Secure File Upload Validation
```javascript
// File upload security checks
const fileUploadSecurity = {
  // Allowed file types and sizes
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFilesPerUser: 100,
  
  validateFile: (file) => {
    // Check file size
    if (file.size > fileUploadSecurity.maxFileSize) {
      throw new Error('File too large');
    }
    
    // Check MIME type
    if (!fileUploadSecurity.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }
    
    // Check file signature (magic bytes) - prevent MIME spoofing
    const fileSignature = file.buffer.slice(0, 4).toString('hex');
    const validSignatures = {
      'ffd8ffe0': 'image/jpeg',
      'ffd8ffe1': 'image/jpeg', 
      '89504e47': 'image/png',
      '52494646': 'image/webp'
    };
    
    if (!validSignatures[fileSignature]) {
      throw new Error('Invalid file signature');
    }
    
    return true;
  }
};
```

### 11.8 Production Security Checklist

#### Pre-Production Security Verification
- [ ] JWT secrets are cryptographically secure (64+ characters)
- [ ] All environment variables are properly configured
- [ ] Rate limiting is active on all endpoints
- [ ] Input validation is comprehensive and tested
- [ ] Error responses don't expose system information
- [ ] HTTPS is enforced (no HTTP in production)
- [ ] Security headers are properly set
- [ ] File upload validation is working
- [ ] Audit logging is functional
- [ ] CORS is configured for production domains only

#### Security Monitoring Setup
- [ ] Failed authentication alerts configured
- [ ] Rate limit breach notifications active
- [ ] Unusual access pattern detection enabled
- [ ] Security log analysis automated
- [ ] Regular security audit schedule established

This API specification provides complete documentation for implementing the TrailGuide PWA backend with consistent, RESTful endpoints, comprehensive security measures, and robust error handling.
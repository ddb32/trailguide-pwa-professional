# Frontend Architecture - TrailGuide PWA

## 🎯 Implementation Status (Updated: September 2025)

### ✅ **Fully Implemented & Working**
- **React 18 Application**: Complete setup with TypeScript and Vite
- **Professional UI/UX Design**: Polished interface with consistent design system
- **Hebrew RTL Support**: Complete internationalization with language switching
- **Authentication System**: Login/logout with protected routes and user state management
- **Responsive Layout**: Mobile-first design with sidebar navigation and hamburger menu
- **Component Architecture**: Reusable component library with professional styling
- **Routing System**: React Router v6 with protected route patterns
- **State Management**: React Context API for authentication and app state

### 🔄 **Partially Implemented**
- **Dashboard Interface**: Professional UI implemented but using mock data
- **Create Guide Form**: Form structure and validation ready, needs backend integration  
- **Navigation Components**: All UI components ready, needs real data connection

### ❌ **Not Yet Implemented**
- **PWA Features**: Service worker, offline capabilities, app manifest
- **End-User Guide Navigation**: Step-by-step guide consumption interface
- **Image Upload Components**: File upload UI for guide creation
- **Analytics Dashboard**: Usage statistics and metrics display
- **Performance Optimizations**: Code splitting, lazy loading, caching strategies

### 🎨 **UI/UX Achievement Highlights**
- **Professional Design**: Modern, clean interface with consistent spacing and typography
- **Accessibility**: WCAG-compliant focus states and keyboard navigation
- **Mobile Optimization**: Touch-friendly interactions and responsive breakpoints
- **Hebrew RTL Excellence**: Proper text direction, icon mirroring, and layout flow
- **User Experience**: Intuitive navigation patterns and loading states

### 🧪 **How to Test Current Implementation**
```bash
# Start development server
cd frontend && npm run dev
# Visit http://localhost:5173

# Test authentication flow with demo credentials:
# Email: demo@example.com, Password: demo123

# Test Hebrew RTL by clicking language switcher (EN/עב)
# Test responsive design with browser dev tools
# Test navigation and user menu functionality
```

---

## 1. Overview

TrailGuide's frontend is a modern Progressive Web Application built with React, TypeScript, and optimized for mobile-first experiences. The architecture supports two distinct user experiences: an organizer dashboard for creating and managing guidance events, and a mobile-optimized PWA for end-users following navigation steps.

### Core Principles
- **Mobile-First**: Optimized for mobile consumption with progressive enhancement
- **Performance**: Sub-3-second initial load, aggressive caching strategies
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design
- **Offline-Capable**: Core functionality available without internet connection
- **Progressive**: Enhanced features on capable devices and networks

> **🎨 Comprehensive UI/UX Requirement**: 
> The TrailGuide PWA must include a comprehensive UI/UX plan.
> Both User Experience (UX) and User Interface (UI) need to be designed at the highest professional level.
> 
> **UX**: Ensure intuitive navigation, logical user flows, accessibility compliance, and seamless interaction across all features.
> 
> **UI**: Create a modern, visually appealing design that is consistent, responsive (mobile & desktop), and optimized for RTL Hebrew while being prepared for future multilingual support.
> The final result should feel polished, professional, and delightful to use for both organizers and end-users.

> **🌐 Localization Requirement**: 
> Ensure that the TrailGuide PWA supports Hebrew with proper RTL layout for the Israeli audience.
> All text content should be stored in separate language-specific files (e.g., he.json or he.md), so that adding English (or other languages) in the future will be straightforward and maintainable.
> 
> **RTL Technical Considerations:**
> - Use CSS logical properties (margin-inline-start vs margin-left)
> - Implement automatic text direction detection and handling
> - Ensure proper RTL icon orientation and layout mirroring
> - Test navigation flows and form layouts in RTL mode

## 2. Technology Stack

### 2.1 Core Technologies
- **Framework**: React 18+ with Concurrent Features
- **Language**: TypeScript 5.0+ for type safety
- **Build Tool**: Vite 5.0+ for fast development and optimized production builds
- **Routing**: React Router v6 with lazy loading
- **State Management**: React Context API + useReducer pattern
- **Styling**: Tailwind CSS 3.0+ with custom design system
- **UI/UX Framework**: Professional design system with consistent components, spacing, typography, and color schemes optimized for both Hebrew RTL and future multilingual support

### 2.2 PWA Technologies
- **Service Worker**: Workbox 7.0+ for advanced caching strategies
- **Web App Manifest**: Native app-like installation experience
- **Push Notifications**: Web Push API for engagement (future enhancement)
- **Background Sync**: Offline form submission capabilities

### 2.3 Development Tools
- **Package Manager**: npm 9+ or pnpm 8+
- **Code Quality**: ESLint 8+ with React and TypeScript configs
- **Formatting**: Prettier with automated formatting
- **Pre-commit**: Husky with lint-staged for quality gates
- **Testing**: Vitest + React Testing Library + Playwright

## 3. Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── common/             # Generic components
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Loading/
│   │   └── ErrorBoundary/
│   ├── organizer/          # Organizer-specific components
│   │   ├── Dashboard/
│   │   ├── EventForm/
│   │   ├── StepEditor/
│   │   └── Analytics/
│   └── enduser/            # End-user PWA components
│       ├── NavigationFlow/
│       ├── StepCard/
│       └── ProgressIndicator/
├── pages/                  # Route-level components
│   ├── organizer/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CreateEventPage.tsx
│   │   └── AnalyticsPage.tsx
│   ├── enduser/
│   │   ├── EventStartPage.tsx
│   │   ├── GuidancePage.tsx
│   │   └── CompletionPage.tsx
│   └── ErrorPage.tsx
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts
│   ├── useLocalStorage.ts
│   ├── useImageUpload.ts
│   └── useAnalytics.ts
├── services/               # API communication
│   ├── api.ts             # Axios configuration
│   ├── authService.ts
│   ├── eventService.ts
│   └── uploadService.ts
├── context/               # Global state management
│   ├── AuthContext.tsx
│   ├── EventContext.tsx
│   └── PWAContext.tsx
├── utils/                 # Helper functions
│   ├── validation.ts
│   ├── formatting.ts
│   ├── storage.ts
│   └── analytics.ts
├── types/                 # TypeScript definitions
│   ├── api.ts
│   ├── auth.ts
│   └── events.ts
├── assets/               # Static assets
│   ├── icons/
│   ├── images/
│   └── fonts/
├── styles/               # Global styles
│   ├── globals.css
│   ├── tailwind.css
│   └── components.css
└── sw/                   # Service Worker files
    ├── sw.ts
    ├── strategies/
    └── utils/
```

## 4. Component Architecture

### 4.1 Component Design Principles
- **Single Responsibility**: Each component has one clear purpose
- **Composability**: Components work together seamlessly
- **Reusability**: Generic components used across both user types
- **Testability**: Components designed for easy unit testing
- **Professional Design**: All components follow consistent design standards with proper spacing, typography, visual hierarchy, and interactive feedback
- **User Delight**: Smooth animations, intuitive interactions, and polished visual details that create a delightful user experience
- **Accessibility-First**: Components built with ARIA labels, keyboard navigation, screen reader support, and high contrast mode compatibility

### 4.2 Component Hierarchy

```
App
├── Router
│   ├── OrganizerLayout
│   │   ├── Header
│   │   ├── Navigation
│   │   └── Page Content
│   │       ├── Dashboard
│   │       │   ├── EventList
│   │       │   ├── EventCard
│   │       │   └── CreateEventButton
│   │       ├── EventEditor
│   │       │   ├── EventForm
│   │       │   ├── StepEditor
│   │       │   │   ├── StepCard
│   │       │   │   ├── ImageUpload
│   │       │   │   └── StepActions
│   │       │   └── PreviewModal
│   │       └── Analytics
│   │           ├── MetricsGrid
│   │           └── ChartComponents
│   └── EndUserLayout
│       ├── NavigationHeader
│       └── GuidanceFlow
│           ├── StartScreen
│           ├── StepScreen
│           │   ├── StepImage
│           │   ├── StepDescription
│           │   └── NavigationControls
│           └── CompletionScreen
└── GlobalComponents
    ├── LoadingSpinner
    ├── ErrorBoundary
    ├── ToastNotifications
    └── PWAInstallPrompt
```

### 4.3 Example Component Implementation

```typescript
// components/enduser/StepCard/StepCard.tsx
import React, { useState } from 'react';
import { Step } from '@/types/events';
import { ImageWithFallback } from '@/components/common';
import { useAnalytics } from '@/hooks/useAnalytics';

interface StepCardProps {
  step: Step;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  isFirst,
  isLast
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { trackStepView } = useAnalytics();

  React.useEffect(() => {
    trackStepView(step.id, currentStep);
  }, [step.id, currentStep, trackStepView]);

  return (
    <div className="step-card max-w-md mx-auto bg-white rounded-xl shadow-lg">
      {/* Progress Indicator */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep} of {totalSteps}
          </span>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {step.image_url && (
          <div className="mb-4">
            <ImageWithFallback
              src={step.image_url}
              alt={step.image_alt || `Step ${currentStep} illustration`}
              className="w-full h-64 object-cover rounded-lg"
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          </div>
        )}

        <p className="text-lg text-gray-800 leading-relaxed mb-6">
          {step.description}
        </p>

        {/* Navigation Controls */}
        <div className="flex justify-between space-x-4">
          <button
            onClick={onPrevious}
            disabled={isFirst}
            className={`flex-1 py-3 px-4 rounded-lg font-medium ${
              isFirst
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400'
            } transition-colors duration-200`}
          >
            Previous
          </button>
          
          <button
            onClick={onNext}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200"
          >
            {isLast ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## 5. State Management Architecture

### 5.1 Global State Structure

```typescript
// context/AppContext.tsx
interface AppState {
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
  };
  events: {
    currentEvent: Event | null;
    eventsList: Event[];
    loading: boolean;
    error: string | null;
  };
  pwa: {
    isInstalled: boolean;
    isOnline: boolean;
    deferredPrompt: BeforeInstallPromptEvent | null;
    updateAvailable: boolean;
  };
  ui: {
    theme: 'light' | 'dark';
    notifications: Toast[];
    modals: {
      imagePreview: boolean;
      eventPreview: boolean;
    };
  };
}
```

### 5.2 Context Providers Setup

```typescript
// App.tsx
export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <PWAProvider>
        <AuthProvider>
          <EventProvider>
            <Router>
              <Routes>
                {/* Route definitions */}
              </Routes>
            </Router>
          </EventProvider>
        </AuthProvider>
      </PWAProvider>
    </ErrorBoundary>
  );
};
```

### 5.3 Custom Hooks for State Management

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  const login = async (credentials: LoginCredentials) => {
    context.dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      context.dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user: response.user, token: response.accessToken }
      });
      localStorage.setItem('auth_token', response.accessToken);
    } catch (error) {
      context.dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: error.message 
      });
    }
  };

  return {
    ...context.state,
    login,
    logout: context.logout,
    refreshToken: context.refreshToken
  };
};
```

## 6. PWA Configuration

### 6.1 Web App Manifest

```json
{
  "name": "TrailGuide - Visual Navigation",
  "short_name": "TrailGuide",
  "description": "Visual step-by-step navigation for unmapped spaces",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "categories": ["navigation", "travel", "utilities"],
  "lang": "en-US",
  "dir": "ltr",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-home.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "shortcuts": [
    {
      "name": "Start Navigation",
      "short_name": "Navigate",
      "description": "Quickly start following guidance",
      "url": "/navigate",
      "icons": [{ "src": "/icons/navigate-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

### 6.2 Service Worker Configuration

```typescript
// sw/sw.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return `${request.url}?version=1`;
        }
      }
    ]
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      {
        cacheExpiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    ]
  })
);

// App shell caching
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'app-shell'
  })
);

// Background sync for analytics
self.addEventListener('sync', event => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  // Sync offline analytics data
  const offlineData = await getOfflineAnalytics();
  if (offlineData.length > 0) {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      body: JSON.stringify(offlineData)
    });
    await clearOfflineAnalytics();
  }
}
```

## 7. Performance Optimization

### 7.1 Code Splitting Strategy

```typescript
// Lazy loading implementation
const OrganizerDashboard = lazy(() => import('@/pages/organizer/DashboardPage'));
const EventEditor = lazy(() => import('@/pages/organizer/EventEditorPage'));
const GuidanceFlow = lazy(() => import('@/pages/enduser/GuidancePage'));

// Route-based code splitting
<Routes>
  <Route path="/organizer/*" element={
    <Suspense fallback={<PageLoadingSpinner />}>
      <OrganizerDashboard />
    </Suspense>
  } />
  <Route path="/guidance/:eventId" element={
    <Suspense fallback={<GuidanceLoadingScreen />}>
      <GuidanceFlow />
    </Suspense>
  } />
</Routes>
```

### 7.2 Image Optimization

```typescript
// components/common/ImageWithFallback.tsx
interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc = '/images/placeholder.jpg',
  className,
  loading = 'lazy',
  onLoad
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImgSrc(fallbackSrc);
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Progressive image loading with WebP support
  const getOptimizedSrc = (originalSrc: string) => {
    if (originalSrc.includes('cdn.trailguide.app')) {
      return `${originalSrc}?format=webp&quality=80&width=800`;
    }
    return originalSrc;
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      <picture>
        <source 
          srcSet={`${getOptimizedSrc(imgSrc)} 1x, ${getOptimizedSrc(imgSrc)}?width=1600 2x`}
          type="image/webp"
        />
        <img
          src={imgSrc}
          alt={alt}
          className={className}
          loading={loading}
          onError={handleError}
          onLoad={handleLoad}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      </picture>
    </div>
  );
};
```

### 7.3 Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui-vendor': ['framer-motion', 'react-hot-toast']
        }
      }
    },
    target: 'es2020',
    sourcemap: process.env.NODE_ENV === 'development'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
```

## 8. Accessibility Implementation

### 8.1 WCAG 2.1 AA Compliance

```typescript
// components/common/Button/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  disabled,
  loading,
  ariaLabel,
  ariaDescribedBy,
  children,
  onClick
}) => {
  return (
    <button
      className={getButtonClasses(variant, size, disabled, loading)}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading && (
        <span className="sr-only">Loading...</span>
      )}
      <span aria-hidden={loading}>
        {children}
      </span>
      {loading && <LoadingSpinner size="sm" />}
    </button>
  );
};
```

### 8.2 Keyboard Navigation

```typescript
// hooks/useKeyboardNavigation.ts
export const useKeyboardNavigation = (
  totalSteps: number,
  currentStep: number,
  onNext: () => void,
  onPrevious: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          if (currentStep < totalSteps) {
            event.preventDefault();
            onNext();
          }
          break;
        case 'ArrowLeft':
          if (currentStep > 1) {
            event.preventDefault();
            onPrevious();
          }
          break;
        case 'Home':
          event.preventDefault();
          // Navigate to first step
          break;
        case 'End':
          event.preventDefault();
          // Navigate to last step
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, totalSteps, onNext, onPrevious]);
};
```

## 9. Testing Strategy

### 9.1 Unit Testing

```typescript
// components/StepCard/StepCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StepCard } from './StepCard';

const mockStep = {
  id: '1',
  step_order: 1,
  description: 'Test step description',
  image_url: 'https://example.com/image.jpg',
  image_alt: 'Test image'
};

describe('StepCard', () => {
  const defaultProps = {
    step: mockStep,
    currentStep: 1,
    totalSteps: 3,
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    isFirst: true,
    isLast: false
  };

  it('renders step content correctly', () => {
    render(<StepCard {...defaultProps} />);
    
    expect(screen.getByText('Test step description')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Test image');
  });

  it('disables previous button on first step', () => {
    render(<StepCard {...defaultProps} />);
    
    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });

  it('calls onNext when next button is clicked', () => {
    const onNext = jest.fn();
    render(<StepCard {...defaultProps} onNext={onNext} />);
    
    fireEvent.click(screen.getByText('Next'));
    expect(onNext).toHaveBeenCalled();
  });
});
```

### 9.2 E2E Testing

```typescript
// tests/e2e/guidance-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Guidance Flow', () => {
  test('complete navigation flow', async ({ page }) => {
    // Navigate to event
    await page.goto('/guidance/test-event-id');
    
    // Verify start screen
    await expect(page.locator('h1')).toContainText('Festival Navigation Guide');
    await page.click('button:has-text("Start Navigation")');
    
    // Navigate through steps
    for (let step = 1; step <= 3; step++) {
      await expect(page.locator('.step-counter')).toContainText(`Step ${step} of 3`);
      
      if (step < 3) {
        await page.click('button:has-text("Next")');
      }
    }
    
    // Complete flow
    await page.click('button:has-text("Complete")');
    await expect(page.locator('.completion-message')).toBeVisible();
  });

  test('offline functionality', async ({ page, context }) => {
    // Load event while online
    await page.goto('/guidance/test-event-id');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Verify offline functionality
    await page.click('button:has-text("Start Navigation")');
    await expect(page.locator('.step-card')).toBeVisible();
    
    // Navigation should still work offline
    await page.click('button:has-text("Next")');
    await expect(page.locator('.step-counter')).toContainText('Step 2 of 3');
  });
});
```

## 10. Build and Deployment

### 10.1 Build Configuration

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "analyze": "npx vite-bundle-analyzer"
  }
}
```

### 10.2 Environment Configuration

```typescript
// config/env.ts
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  CDN_BASE_URL: import.meta.env.VITE_CDN_BASE_URL || '',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  ANALYTICS_ID: import.meta.env.VITE_ANALYTICS_ID || '',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  ENVIRONMENT: import.meta.env.MODE || 'development'
};
```

## 11. Frontend Security Implementation

> **🔒 Frontend Security Requirements for MVP**
> The PWA frontend must implement comprehensive security measures to protect user data and prevent common web vulnerabilities.

### 11.1 HTTPS Enforcement & Secure Communication

#### Mandatory HTTPS in Production
```typescript
// utils/security.ts
export const enforceHTTPS = () => {
  if (
    location.protocol !== 'https:' && 
    location.hostname !== 'localhost' &&
    process.env.NODE_ENV === 'production'
  ) {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
  }
};

// Apply HTTPS enforcement in App.tsx
useEffect(() => {
  enforceHTTPS();
}, []);
```

#### Secure API Communication
```typescript
// services/api.ts - Secure API client configuration
import axios from 'axios';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
  }
});

// Security headers interceptor
api.interceptors.request.use((config) => {
  // Add CSRF token from meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  // Add client version for API versioning
  config.headers['X-Client-Version'] = import.meta.env.VITE_APP_VERSION;
  
  return config;
});
```

### 11.2 Authentication Token Security

#### Secure Token Storage & Management
```typescript
// utils/authStorage.ts
class SecureAuthStorage {
  private static readonly ACCESS_TOKEN_KEY = 'auth_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'auth_refresh_token';
  
  // ❌ NEVER store tokens in localStorage - vulnerable to XSS
  // ✅ Use secure, httpOnly cookies when possible
  // For MVP: Use sessionStorage with additional security measures
  
  static setTokens(accessToken: string, refreshToken: string): void {
    // Store access token in sessionStorage (cleared on tab close)
    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    
    // Store refresh token in httpOnly cookie (handled by server)
    // For client-side: Use secure storage with encryption
    this.setEncryptedRefreshToken(refreshToken);
  }
  
  static getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }
  
  static clearTokens(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    
    // Clear auth cookies
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict';
  }
  
  private static setEncryptedRefreshToken(token: string): void {
    // Simple encryption for client-side storage (not production-grade)
    const encrypted = btoa(token); // Use proper encryption in production
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, encrypted);
  }
}

// JWT token validation
export const validateToken = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = Date.now() >= payload.exp * 1000;
    return !isExpired;
  } catch {
    return false;
  }
};
```

#### Authentication Hook with Security
```typescript
// hooks/useAuth.ts - Secure authentication management
export const useAuth = () => {
  const [authState, setAuthState] = useState({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true
  });

  const login = async (credentials: LoginCredentials) => {
    try {
      // Rate limiting check (client-side backup)
      if (checkLoginAttempts() > 5) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      
      const response = await authService.login(credentials);
      
      // Validate token before storing
      if (!validateToken(response.accessToken)) {
        throw new Error('Invalid token received');
      }
      
      SecureAuthStorage.setTokens(response.accessToken, response.refreshToken);
      setAuthState({
        user: response.user,
        token: response.accessToken,
        isAuthenticated: true,
        loading: false
      });
      
      // Clear failed attempts counter
      clearLoginAttempts();
      
    } catch (error) {
      recordFailedLoginAttempt();
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      SecureAuthStorage.clearTokens();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      });
    }
  };

  return { ...authState, login, logout };
};
```

### 11.3 Input Sanitization & XSS Prevention

#### Input Validation & Sanitization
```typescript
// utils/validation.ts
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  // Remove HTML tags and script injections
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
};

export const validateEventName = (name: string): { isValid: boolean; error?: string } => {
  const sanitized = sanitizeInput(name);
  
  if (sanitized !== name) {
    return { isValid: false, error: 'Event name contains invalid characters' };
  }
  
  if (sanitized.length < 1 || sanitized.length > 255) {
    return { isValid: false, error: 'Event name must be 1-255 characters' };
  }
  
  // Prevent potentially malicious patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text\/html/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(name)) {
      return { isValid: false, error: 'Event name contains invalid content' };
    }
  }
  
  return { isValid: true };
};
```

#### Safe Content Rendering
```typescript
// components/common/SafeContent/SafeContent.tsx
import DOMPurify from 'dompurify';

interface SafeContentProps {
  content: string;
  allowedTags?: string[];
  className?: string;
}

export const SafeContent: React.FC<SafeContentProps> = ({ 
  content, 
  allowedTags = ['b', 'i', 'em', 'strong'],
  className 
}) => {
  const sanitizedContent = useMemo(() => {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href'], // Only allow href for links
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style'],
    });
  }, [content, allowedTags]);

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

// ❌ NEVER do this - XSS vulnerable:
// <div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Always sanitize user content:
// <SafeContent content={userInput} />
```

### 11.4 Content Security Policy (CSP) Implementation

#### CSP Configuration
```html
<!-- public/index.html - Content Security Policy -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.trailguide.app;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.trailguide.app wss://api.trailguide.app;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
">
```

#### CSP Violation Reporting
```typescript
// utils/cspReporting.ts
export const setupCSPReporting = () => {
  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    const violationReport = {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      originalPolicy: event.originalPolicy,
      documentURI: event.documentURI,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    // Report CSP violations to monitoring service
    fetch('/api/security/csp-violation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violationReport)
    }).catch(console.error);
  });
};
```

### 11.5 Secure Data Storage Practices

#### Local Storage Security
```typescript
// utils/secureStorage.ts
class SecureStorage {
  private static readonly ENCRYPTION_KEY = 'user-session-key';
  
  // ❌ NEVER store sensitive data in localStorage/sessionStorage without encryption
  // ❌ Avoid: passwords, tokens, personal information, API keys
  
  // ✅ Only store non-sensitive, user preference data
  static setUserPreference(key: string, value: string): void {
    const prefixedKey = `pref_${key}`;
    localStorage.setItem(prefixedKey, value);
  }
  
  static getUserPreference(key: string): string | null {
    const prefixedKey = `pref_${key}`;
    return localStorage.getItem(prefixedKey);
  }
  
  // For sensitive data, use encrypted storage with session-based keys
  static setEncryptedData(key: string, data: any): void {
    try {
      const encrypted = this.encrypt(JSON.stringify(data));
      sessionStorage.setItem(`enc_${key}`, encrypted);
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
    }
  }
  
  private static encrypt(data: string): string {
    // Use proper encryption library in production (crypto-js, etc.)
    return btoa(data); // Simple encoding for MVP
  }
  
  private static decrypt(encryptedData: string): string {
    return atob(encryptedData);
  }
}

// PWA offline data security
export const secureOfflineStorage = {
  // Store only non-sensitive event data for offline use
  cacheEventForOffline: (event: PublicEvent) => {
    const safeEvent = {
      id: event.id,
      name: event.event_name,
      steps: event.steps.map(step => ({
        order: step.step_order,
        description: step.description,
        image_url: step.image_url,
        image_alt: step.image_alt
      }))
    };
    
    SecureStorage.setEncryptedData(`offline_event_${event.id}`, safeEvent);
  }
};
```

### 11.6 Security Headers & PWA Security

#### Security Headers Implementation
```typescript
// utils/securityHeaders.ts
export const validateSecurityHeaders = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health', { method: 'HEAD' });
    
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options', 
      'X-XSS-Protection',
      'Referrer-Policy',
      'Strict-Transport-Security'
    ];
    
    const missingHeaders = requiredHeaders.filter(
      header => !response.headers.has(header)
    );
    
    if (missingHeaders.length > 0) {
      console.warn('Missing security headers:', missingHeaders);
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};
```

#### Secure Service Worker
```typescript
// sw/security.ts
// Secure service worker implementation
const ALLOWED_ORIGINS = [
  'https://app.trailguide.com',
  'https://www.trailguide.com'
];

self.addEventListener('message', (event) => {
  // Validate message origin
  if (!ALLOWED_ORIGINS.includes(event.origin)) {
    console.warn('Blocked message from unauthorized origin:', event.origin);
    return;
  }
  
  // Process legitimate messages only
  if (event.data?.type === 'CACHE_UPDATE') {
    handleCacheUpdate(event.data);
  }
});

// Prevent unauthorized cache manipulation
const handleCacheUpdate = (data: any) => {
  // Validate data structure and content
  if (!data.url || !data.url.startsWith('https://api.trailguide.com')) {
    console.warn('Blocked unauthorized cache update');
    return;
  }
  
  // Process authorized cache updates
  updateCache(data);
};
```

### 11.7 Form Security & CSRF Protection

#### Secure Form Implementation
```typescript
// components/common/SecureForm/SecureForm.tsx
interface SecureFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const SecureForm: React.FC<SecureFormProps> = ({ 
  onSubmit, 
  children, 
  className 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csrfToken] = useState(() => generateCSRFToken());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      
      // Add CSRF protection
      formData.append('_csrf', csrfToken);
      
      // Validate form data client-side
      const isValid = validateFormData(formData);
      if (!isValid) {
        throw new Error('Invalid form data');
      }
      
      await onSubmit(formData);
      
    } catch (error) {
      console.error('Form submission error:', error);
      // Show user-friendly error message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={className}
      noValidate // Custom validation only
    >
      <input type="hidden" name="_csrf" value={csrfToken} />
      {children}
      {isSubmitting && (
        <div className="form-overlay">
          <LoadingSpinner />
        </div>
      )}
    </form>
  );
};
```

### 11.8 Security Monitoring & Error Reporting

#### Security Event Tracking
```typescript
// utils/securityMonitoring.ts
export const securityMonitor = {
  reportSecurityEvent: (eventType: string, details: Record<string, any>) => {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...details
    };
    
    // Send to security monitoring service
    fetch('/api/security/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }).catch(console.error);
  },
  
  reportUnauthorizedAccess: (attemptedAction: string) => {
    securityMonitor.reportSecurityEvent('unauthorized_access', {
      action: attemptedAction,
      authenticated: !!SecureAuthStorage.getAccessToken()
    });
  },
  
  reportSuspiciousActivity: (activity: string, context: any) => {
    securityMonitor.reportSecurityEvent('suspicious_activity', {
      activity,
      context
    });
  }
};

// Global error boundary for security
export class SecurityErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if error might be security-related
    if (this.isSecurityError(error)) {
      securityMonitor.reportSecurityEvent('security_error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }
  
  private isSecurityError(error: Error): boolean {
    const securityKeywords = [
      'script', 'eval', 'xss', 'csrf', 'injection',
      'unauthorized', 'forbidden', 'token'
    ];
    
    return securityKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }
}
```

### 11.9 Production Security Checklist

#### Pre-Production Security Verification
- [ ] HTTPS is enforced across all environments
- [ ] Authentication tokens are stored securely (not in localStorage)
- [ ] All user inputs are validated and sanitized
- [ ] Content Security Policy is properly configured
- [ ] Security headers are implemented and verified
- [ ] XSS protection is active on all user-generated content
- [ ] CSRF protection is implemented for all forms
- [ ] Service worker follows security best practices
- [ ] Security event monitoring is functional
- [ ] Error messages don't expose sensitive information

#### Security Testing Checklist
- [ ] XSS vulnerability testing completed
- [ ] CSRF protection verified
- [ ] Authentication bypass attempts tested
- [ ] Input validation edge cases covered
- [ ] CSP violations are reported correctly
- [ ] Offline storage security validated
- [ ] Token expiration handling tested
- [ ] Security headers validation automated

This comprehensive frontend architecture provides a solid foundation for building a high-performance, accessible, secure, and maintainable PWA that delivers excellent user experiences across both organizer and end-user scenarios while maintaining strong security standards.
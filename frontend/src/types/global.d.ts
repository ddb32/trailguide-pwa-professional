/**
 * Global TypeScript declarations for external modules
 * Master declaration file to resolve TS7016 errors systematically
 */

// React-i18next module declarations
declare module 'react-i18next' {
  export interface UseTranslationResponse {
    t: (key: string, options?: any) => string;
    i18n: {
      language: string;
      changeLanguage: (lang: string) => Promise<void>;
      dir: (lang?: string) => 'ltr' | 'rtl';
    };
    ready: boolean;
  }

  export function useTranslation(namespace?: string): UseTranslationResponse;
  
  export interface TransProps {
    i18nKey: string;
    components?: Record<string, React.ReactElement>;
    values?: Record<string, any>;
    children?: React.ReactNode;
  }
  
  export const Trans: React.FC<TransProps>;
  export const initReactI18next: any;
}

// i18next module declarations
declare module 'i18next' {
  export interface InitOptions {
    resources?: any;
    lng?: string;
    fallbackLng?: string;
    debug?: boolean;
    interpolation?: {
      escapeValue?: boolean;
    };
  }

  export interface i18n {
    init: (options: InitOptions) => Promise<void>;
    use: (plugin: any) => i18n;
    t: (key: string, options?: any) => string;
    changeLanguage: (lang: string) => Promise<void>;
    language: string;
    dir: (lang?: string) => 'ltr' | 'rtl';
  }

  const i18next: i18n;
  export default i18next;
}

// i18next-browser-languagedetector
declare module 'i18next-browser-languagedetector' {
  const LanguageDetector: any;
  export default LanguageDetector;
}

// Component prop interfaces for common patterns
export interface ComponentWithChildren {
  children?: React.ReactNode;
  className?: string;
}

export interface ComponentWithOptionalId {
  id?: string;
  className?: string;
}

export interface BaseComponentProps {
  className?: string;
  disabled?: boolean;
  onClick?: (event?: React.MouseEvent) => void;
}

// Form-related interfaces
export interface FormFieldProps {
  name?: string;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
}

// Modal/Dialog interfaces
export interface BaseModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  className?: string;
}

// Feedback and analytics interfaces
export interface FeedbackData {
  type: 'bug' | 'feature' | 'general';
  title: string;
  description: string;
  rating?: number;
  email?: string;
}

export interface AnalyticsData {
  stats?: any[];
  feedbackStats?: any;
  recentFeedback?: any[];
  transformedStats?: any[];
  isLoading?: boolean;
}

// User interface extension
export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  role?: 'admin' | 'user';
  created_at?: string;
  profile_picture?: string;
}

// Variant type definitions for styling
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outlined' | 'link';
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ColorVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

// Common event handlers
export type ClickHandler = (event?: React.MouseEvent<HTMLButtonElement>) => void;
export type ChangeHandler = (value: any) => void;
export type SubmitHandler = (data: any) => void | Promise<void>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Guide and Event related interfaces  
export interface GuideLoadResponse {
  success: boolean;
  data: EventData;
  message?: string;
  error?: string;
}

export interface StepData {
  id?: string;
  step_order: number;
  description: string;
  image_url?: string;
  waze_link?: string;
}

export interface EventData {
  id?: string;
  event_id?: string;
  event_name: string;
  status: 'draft' | 'published';
  user_id?: string;
  steps?: StepData[];
  metadata?: {
    location?: string;
    description?: string;
  };
  cover_image_url?: string;
  expiration_date?: string;
  created_at: string;
  updated_at?: string;
  steps_count?: number;
}

// Formatted event interface (processed by eventsService.formatEventForDisplay)
export interface FormattedEvent {
  id: string;
  name: string;
  slug?: string;
  status: 'active' | 'expired' | 'draft' | 'published';
  views: number;
  completion_count: number;
  created: string;
  expires: string | null;
  expiration_date?: string;
  stepsCount: number;
  metadata: Record<string, any>;
  description?: string; // Extracted from metadata
  steps?: number; // Legacy field for compatibility
  _dataConsistency?: {
    endpointType: 'list' | 'detail';
    backendStepsCount?: number;
    calculatedStepsCount: number | string;
    hasStepsArray: boolean;
    isConsistent: boolean;
    source: string;
    autoCorrectionApplied: boolean;
    isProductionSafe: boolean;
  };
}

export interface SubmitData {
  eventName: string;
  location?: string;
  description?: string;
  expirationDate?: string;
  steps: {
    id?: string;
    step_order?: number;
    description: string;
    image?: File | null;
    wazeLink: string;
    existingImageUrl?: string | null;
    hasExistingImage: boolean;
  }[];
  coverImage?: File | null;
  status: 'draft' | 'published';
}

// Hook return types
export interface UseAnalyticsReturn {
  stats: any[];
  isLoading: boolean;
  error?: string;
  transformedStats?: any[];
  recentFeedback?: any[];
  feedbackStats?: any;
}

// Events service interface extension
export interface EventsService {
  createEventWithSteps: (data: Partial<EventData>) => Promise<ApiResponse<EventData>>;
  updateEventWithSteps: (id: string, data: Partial<EventData>) => Promise<ApiResponse<EventData>>;
  getEvent: (id: string) => Promise<GuideLoadResponse>;
  getEventById: (id: string) => Promise<ApiResponse<EventData>>;
  getAllEvents: () => Promise<ApiResponse<EventData[]>>;
}
import React, { useState, useEffect, Component } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { eventsService } from '../../services/eventsService';
import { useEvents } from '../../hooks/useEvents';
import { Icon } from '../../components/common/Icon';
import { debugIconMap, verifyIcons } from '../../components/common/Icon/iconMap';
import { Button } from '../../components/common/Button/Button';
import { Input } from '../../components/common/Input';
import { Radio, RadioGroup } from '../../components/common/Radio';
import { FormField, FormFieldGroup } from '../../components/common/FormField';
import { ImageUpload } from '../../components/ImageUpload';
import { FormCard } from '../../components/desktop/FormCard';
import StepEditor from '../../components/desktop/StepEditor/StepEditor';
import FormPreview from '../../components/desktop/FormPreview/FormPreview';
import FormValidation, { useFormValidation } from '../../components/desktop/FormValidation/FormValidation';
import ExpirationSettings from '../../components/GuideCreation/ExpirationSettings';

// Types and Interfaces
interface FormData {
  eventName: string;
  location: string;
  description?: string;
  status: 'draft' | 'published';
}

interface StepData {
  id?: string;
  description: string;
  actionItems: string[];
  wazeLink: string;
  hasNavigation: boolean;
  stepNumber: number;
  image?: File | null;
  imagePreview?: string | null;
  existingImageUrl?: string | null;
  hasExistingImage: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

interface ValidationWarnings {
  [key: string]: string;
}

interface SubmitData {
  event_name: string;
  description: string;
  location: string;
  status: 'draft' | 'published';
  expiration_hours: number;
  coverImage?: File | null;
  hasExistingCoverImage: boolean;
  existingCoverImageUrl?: string | null;
  steps: {
    id?: string;
    description: string;
    image?: File | null;
    wazeLink: string;
    existingImageUrl?: string | null;
    hasExistingImage: boolean;
  }[];
}

interface GuideLoadResponse {
  success: boolean;
  data?: {
    event_name: string;
    status: 'draft' | 'published';
    metadata?: {
      location?: string;
      description?: string;
    };
    cover_image_url?: string;
    expiration_date?: string;
    created_at: string;
    steps?: {
      id: string;
      description: string;
      step_order: number;
      image_url?: string;
      metadata?: {
        wazeLink?: string;
      };
    }[];
  };
  error?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: string;
  isEditMode: boolean;
}

// Enhanced Page Header Component
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, isEditMode }) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl shadow-sm border border-primary-100 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-2 lg:mb-3 leading-tight">
              <span className="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            <p className="text-base lg:text-lg text-gray-700 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          </div>

          {/* Header Icon */}
          <div className="hidden lg:flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl shadow-sm">
            <Icon
              name={icon}
              size="2xl"
              className="text-white"
              ariaHidden
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Loading State Component with Progress Tracking
interface LoadingStateProps {
  message: string;
  progress?: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  showRetry?: boolean;
  onRetry?: () => void;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message, 
  progress, 
  currentStep,
  totalSteps,
  completedSteps,
  showRetry = false,
  onRetry
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="text-center animate-fade-in max-w-md w-full">
        <div className="relative mb-8">
          {/* Outer spinning ring */}
          <div className="animate-spin rounded-full h-24 w-24 border-4 border-gray-200 border-t-primary-600 mx-auto"></div>
          
          {/* Inner pulsing core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-full animate-pulse-fast shadow-glow-primary"></div>
          </div>
          
          {/* Progress indicator in center if available */}
          {progress !== undefined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-white bg-primary-600 rounded-full w-8 h-8 flex items-center justify-center">
                {Math.round(progress)}%
              </span>
            </div>
          )}
          
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 border-2 border-primary-300 rounded-full animate-pulse-ring"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-2 border-primary-400 rounded-full animate-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2 animate-fade-in-up">
          {message}
        </h3>
        
        {/* Current step information */}
        {currentStep && (
          <p className="text-gray-700 mb-2 animate-fade-in-up font-medium" style={{ animationDelay: '0.1s' }}>
            {currentStep}
          </p>
        )}
        
        {/* Step progress */}
        {totalSteps && completedSteps !== undefined && (
          <p className="text-sm text-gray-600 mb-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            Step {completedSteps + 1} of {totalSteps}
          </p>
        )}
        
        <p className="text-gray-600 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {message}
        </p>
        
        {/* Enhanced dot loader */}
        <div className="flex justify-center space-x-2 animate-fade-in-up mb-6" style={{ animationDelay: '0.25s' }}>
          <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce shadow-sm"></div>
          <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.3s' }}></div>
          <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.4s' }}></div>
        </div>
        
        {/* Progress bar */}
        <div className="max-w-xs mx-auto mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            {progress !== undefined ? (
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            ) : (
              <div className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 animate-shimmer-fast"></div>
            )}
          </div>
          {progress !== undefined && (
            <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
          )}
        </div>
        
        {/* Retry button */}
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors duration-200 text-sm font-medium"
          >
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
};

// Enhanced Form Actions Component  
interface FormActionsProps {
  onCancel: () => void;
  isSubmitting: boolean;
  isFormValid: boolean;
  hasImageError: boolean;
  isLoadingGuide: boolean;
  isEditMode: boolean;
  submitText: string;
  cancelText: string;
  formInitialized: boolean;
  validationState: 'idle' | 'validating' | 'valid' | 'invalid';
}

const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  isSubmitting,
  isFormValid,
  hasImageError,
  isLoadingGuide,
  isEditMode,
  submitText,
  cancelText,
  formInitialized,
  validationState
}) => {
  const { isRTL } = useLanguageDirection();
  
  // Runtime safety checks with fallbacks
  const safeFormInitialized = formInitialized ?? false;
  const safeValidationState = validationState ?? 'idle';
  
  // Submit-time validation approach - reduced disabling conditions
  const isSubmitDisabled = 
    !safeFormInitialized || 
    isSubmitting || 
    isLoadingGuide ||
    hasImageError; // Removed continuous validation checks for better UX
  
  const getSubmitButtonIcon = () => {
    if (isSubmitting) return <Icon name="loading" size="sm" className="animate-spin" />;
    if (safeValidationState === 'validating') return <Icon name="loading" size="sm" className="animate-pulse" />;
    return <Icon name={isEditMode ? 'edit' : 'create'} size="sm" />;
  };
  
  const getSubmitButtonText = () => {
    if (isSubmitting) return isEditMode ? 'Updating...' : 'Creating...';
    if (safeValidationState === 'validating') return 'Validating...';
    if (!safeFormInitialized) return 'Loading...';
    return submitText;
  };
  
  return (
    <div className="bg-white rounded-xl shadow-desktop p-6 border border-gray-100">
      <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 lg:flex-none lg:px-6"
          icon={<Icon name="close" size="sm" />}
          iconPosition="left"
        >
          {cancelText}
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          disabled={isSubmitDisabled}
          className={`flex-1 lg:flex-none lg:px-6 ${
            safeValidationState === 'valid' ? 'ring-2 ring-green-200' : ''
          } ${
            safeValidationState === 'invalid' ? 'ring-2 ring-red-200' : ''
          }`}
          icon={getSubmitButtonIcon()}
          iconPosition="left"
        >
          {getSubmitButtonText()}
        </Button>
      </div>
      
      {/* Submit-time validation status indicator */}
      {safeFormInitialized && (
        <div className="mt-2 flex items-center justify-center text-sm">
          {safeValidationState === 'validating' && (
            <span className="text-blue-600 flex items-center gap-1">
              <Icon name="loading" size="xs" className="animate-pulse" />
              Validating form...
            </span>
          )}
          {safeValidationState === 'valid' && (
            <span className="text-green-600 flex items-center gap-1">
              <Icon name="check" size="xs" />
              Validation passed
            </span>
          )}
          {safeValidationState === 'invalid' && (
            <span className="text-red-600 flex items-center gap-1">
              <Icon name="warning" size="xs" />
              Please fix validation errors
            </span>
          )}
          {safeValidationState === 'idle' && safeFormInitialized && (
            <span className="text-gray-500 flex items-center gap-1">
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Multi-Level Error Boundary System for comprehensive error handling

// Base error types for better error categorization
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'network' | 'validation' | 'form' | 'rendering' | 'data' | 'unknown';

interface ErrorDetails {
  severity: ErrorSeverity;
  category: ErrorCategory;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
}

// Enhanced error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorDetails?: ErrorDetails;
  errorId?: string;
  retryCount: number;
}

// Error classification utility
const classifyError = (error: Error): ErrorDetails => {
  const message = error.message.toLowerCase();
  
  // Network-related errors
  if (message.includes('network') || message.includes('fetch') || message.includes('401') || message.includes('502') || message.includes('503')) {
    return {
      severity: 'high',
      category: 'network',
      recoverable: true,
      userMessage: 'Connection issue detected. Please check your internet connection and try again.',
      technicalMessage: error.message
    };
  }
  
  // Form/validation errors
  if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
    return {
      severity: 'medium',
      category: 'validation',
      recoverable: true,
      userMessage: 'Please check your form inputs and try again.',
      technicalMessage: error.message
    };
  }
  
  // Data loading/processing errors
  if (message.includes('load') || message.includes('data') || message.includes('guide')) {
    return {
      severity: 'high',
      category: 'data',
      recoverable: true,
      userMessage: 'Failed to load guide data. This might be a temporary issue.',
      technicalMessage: error.message
    };
  }
  
  // Rendering errors (React component errors)
  if (message.includes('render') || message.includes('component') || message.includes('undefined')) {
    return {
      severity: 'critical',
      category: 'rendering',
      recoverable: false,
      userMessage: 'A display error occurred. Please refresh the page.',
      technicalMessage: error.message
    };
  }
  
  // Default classification
  return {
    severity: 'medium',
    category: 'unknown',
    recoverable: true,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: error.message
  };
};

// Primary Form Error Boundary with enhanced error handling
class FormErrorBoundary extends Component<
  { 
    children: React.ReactNode; 
    fallback?: React.ReactNode;
    level?: 'form' | 'component' | 'page';
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  ErrorBoundaryState
> {
  private maxRetries = 3;
  
  constructor(props: { 
    children: React.ReactNode; 
    fallback?: React.ReactNode;
    level?: 'form' | 'component' | 'page';
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorDetails = classifyError(error);
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      hasError: true, 
      error,
      errorDetails,
      errorId,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const level = this.props.level || 'form';
    const errorDetails = this.state.errorDetails || classifyError(error);
    
    console.error(`❌ ${level}ErrorBoundary caught an error:`, {
      level,
      errorId: this.state.errorId,
      severity: errorDetails.severity,
      category: errorDetails.category,
      recoverable: errorDetails.recoverable,
      retryCount: this.state.retryCount,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Report to parent error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (reportError) {
        console.error('❌ Error reporting failed:', reportError);
      }
    }
    
    // Update state with comprehensive error info
    this.setState({
      hasError: true,
      error,
      errorInfo,
      errorDetails,
      errorId: this.state.errorId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  handleRetry = () => {
    const { errorDetails, retryCount } = this.state;
    
    if (!errorDetails?.recoverable) {
      console.warn('🚫 Retry attempted on non-recoverable error');
      return;
    }
    
    if (retryCount >= this.maxRetries) {
      console.warn('🚫 Max retry attempts reached');
      return;
    }
    
    console.log(`🔄 Retrying... (attempt ${retryCount + 1}/${this.maxRetries})`);
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorDetails: undefined,
      retryCount: retryCount + 1
    });
  };

  handleReset = () => {
    console.log('🔄 Resetting error boundary state');
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorDetails: undefined,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      const { errorDetails, retryCount, errorId } = this.state;
      const level = this.props.level || 'form';
      const canRetry = errorDetails?.recoverable && retryCount < this.maxRetries;
      
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="text-center max-w-lg">
            <div className="mb-6">
              {/* Dynamic icon based on error severity */}
              <Icon 
                name={errorDetails?.severity === 'critical' ? 'x-circle' : 'warning'} 
                size="xl" 
                className={`mx-auto mb-4 ${
                  errorDetails?.severity === 'critical' ? 'text-red-600' : 
                  errorDetails?.severity === 'high' ? 'text-orange-500' : 
                  'text-yellow-500'
                }`} 
              />
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {errorDetails?.category === 'network' ? 'Connection Error' :
                 errorDetails?.category === 'data' ? 'Data Loading Error' :
                 errorDetails?.category === 'validation' ? 'Validation Error' :
                 errorDetails?.category === 'rendering' ? 'Display Error' :
                 `${level.charAt(0).toUpperCase() + level.slice(1)} Error`}
              </h2>
              
              <p className="text-gray-600 mb-4">
                {errorDetails?.userMessage || 'An unexpected error occurred.'}
              </p>
              
              {errorDetails && (
                <div className="text-sm text-gray-500 mb-4">
                  Severity: {errorDetails.severity} • Category: {errorDetails.category}
                  {retryCount > 0 && ` • Retry ${retryCount}/${this.maxRetries}`}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {canRetry && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={this.handleRetry}
                  icon={<Icon name="refresh" size="sm" />}
                  className="w-full"
                >
                  Try Again ({this.maxRetries - retryCount} attempts left)
                </Button>
              )}
              
              {errorDetails?.severity !== 'critical' && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={this.handleReset}
                  icon={<Icon name="refresh" size="sm" />}
                  className="w-full"
                >
                  Reset Form
                </Button>
              )}
              
              <Button
                variant="secondary"
                size="lg"
                onClick={() => window.location.reload()}
                icon={<Icon name="refresh" size="sm" />}
                className="w-full"
              >
                Reload Page
              </Button>
              
              <Button
                variant="outlined"
                size="lg"
                onClick={() => window.history.back()}
                icon={<Icon name="arrow-left" size="sm" />}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-4 bg-red-50 rounded text-xs font-mono text-red-800 overflow-auto max-h-64">
                  <div><strong>Error ID:</strong> {errorId}</div>
                  <div><strong>Level:</strong> {level}</div>
                  <div><strong>Technical Message:</strong> {errorDetails?.technicalMessage || this.state.error?.message}</div>
                  <div><strong>Retry Count:</strong> {retryCount}</div>
                  <div className="mt-2"><strong>Stack Trace:</strong></div>
                  <pre className="whitespace-pre-wrap text-xs">{this.state.error?.stack}</pre>
                  {this.state.errorInfo?.componentStack && (
                    <>
                      <div className="mt-2"><strong>Component Stack:</strong></div>
                      <pre className="whitespace-pre-wrap text-xs">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized Component-Level Error Boundary
class ComponentErrorBoundary extends FormErrorBoundary {
  render() {
    if (this.state.hasError) {
      const { errorDetails, retryCount } = this.state;
      const canRetry = errorDetails?.recoverable && retryCount < this.maxRetries;
      
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-start">
            <Icon name="warning" size="md" className="text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Component Error
              </h3>
              <p className="text-sm text-red-700 mb-3">
                {errorDetails?.userMessage || 'This component encountered an error.'}
              </p>
              <div className="flex space-x-2">
                {canRetry && (
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={this.handleRetry}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={this.handleReset}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Data Loading Error Boundary
class DataErrorBoundary extends FormErrorBoundary {
  render() {
    if (this.state.hasError) {
      const { errorDetails, retryCount } = this.state;
      const canRetry = errorDetails?.recoverable && retryCount < this.maxRetries;
      
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Icon name="warning" size="lg" className="text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Data
          </h3>
          <p className="text-gray-600 text-center mb-6">
            {errorDetails?.userMessage || 'Unable to load the required data.'}
          </p>
          {canRetry && (
            <Button
              variant="primary"
              onClick={this.handleRetry}
              icon={<Icon name="refresh" size="sm" />}
            >
              Retry Loading
            </Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

const CreateGuide: React.FC = () => {
  const { t } = useTranslation();
  const { languageClasses, isRTL } = useLanguageDirection();
  const navigate = useNavigate();
  const { refreshEvents } = useEvents();
  const { id } = useParams<{ id?: string }>();
  
  // Enhanced edit mode detection with comprehensive logging
  const isEditMode = Boolean(id && id.trim() !== '');
  
  // Debug edit mode detection
  React.useEffect(() => {
    console.log('🔍 Edit mode detection:', {
      id,
      idType: typeof id,
      idLength: id?.length,
      idTrimmed: id?.trim(),
      isEditMode,
      routePath: window.location.pathname
    });
  }, [id, isEditMode]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [existingCoverImage, setExistingCoverImage] = useState<string | null>(null);
  const [expirationHours, setExpirationHours] = useState(24);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Enhanced loading state management
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [completedLoadingSteps, setCompletedLoadingSteps] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    control,
    trigger
  } = useForm<FormData>({
    mode: 'onSubmit', // Changed from 'onChange' to reduce performance overhead
    defaultValues: {
      eventName: '',
      location: '',
      status: 'draft'
    }
  });

  // Watch form values for preview
  const formData = watch();
  const [showValidation, setShowValidation] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  
  const { errors: validationErrors, warnings, isValid: formIsValid } = useFormValidation({
    ...formData,
    coverImage: imageFile || existingCoverImage
  }, steps);

  // Icon verification on component mount (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 CreateGuide mounted - verifying critical icons...');
      debugIconMap();
      const criticalIcons = ['loading', 'check', 'arrow-left', 'warning', 'refresh', 'close', 'edit', 'create'];
      const verification = verifyIcons(criticalIcons);
      console.log('✅ Critical icon verification:', verification);
      
      // Log any missing icons
      const missingIcons = Object.entries(verification).filter(([_, exists]) => !exists).map(([name, _]) => name);
      if (missingIcons.length > 0) {
        console.error('🚨 MISSING CRITICAL ICONS:', missingIcons);
      }
    }
  }, []); // Run once on mount
  
  // REMOVED: Old problematic form initialization logic with circular dependency
  // Form initialization is now handled directly in the guaranteed edit mode flow above

  // Submit-focused validation system (replaces continuous validation)
  useEffect(() => {
    if (!formInitialized) {
      console.log('⏸️ Form not initialized yet - validation will occur at submit time');
      setValidationState('idle');
      return;
    }
    
    // Set idle state for initialized forms - validation happens on submit
    console.log('📝 Form initialized - submit-time validation enabled:', {
      formInitialized,
      hasEventName: !!formData.eventName,
      stepCount: steps.length
    });
    
    setValidationState('idle');
  }, [formInitialized]);
  
  // Optional: On-blur validation for critical fields only
  const handleCriticalFieldBlur = async (fieldName: keyof FormData) => {
    if (!formInitialized) return;
    
    console.log(`🔍 On-blur validation for critical field: ${fieldName}`);
    try {
      await trigger(fieldName);
    } catch (error) {
      console.warn(`⚠️ Blur validation failed for ${fieldName}:`, error);
    }
  };
  

  // Image handlers
  const handleImageSelect = (file: File | null, error: string | null) => {
    setImageError(error);
    if (!error) {
      setImageFile(file);
    }
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImageError(null);
    setExistingCoverImage(null);
  };

  // REMOVED: Old loadExistingGuide function - replaced by guaranteed edit mode flow above
  // 
  // This function had complex retry logic and multiple processing steps that are now
  // handled directly in the guaranteedEditModeFlow function which provides:
  // - Guaranteed API calls
  // - Atomic form population
  // - Better error handling
  // - Simplified state management
  //
  // If you need to restore retry functionality, implement it in the new flow above

  // Simple retry function for user-triggered retries (refreshes the page component)
  const retryLoadGuide = () => {
    if (id) {
      console.log('🔄 User requested retry - reloading component');
      // Force component reload by clearing states and letting useEffect run again
      setLoadError(null);
      setDataLoaded(false);
      setFormInitialized(false);
      setIsLoadingGuide(false);
      
      // Trigger the guaranteed flow again by updating a state
      window.location.reload(); // Simple but effective retry
    }
  };

  // REMOVED: Old complex loadExistingGuide function - replaced by guaranteed edit mode flow above

  // REMOVED: performFormReset - functionality moved to guaranteed edit mode flow above

  // REMOVED: processExpirationSettings - functionality moved to guaranteed edit mode flow above

  // REMOVED: processCoverImage - functionality moved to guaranteed edit mode flow above

  // Process steps with comprehensive validation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const processSteps = async (guideData: any): Promise<void> => {
    try {
      if (!guideData.steps || !Array.isArray(guideData.steps)) {
        setSteps([]);
        console.log('📋 No steps found, initializing with empty array');
        return;
      }
      
      if (guideData.steps.length === 0) {
        setSteps([]);
        console.log('📋 Empty steps array, initializing with empty array');
        return;
      }
      
      console.log(`📋 Processing ${guideData.steps.length} steps for editing`);
      
      const transformedSteps: StepData[] = [];
      
      for (let index = 0; index < guideData.steps.length; index++) {
        const step = guideData.steps[index];
        
        if (!step || typeof step !== 'object') {
          console.error(`❌ Step ${index + 1} is invalid:`, step);
          continue; // Skip invalid steps instead of throwing
        }
        
        // Validate required step fields
        if (!step.id || typeof step.id !== 'string') {
          console.warn(`⚠️ Step ${index + 1} missing or invalid ID, using temp ID`);
        }
        
        const transformedStep: StepData = {
          id: step.id || `temp-${Date.now()}-${index}`,
          description: String(step.description || '').trim(),
          actionItems: [], // Initialize empty
          wazeLink: String(step.metadata?.wazeLink || '').trim(),
          hasNavigation: !!(step.metadata?.wazeLink),
          stepNumber: step.step_order || (index + 1),
          image: null, // No new image initially
          imagePreview: null, // No new image preview initially
          existingImageUrl: step.image_url && typeof step.image_url === 'string' ? step.image_url : null,
          hasExistingImage: !!(step.image_url)
        };
        
        // Validate transformed step
        if (!transformedStep.description) {
          console.warn(`⚠️ Step ${index + 1} has empty description`);
        }
        
        transformedSteps.push(transformedStep);
        
        console.log(`📋 Transformed step ${index + 1}:`, {
          id: transformedStep.id,
          descriptionLength: transformedStep.description.length,
          hasWaze: !!transformedStep.wazeLink,
          hasImage: transformedStep.hasExistingImage
        });
      }
      
      setSteps(transformedSteps);
      console.log(`✅ Successfully processed ${transformedSteps.length} steps`);
      
    } catch (error) {
      console.error('❌ Error processing steps:', error);
      setSteps([]); // Fallback to empty array
    }
  };

  // Final validation that all data was loaded correctly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validateLoadedData = async (formData: FormData, guideData: any): Promise<void> => {
    console.log('🔍 Performing final data validation...');
    
    // Wait a bit for all state updates to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const currentFormValues = watch();
    const currentSteps = steps;
    const currentCoverImage = existingCoverImage;
    
    const validationIssues: string[] = [];
    
    // Validate form data was loaded
    if (!currentFormValues.eventName && formData.eventName) {
      validationIssues.push(`Form event name not loaded (expected: "${formData.eventName}")`);
    }
    
    if (currentFormValues.status !== formData.status) {
      validationIssues.push(`Form status mismatch (expected: "${formData.status}", got: "${currentFormValues.status}")`);
    }
    
    // Validate steps were loaded if they exist
    if (guideData.steps && Array.isArray(guideData.steps) && guideData.steps.length > 0) {
      if (currentSteps.length !== guideData.steps.length) {
        validationIssues.push(`Steps count mismatch (expected: ${guideData.steps.length}, got: ${currentSteps.length})`);
      }
    }
    
    // Validate cover image was loaded if it exists
    if (guideData.cover_image_url && !currentCoverImage) {
      validationIssues.push(`Cover image not loaded (expected: "${guideData.cover_image_url}")`);
    }
    
    if (validationIssues.length > 0) {
      console.error('❌ Data loading validation failed:', validationIssues);
      throw new Error(`Data loading incomplete: ${validationIssues.join(', ')}`);
    }
    
    console.log('✅ Final data validation passed');
  };

  // Enhanced pre-submission validation with PRODUCTION BLOCKING GATES
  const performPreSubmitValidation = async (data: FormData): Promise<{ isValid: boolean; errors: string[] }> => {
    console.log('🔍 Performing CRITICAL pre-submission validation (PRODUCTION BLOCKING)...');
    
    const errors: string[] = [];
    const criticalErrors: string[] = [];
    
    // **CRITICAL FIELD VALIDATION GATES** - BLOCKS PRODUCTION SUBMISSION
    console.log('🚨 CRITICAL VALIDATION: Checking required fields...');
    
    // Critical Field 1: Event Name (MANDATORY)
    if (!data.eventName?.trim()) {
      criticalErrors.push('CRITICAL: Event name is required and cannot be empty');
    }
    
    // Critical Field 2: Status (MANDATORY)
    if (!data.status || !['draft', 'published'].includes(data.status)) {
      criticalErrors.push('CRITICAL: Valid status (draft/published) is required');
    }
    
    // Critical Field 3: User Authentication (MANDATORY)
    const userToken = localStorage.getItem('token');
    if (!userToken) {
      criticalErrors.push('CRITICAL: User authentication required - please log in again');
    }
    
    // Critical Field 4: Steps Array Validation (MANDATORY)
    if (!Array.isArray(steps)) {
      criticalErrors.push('CRITICAL: Steps data structure is invalid');
    } else {
      // Validate each step has required structure
      steps.forEach((step, index) => {
        if (!step || typeof step !== 'object') {
          criticalErrors.push(`CRITICAL: Step ${index + 1} has invalid data structure`);
        }
        if (step.description === undefined || step.description === null) {
          criticalErrors.push(`CRITICAL: Step ${index + 1} description is required (even if empty)`);
        }
      });
    }
    
    // **IMMEDIATE BLOCK**: If critical errors exist, stop all processing
    if (criticalErrors.length > 0) {
      console.error('🚨 CRITICAL VALIDATION FAILED - BLOCKING SUBMISSION:', criticalErrors);
      return {
        isValid: false,
        errors: [
          '🚨 CRITICAL VALIDATION FAILURES:',
          ...criticalErrors,
          '',
          '⛔ Submission blocked to prevent data corruption.',
          'Please fix these critical issues before proceeding.'
        ]
      };
    }
    
    console.log('✅ CRITICAL validation passed - proceeding with standard validation...');
    
    // Standard validation (non-blocking but important)
    if (!data.eventName?.trim()) {
      errors.push('Event name is required');
    }
    
    if (data.eventName?.trim().length > 255) {
      errors.push('Event name must be less than 255 characters');
    }
    
    // Status validation
    if (!['draft', 'published'].includes(data.status)) {
      errors.push('Invalid status selected');
    }
    
    // Steps validation
    if (steps.length === 0) {
      console.warn('⚠️ No steps provided - this will create an empty guide');
      // Allow empty guides but warn the user
    } else {
      // Validate each step
      steps.forEach((step, index) => {
        if (!step.description?.trim()) {
          errors.push(`Step ${index + 1}: Description is required`);
        }
        
        if (step.description && step.description.length > 500) {
          errors.push(`Step ${index + 1}: Description too long (max 500 characters)`);
        }
        
        // Validate Waze link format if provided
        if (step.wazeLink && !isValidWazeLink(step.wazeLink)) {
          errors.push(`Step ${index + 1}: Invalid Waze link format`);
        }
      });
    }
    
    // Image validation
    if (imageFile) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageFile.size > maxSize) {
        errors.push('Cover image too large (max 5MB)');
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(imageFile.type)) {
        errors.push('Cover image must be JPG, PNG, GIF, or WebP');
      }
    }
    
    if (imageError) {
      errors.push(imageError);
    }
    
    // Step image validation
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.image) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (step.image.size > maxSize) {
          errors.push(`Step ${i + 1} image too large (max 5MB)`);
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(step.image.type)) {
          errors.push(`Step ${i + 1} image must be JPG, PNG, GIF, or WebP`);
        }
      }
    }
    
    // Check against current validation state
    if (validationState === 'invalid' || !formIsValid) {
      const validationMessages = validationErrors.map(error => error.message);
      errors.push(...validationMessages);
    }
    
    const isValid = errors.length === 0;
    
    console.log(isValid ? '✅ Pre-submission validation passed' : '❌ Pre-submission validation failed:', {
      isValid,
      errorCount: errors.length,
      errors: errors.slice(0, 5) // Log first 5 errors
    });
    
    return { isValid, errors };
  };

  // Utility function to validate Waze link format
  const isValidWazeLink = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('waze.com') || url.includes('waze://');
    } catch {
      // Check for waze:// protocol or basic URL pattern
      return url.startsWith('waze://') || /^https?:\/\/.+/.test(url);
    }
  };

  // REMOVED: Duplicate retryLoadGuide function - using the one defined above at line 933

  // GUARANTEED API CALL AND FORM POPULATION FOR EDIT MODE
  useEffect(() => {
    let isMounted = true;
    let apiCallInProgress = false;
    
    const guaranteedEditModeFlow = async () => {
      console.log('🎯 GUARANTEED Edit Mode Flow Started:', {
        id,
        isEditMode,
        apiCallPath: id ? `/guides/${id}` : 'none',
        timestamp: new Date().toISOString()
      });
      
      // **PHASE 1: Handle Create Mode (New Guide)**
      if (!isEditMode || !id || id.trim() === '') {
        console.log('✨ Create mode detected - immediate form initialization');
        setDataLoaded(true);
        setFormInitialized(true);
        setValidationState('idle');
        console.log('✅ Create mode initialization complete');
        return;
      }
      
      // **PHASE 2: Edit Mode - GUARANTEED API Call**
      if (apiCallInProgress) {
        console.log('⏸️ API call already in progress, preventing duplicate');
        return;
      }
      
      if (!isMounted) {
        console.log('🚫 Component unmounted, aborting API call');
        return;
      }
      
      apiCallInProgress = true;
      
      try {
        // **MANDATORY STEP 1: Validate Guide ID Format**
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          throw new Error(`Invalid guide ID format: ${id}. Expected UUID format.`);
        }
        
        console.log('📡 GUARANTEED API CALL: Fetching guide data from /guides/' + id);
        
        // **MANDATORY STEP 2: Reset All Form States Before API Call**
        setIsLoadingGuide(true);
        setLoadError(null);
        setDataLoaded(false);
        setFormInitialized(false);
        
        // **MANDATORY STEP 3: Make API Call and Wait for Response**
        console.log('🔄 Calling eventsService.getEvent with ID:', id);
        const result: GuideLoadResponse = await eventsService.getEvent(id);
        
        // **MANDATORY STEP 4: Validate API Response**
        if (!result) {
          throw new Error('No response received from API /guides/' + id);
        }
        
        if (!result.success || !result.data) {
          const errorMsg = result.error || 'API returned unsuccessful response';
          throw new Error(`API Error: ${errorMsg}`);
        }
        
        const guideData = result.data;
        console.log('✅ API Response received successfully:', {
          guideId: id,
          guideName: guideData.event_name,
          hasSteps: guideData.steps?.length || 0,
          hasCoverImage: !!guideData.cover_image_url
        });
        
        // **MANDATORY STEP 5: Prepare Form Data from API Response**
        const formDataForReset = {
          eventName: String(guideData.event_name || '').trim(),
          location: String(guideData.metadata?.location || '').trim(),
          description: String(guideData.metadata?.description || '').trim(),
          status: (guideData.status === 'draft' || guideData.status === 'published') 
            ? guideData.status as 'draft' | 'published' 
            : 'draft'
        };
        
        // **MANDATORY STEP 6: Validate Prepared Data**
        if (!formDataForReset.eventName) {
          console.warn('⚠️ API returned guide with empty event_name');
          throw new Error('Guide data is incomplete: missing event name');
        }
        
        console.log('📝 Form data prepared for reset:', {
          eventName: formDataForReset.eventName,
          location: formDataForReset.location || '[empty]',
          description: formDataForReset.description || '[empty]',
          status: formDataForReset.status
        });
        
        // **MANDATORY STEP 7: Reset Form with Loaded Data**
        console.log('🔄 Resetting form with loaded data...');
        reset(formDataForReset);
        
        // **MANDATORY STEP 8: Wait for Form Reset to Complete**
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // **MANDATORY STEP 9: Verify Form Was Populated**
        const currentFormValues = watch();
        const formPopulatedCorrectly = (
          currentFormValues.eventName === formDataForReset.eventName &&
          currentFormValues.status === formDataForReset.status
        );
        
        if (!formPopulatedCorrectly) {
          console.error('❌ Form population verification failed:', {
            expected: formDataForReset,
            actual: currentFormValues
          });
          throw new Error('Form failed to populate with loaded data');
        }
        
        console.log('✅ Form population verified successfully');
        
        // **MANDATORY STEP 10: Process Additional Data (Steps, Images, etc.)**
        if (guideData.cover_image_url) {
          setExistingCoverImage(guideData.cover_image_url);
          console.log('🖼️ Cover image loaded:', guideData.cover_image_url);
        }
        
        if (guideData.steps && guideData.steps.length > 0) {
          const processedSteps: StepData[] = guideData.steps.map((step, index) => ({
            id: step.id,
            description: step.description || '',
            actionItems: [], // Populate if available in your data structure
            wazeLink: step.metadata?.wazeLink || '',
            hasNavigation: !!step.metadata?.wazeLink,
            stepNumber: step.step_order || index + 1,
            image: null,
            imagePreview: null,
            existingImageUrl: step.image_url || null,
            hasExistingImage: !!step.image_url
          }));
          
          setSteps(processedSteps);
          console.log('📋 Steps processed:', processedSteps.length);
        }
        
        // **MANDATORY STEP 11: Mark Data as Loaded and Form as Initialized**
        if (isMounted) {
          setDataLoaded(true);
          setFormInitialized(true);
          setValidationState('idle');
          
          console.log('🎉 EDIT MODE FLOW COMPLETED SUCCESSFULLY:', {
            guideId: id,
            formPopulated: true,
            dataLoaded: true,
            formInitialized: true
          });
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during edit mode initialization';
        console.error('❌ EDIT MODE FLOW FAILED:', {
          guideId: id,
          error: errorMessage,
          apiEndpoint: `/guides/${id}`,
          timestamp: new Date().toISOString()
        });
        
        if (isMounted) {
          setLoadError(errorMessage);
          setIsLoadingGuide(false);
          setDataLoaded(false);
          setFormInitialized(false);
        }
      } finally {
        if (isMounted) {
          setIsLoadingGuide(false);
          apiCallInProgress = false;
        }
      }
    };
    
    // **START THE GUARANTEED FLOW**
    guaranteedEditModeFlow();
    
    // **CLEANUP**
    return () => {
      console.log('🧹 Edit mode flow cleanup:', { id, isEditMode });
      isMounted = false;
    };
  }, [id, isEditMode]); // Dependencies: Only re-run when ID or edit mode changes

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;

    // Ensure form is properly initialized and validated
    if (!formInitialized) {
      console.error('❌ Form not initialized, cannot submit');
      toast.error(t('createGuide.loading.formNotReady'));
      return;
    }

    // Show validation on submit attempt
    setShowValidation(true);
    
    // Enhanced pre-submission validation
    const preSubmitValidation = await performPreSubmitValidation(data);
    if (!preSubmitValidation.isValid) {
      console.error('❌ Pre-submission validation failed:', preSubmitValidation.errors);
      toast.error(preSubmitValidation.errors.join('\n'), { 
        duration: 6000,
        style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
      });
      return;
    }

    console.log('✅ Pre-submission validation passed, proceeding with submission');
    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submitData: SubmitData = {
        event_name: data.eventName.trim(),
        description: data.description?.trim() || '', // Fix: use description field properly
        location: data.location?.trim() || '',
        status: data.status,
        expiration_hours: expirationHours,
        coverImage: imageFile,
        hasExistingCoverImage: !!existingCoverImage,
        existingCoverImageUrl: existingCoverImage,
        steps: steps.map(step => ({
          id: step.id,
          description: step.description,
          image: step.image,
          wazeLink: step.wazeLink,
          existingImageUrl: step.existingImageUrl,
          hasExistingImage: step.hasExistingImage
        }))
      };

      console.log('🔄 Prepared submit data:', {
        mode: isEditMode ? 'edit' : 'create',
        eventName: submitData.event_name,
        hasNewCoverImage: !!submitData.coverImage,
        hasExistingCoverImage: submitData.hasExistingCoverImage,
        existingCoverImageUrl: submitData.existingCoverImageUrl,
        stepsCount: submitData.steps.length,
        stepsWithNewImages: submitData.steps.filter(s => !!s.image).length,
        stepsWithExistingImages: submitData.steps.filter(s => s.hasExistingImage).length
      });

      let result: any;
      let successMessage: string;

      if (isEditMode && id) {
        console.log('🔄 Updating existing guide:', id);
        result = await eventsService.updateEventWithSteps(id, submitData);
        successMessage = t('createGuide.form.messages.updateSuccess', 'Guide updated successfully');
      } else {
        console.log('✨ Creating new guide');
        result = await eventsService.createEventWithSteps(submitData);
        successMessage = t('createGuide.form.messages.createSuccess');
        
        // Add steps info for creation
        if (result.stepsCreated !== undefined) {
          if (result.stepsCreated === result.totalSteps) {
            successMessage += ` (${t('createGuide.form.messages.stepsCreated', { count: result.stepsCreated })})`;
          } else {
            successMessage += ` (${t('createGuide.form.messages.stepsCreatedPartial', { created: result.stepsCreated, total: result.totalSteps })})`;
          }
        }
      }

      if (result.success) {
        // Check cover image status and provide appropriate feedback
        let finalMessage = successMessage;
        
        if (result.coverImage && !result.coverImage.success) {
          finalMessage = `${successMessage}\n⚠️ Cover image upload failed: ${result.coverImage.error}`;
          
          console.warn('Cover image upload failed:', result.coverImage.error);
          
          toast(finalMessage, {
            icon: '⚠️',
            duration: 6000,
            style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
          });
        } else {
          toast.success(finalMessage, {
            duration: 4000,
            style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
          });
          
          // Show additional cover image success message if uploaded
          if (result.coverImage && result.coverImage.success) {
            setTimeout(() => {
              toast.success(t('createGuide.imageUpload.uploadSuccess'), {
                duration: 3000,
                style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
              });
            }, 1000);
          }
        }

        // **CRITICAL: POST-SAVE DATA VERIFICATION**
        console.log('🔍 Starting post-save data verification...');
        try {
          // Log the original save payload for comparison
          console.log('📤 SAVE PAYLOAD:', {
            operation: isEditMode ? 'UPDATE' : 'CREATE',
            guideId: result.data?.id,
            eventName: submitData.event_name,
            stepsCount: submitData.steps?.length || 0,
            stepDetails: submitData.steps?.map((step, index) => ({
              index: index + 1,
              hasDescription: !!step.description,
              hasImage: !!(step.image || step.existingImageUrl),
              hasWazeLink: !!step.wazeLink
            })) || [],
            hasCoverImage: !!(submitData.coverImage || submitData.hasExistingCoverImage),
            status: submitData.status,
            timestamp: new Date().toISOString()
          });

          // **VERIFICATION STEP: Load the saved data immediately**
          const guideId = result.data?.id;
          if (!guideId) {
            throw new Error('No guide ID returned from save operation');
          }

          console.log('📡 VERIFICATION: Loading saved guide from /guides/' + guideId);
          const verificationResult = await eventsService.getEvent(guideId);
          
          if (!verificationResult.success || !verificationResult.data) {
            throw new Error('Verification failed: Could not load saved guide');
          }

          const verifiedData = verificationResult.data;
          console.log('📥 VERIFICATION RESPONSE:', {
            guideId: verifiedData.id,
            eventName: verifiedData.event_name,
            stepsCount: verifiedData.steps?.length || 0,
            stepsCountField: verifiedData.steps_count, // Backend-provided count
            stepDetails: verifiedData.steps?.map((step: any, index: number) => ({
              index: index + 1,
              hasDescription: !!step.description,
              hasImage: !!step.image_url,
              hasWazeLink: !!(step.metadata?.wazeLink)
            })) || [],
            hasCoverImage: !!verifiedData.cover_image_url,
            status: verifiedData.status,
            verificationTimestamp: new Date().toISOString()
          });

          // **CRITICAL ASSERTIONS: Verify data consistency**
          const consistencyErrors = [];
          
          // Verify event name
          if (verifiedData.event_name !== submitData.event_name) {
            consistencyErrors.push(`Event name mismatch: saved "${submitData.event_name}" vs loaded "${verifiedData.event_name}"`);
          }
          
          // Verify steps count
          const expectedStepsCount = submitData.steps?.length || 0;
          const actualStepsCount = verifiedData.steps?.length || 0;
          if (actualStepsCount !== expectedStepsCount) {
            consistencyErrors.push(`Steps count mismatch: saved ${expectedStepsCount} vs loaded ${actualStepsCount}`);
          }
          
          // Verify status
          if (verifiedData.status !== submitData.status) {
            consistencyErrors.push(`Status mismatch: saved "${submitData.status}" vs loaded "${verifiedData.status}"`);
          }
          
          // Verify cover image presence
          const expectedCoverImage = !!(submitData.coverImage || submitData.hasExistingCoverImage);
          const actualCoverImage = !!verifiedData.cover_image_url;
          if (actualCoverImage !== expectedCoverImage) {
            consistencyErrors.push(`Cover image mismatch: expected ${expectedCoverImage} vs actual ${actualCoverImage}`);
          }

          // **FAIL IF INCONSISTENCIES DETECTED**
          if (consistencyErrors.length > 0) {
            console.error('🚨 DATA SYNCHRONIZATION FAILED:', consistencyErrors);
            throw new Error(`Data sync verification failed: ${consistencyErrors.join('; ')}`);
          }

          console.log('✅ POST-SAVE VERIFICATION PASSED: All data synchronized correctly');
          
        } catch (verificationError) {
          console.error('❌ Post-save verification failed:', verificationError);
          
          // Show user-friendly error but don't prevent navigation
          toast.error(`Data verification warning: ${verificationError.message}. Please check the guide in dashboard.`, {
            duration: 8000,
            style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
          });
        }

        // Refresh events list (now with verified data)
        try {
          console.log('🔄 Refreshing events list after verification...');
          await refreshEvents();
          console.log('✅ Events list refreshed successfully');
        } catch (refreshError) {
          console.warn('Failed to refresh events list:', refreshError);
        }

        // Navigate back to dashboard
        navigate('/app/dashboard');
      }

    } catch (error) {
      console.error(isEditMode ? 'Update event error:' : 'Create event error:', error);
      
      let errorMessage = isEditMode 
        ? t('createGuide.form.messages.updateError', 'Failed to update guide') 
        : t('createGuide.form.messages.createError');
      
      // Handle specific error types with enhanced error categorization
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      if (errorMsg.includes('Authentication required') || errorMsg.includes('Access token required') || errorMsg.includes('401')) {
        errorMessage = isEditMode 
          ? t('auth.loginError', 'Please log in to update guidance')
          : t('auth.loginError', 'Please log in to create guidance');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else if (errorMsg.includes('already exists') || errorMsg.includes('23505')) {
        errorMessage = t('createGuide.form.messages.nameExists');
      } else if (errorMsg.includes('network') || errorMsg.includes('Network') || errorMsg.includes('ECONNABORTED') || errorMsg.includes('timeout')) {
        errorMessage = t('createGuide.form.messages.networkError');
      } else if (errorMsg.includes('image') || errorMsg.includes('file') || errorMsg.includes('upload') || errorMsg.includes('FILE_TOO_LARGE') || errorMsg.includes('INVALID_FILE_TYPE')) {
        errorMessage = t('createGuide.form.messages.uploadError');
      } else if (errorMsg.includes('validation') || errorMsg.includes('required') || errorMsg.includes('invalid')) {
        errorMessage = t('errors.validationError', 'Validation error: ') + errorMsg;
      } else if (errorMsg.includes('500') || errorMsg.includes('Internal server error')) {
        errorMessage = 'Server error occurred. Please try again in a few moments.';
      }

      toast.error(errorMessage, {
        duration: 5000,
        style: isRTL ? { direction: 'rtl' } : { direction: 'ltr' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/app/dashboard');
  };

  // Show enhanced loading state while loading existing guide
  if (isLoadingGuide) {
    return (
      <div className={languageClasses}>
        <LoadingState 
          message={loadError
            ? `${t('createGuide.loading.loadingFailed')}: ${loadError}`
            : isEditMode
              ? `${t('createGuide.loading.loadingGuide')} ${t('createGuide.loading.pleaseWait')}`
              : `${t('createGuide.loading.loadingGeneral')} ${t('createGuide.loading.pleaseWait')}`} 
          progress={loadingProgress > 0 ? loadingProgress : undefined}
          currentStep={loadingStep || undefined}
          totalSteps={loadingSteps.length > 0 ? loadingSteps.length : undefined}
          completedSteps={completedLoadingSteps}
          showRetry={!!loadError}
          onRetry={() => id && retryLoadGuide()}
        />
      </div>
    );
  }

  // Show error state with retry option
  if (loadError && isEditMode) {
    return (
      <div className={languageClasses}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <Icon name="warning" size="lg" className="text-red-500 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('errors.loadGuideFailed', 'Failed to Load Guide')}
            </h2>
            <p className="text-gray-600 mb-6">
              {loadError}
            </p>
            <div className="space-y-3">
              <Button 
                onClick={retryLoadGuide}
                className="w-full"
                icon={<Icon name="refresh" size="sm" />}
              >
                {t('common.retry', 'Retry')}
              </Button>
              <Button 
                onClick={() => navigate('/app/dashboard')}
                variant="secondary"
                className="w-full"
              >
                {t('common.back', 'Back to Dashboard')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if in edit mode but data hasn't loaded properly
  if (isEditMode && !isLoadingGuide && !loadError && !dataLoaded) {
    return (
      <div className={languageClasses}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <Icon name="info" size="lg" className="text-blue-500 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Waiting for Data...
            </h2>
            <p className="text-gray-600 mb-6">
              The guide data is still loading. If this persists, there may be a connection issue.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={retryLoadGuide}
                className="w-full"
                icon={<Icon name="refresh" size="sm" />}
              >
                {t('common.retry', 'Retry')}
              </Button>
              <Button 
                onClick={() => navigate('/app/dashboard')}
                variant="secondary"
                className="w-full"
              >
                {t('common.back', 'Back to Dashboard')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Additional fallback: If in edit mode but form values are empty after data should have loaded
  if (isEditMode && !isLoadingGuide && !loadError && dataLoaded) {
    const currentValues = watch();
    const hasFormData = currentValues.eventName || currentValues.description || currentValues.location;
    
    if (!hasFormData && !existingCoverImage && steps.length === 0) {
      console.warn('⚠️ Edit mode but no data in form after dataLoaded=true', {
        dataLoaded,
        hasFormData,
        existingCoverImage: !!existingCoverImage,
        stepsCount: steps.length,
        formValues: currentValues,
        guideId: id
      });
      
      return (
        <div className={languageClasses}>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="mb-4">
                <Icon name="warning" size="lg" className="text-orange-500 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('editGuide.noDataFound', 'No Guide Data Found')}
              </h2>
              <p className="text-gray-600 mb-4">
                {t('editGuide.emptyGuideData', 'This guide appears to be empty or the data could not be loaded properly.')}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>Debug Info:</strong><br />
                  • Data marked as loaded: {dataLoaded ? 'Yes' : 'No'}<br />
                  • Form has data: {hasFormData ? 'Yes' : 'No'}<br />
                  • Has cover image: {existingCoverImage ? 'Yes' : 'No'}<br />
                  • Steps count: {steps.length}<br />
                  • Guide ID: {id}
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    console.log('🔄 Force reload from empty data fallback');
                    setDataLoaded(false);
                    setLoadError(null);
                    retryLoadGuide();
                  }}
                  className="w-full"
                  icon={<Icon name="refresh" size="sm" />}
                >
                  {t('common.reload', 'Reload Guide')}
                </Button>
                <Button 
                  onClick={() => navigate('/app/dashboard')}
                  variant="secondary"
                  className="w-full"
                  icon={<Icon name="arrow-left" size="sm" />}
                >
                  {t('common.back', 'Back to Dashboard')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`space-y-8 ${languageClasses}`}>
      {/* Enhanced Page Header */}
      <PageHeader
        title={isEditMode ? t('createGuide.editTitle', 'Edit Guide') : t('createGuide.title')}
        subtitle={isEditMode ? t('createGuide.editSubtitle', 'Update your existing guide') : t('createGuide.subtitle')}
        icon={isEditMode ? 'edit' : 'create-guide'}
        isEditMode={isEditMode}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 lg:space-y-0">
        {/* Enhanced Responsive Multi-Column Layout */}
        <div className="xl:grid xl:grid-cols-3 xl:gap-12 xl:items-start">
          {/* Main Form Content */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            
            {/* Enhanced Form Validation Summary */}
            {showValidation && (validationErrors.length > 0 || warnings.length > 0) && (
              <div className="bg-white rounded-xl shadow-desktop p-6 border border-gray-100 animate-fade-in-down">
                <FormValidation
                  errors={validationErrors}
                  warnings={warnings}
                />
              </div>
            )}

            {/* Enhanced Basic Information */}
            <div className="animate-fade-in animate-stagger-1">
              <FormCard
                title={t('createGuide.basicInfo.title')}
                subtitle={t('createGuide.basicInfo.subtitle')}
                collapsible={false}
              >
              <div className="space-y-6">
                {/* Event Name - Required */}
                <FormField
                  label={t('createGuide.basicInfo.eventName')}
                  error={errors.eventName?.message}
                  required={true}
                >
                  <Input
                    {...register('eventName', {
                      required: t('createGuide.form.validation.eventNameRequired'),
                      maxLength: {
                        value: 100,
                        message: t('createGuide.form.validation.eventNameTooLong')
                      },
                      validate: value => value.trim().length > 0 || t('createGuide.form.validation.eventNameRequired'),
                      onBlur: () => handleCriticalFieldBlur('eventName') // On-blur validation for critical field
                    })}
                    placeholder={t('createGuide.basicInfo.eventNamePlaceholder')}
                    disabled={isSubmitting}
                    state={errors.eventName ? 'error' : 'default'}
                    value={formData.eventName || ''}
                    maxLength={100}
                    showCharCount={true}
                    size="md"
                    floatingLabel={false}
                  />
                </FormField>

                {/* Location - Optional */}
                <FormField
                  label={t('createGuide.basicInfo.location')}
                  error={errors.location?.message}
                  warning={showValidation ? warnings.location : undefined}
                >
                  <Input
                    {...register('location', {
                      maxLength: {
                        value: 200,
                        message: t('createGuide.form.validation.locationTooLong')
                      }
                    })}
                    placeholder={t('createGuide.basicInfo.locationPlaceholder')}
                    disabled={isSubmitting}
                    state={errors.location ? 'error' : 'default'}
                    value={formData.location || ''}
                    maxLength={200}
                    showCharCount={true}
                    size="md"
                    floatingLabel={false}
                  />
                </FormField>

                <div className="md:grid md:grid-cols-2 lg:gap-6 space-y-4 md:space-y-0 md:gap-4">
                  {/* Enhanced Status Selection */}
                  <FormField
                    label={t('createGuide.basicInfo.status')}
                    error={errors.status?.message}
                  >
                    <Controller
                      name="status"
                      control={control}
                      defaultValue="draft"
                      rules={{
                        required: t('createGuide.form.validation.statusRequired', 'Status is required')
                      }}
                      render={({ field }) => (
                        <RadioGroup
                          name={field.name}
                          value={field.value}
                          onChange={(value) => {
                            console.log('🔄 Status changing from', field.value, 'to', value);
                            field.onChange(value);
                          }}
                          options={[
                            {
                              value: 'draft',
                              label: t('createGuide.status.draft'),
                              description: t('createGuide.status.draftDescription')
                            },
                            {
                              value: 'published',
                              label: t('createGuide.status.published'),
                              description: t('createGuide.status.publishedDescription')
                            }
                          ]}
                          size="md"
                          disabled={isSubmitting}
                          error={errors.status?.message}
                        />
                      )}
                    />
                  </FormField>

                  {/* Enhanced Cover Image */}
                  <FormField
                    label={t('createGuide.basicInfo.coverImage')}
                    warning={showValidation ? warnings.coverImage : undefined}
                    error={imageError}
                  >
                    <ImageUpload
                      onImageSelect={handleImageSelect}
                      onImageRemove={handleImageRemove}
                      value={imageFile || existingCoverImage}
                      error={imageError}
                      disabled={isSubmitting}
                    />
                  </FormField>
                </div>
              </div>
              </FormCard>
            </div>

            {/* Enhanced Expiration Settings */}
            <div className="bg-white rounded-xl shadow-desktop border border-gray-100 overflow-hidden animate-fade-in animate-stagger-2">
              <ExpirationSettings
                value={expirationHours}
                onChange={setExpirationHours}
                disabled={isSubmitting}
                className="p-6"
                showPreview={true}
              />
            </div>

            {/* Enhanced Guidance Steps */}
            <div className="animate-fade-in animate-stagger-3">
              <FormCard
                title={t('createGuide.steps.title')}
                subtitle={t('createGuide.steps.subtitle')}
                collapsible={true}
                defaultExpanded={true}
              >
                <StepEditor 
                  steps={steps}
                  onStepsChange={setSteps}
                  validationErrors={validationErrors}
                  validationWarnings={warnings}
                  showValidation={showValidation}
                />
              </FormCard>
            </div>

            {/* Enhanced Form Actions */}
            <div className="animate-fade-in animate-stagger-4">
              <FormActions
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                isFormValid={formIsValid}
                hasImageError={!!imageError}
                isLoadingGuide={isLoadingGuide}
                isEditMode={isEditMode}
                submitText={isEditMode 
                  ? t('createGuide.form.updateEvent', 'Update Guide') 
                  : t('createGuide.form.createEvent')}
                cancelText={t('common.cancel')}
                formInitialized={formInitialized}
                validationState={validationState}
              />
            </div>
          </div>

          {/* Enhanced Right Column - Preview (Desktop Only) */}
          <div className="hidden xl:block xl:col-span-1 xl:sticky xl:top-8 animate-fade-in animate-stagger-2">
            <div className="bg-white rounded-xl shadow-desktop border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-elevation-3">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:bg-primary-200">
                    <Icon name="view" size="xs" className="text-primary-600 transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {t('createGuide.preview.title', 'Live Preview')}
                  </h3>
                </div>
              </div>
              <FormPreview
                formData={formData}
                steps={steps}
                coverImage={imageFile}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

// Multi-Level Error Boundary Wrapper with comprehensive protection
const CreateGuideWithErrorBoundary: React.FC = () => {
  // Global error handler for comprehensive error reporting
  const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('🚨 Global CreateGuide Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Optional: Send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Sentry, LogRocket, or custom error reporting
        // errorReportingService.captureException(error, { extra: errorInfo });
        console.log('📡 Error would be sent to monitoring service in production');
      } catch (reportError) {
        console.error('❌ Failed to report error to monitoring service:', reportError);
      }
    }
  };

  return (
    <FormErrorBoundary 
      level="page" 
      onError={handleGlobalError}
    >
      <DataErrorBoundary level="data">
        <ComponentErrorBoundary level="component">
          <CreateGuide />
        </ComponentErrorBoundary>
      </DataErrorBoundary>
    </FormErrorBoundary>
  );
};

export default CreateGuideWithErrorBoundary;

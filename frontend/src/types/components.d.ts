/**
 * Component-specific TypeScript declarations
 * Interface definitions for component props and handlers
 */

// ConfirmDialog component interfaces
export interface ConfirmDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  className?: string;
}

// FeedbackModal component interfaces
export interface FeedbackModalProps {
  onClose?: () => void;
  onSubmit?: (data: FeedbackData) => void;
  isOpen?: boolean;
  className?: string;
}

export interface FeedbackType {
  type: 'bug' | 'feature' | 'general';
  value: string;
  icon: string;
  label: string;
  colorClass: string;
}

// ImageUpload component interfaces (already declared in ImageUpload.tsx)
export interface ImageUploadProps {
  onImageSelect?: (file: File | null, error: string | null) => void;
  onImageRemove?: () => void;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  value?: File | string | null;
  maxSize?: number;
  allowedTypes?: string[];
  showProgress?: boolean;
  progress?: number;
  multiple?: boolean;
  accept?: string;
  variant?: 'default' | 'compact' | 'enhanced';
  ariaLabel?: string;
}

// Dashboard component interfaces
export interface DashboardStatsProps {
  stats?: any[];
  isLoading?: boolean;
}

export interface StatCardProps {
  icon: string;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export interface FeedbackSectionProps {
  recentFeedback?: any[];
  feedbackStats?: any;
  isRTL?: boolean;
  t?: (key: string) => string;
}

export interface QuickActionProps {
  icon: string;
  title: string;
  description: string;
  actionText: string;
  actionLink: string;
}

export interface WelcomeSectionProps {
  userName?: string;
  description?: string;
}

// DataTable component interfaces
export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  sortable?: boolean;
  selectable?: boolean;
  onRowSelect?: (selectedRows: any[]) => void;
  pagination?: boolean;
  pageSize?: number;
}

// Skeleton component interfaces (already declared in Skeleton.tsx)
export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  lines?: number;
  animate?: boolean;
  speed?: 'slow' | 'normal' | 'fast';
  respectMotion?: boolean;
  className?: string;
}

// CreateGuide page interfaces
export interface CreateGuideFormData {
  eventName: string;
  location?: string;
  description?: string;
  expirationDate?: string;
  steps: GuideStep[];
  coverImage?: File | null;
  status: 'draft' | 'published';
}

export interface GuideStep {
  id?: string;
  description: string;
  image?: File | null;
  wazeLink: string;
  existingImageUrl?: string | null;
  hasExistingImage: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  hasHighSeverityIssues?: boolean;
  summary?: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Modal and overlay interfaces
export interface OverlayProps {
  isVisible?: boolean;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export interface ModalHeaderProps {
  title?: string;
  onClose?: () => void;
  className?: string;
}

export interface ModalFooterProps {
  children?: React.ReactNode;
  className?: string;
}

// Form field interfaces
export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string | number;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  id?: string;
  name?: string;
  className?: string;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
}

export interface TextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  id?: string;
  name?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  minLength?: number;
}

export interface SelectProps {
  value?: string | number;
  onChange?: (value: string | number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  id?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
}

// Loading and error state interfaces
export interface LoadingStateProps {
  isLoading?: boolean;
  loadingText?: string;
  error?: string | null;
  retry?: () => void;
  className?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetError?: () => void;
}

// Navigation and routing interfaces
export interface NavigationItem {
  key: string;
  label: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: string;
  className?: string;
}

// Toast and notification interfaces
export interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

// Search and filter interfaces
export interface SearchProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  debounceMs?: number;
}

export interface FilterProps {
  filters: Record<string, any>;
  onChange?: (filters: Record<string, any>) => void;
  onClear?: () => void;
  className?: string;
}

// Card and layout interfaces
export interface CardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
}

export interface SectionProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
}

// Progress and status interfaces
export interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'error';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
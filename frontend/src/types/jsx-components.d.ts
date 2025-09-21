/**
 * JSX Component declarations for .jsx files without TypeScript
 * Master declaration file to resolve TS7016 "Could not find a declaration file" errors
 */

// Admin components

declare module '../../components/admin/AdminFeedbackAnalytics/AdminFeedbackAnalytics' {
  interface AdminFeedbackAnalyticsProps {
    feedbackData?: any[];
    isLoading?: boolean;
    dateRange?: { start: string; end: string };
    className?: string;
  }
  const AdminFeedbackAnalytics: React.FC<AdminFeedbackAnalyticsProps>;
  export default AdminFeedbackAnalytics;
}

declare module '../../components/admin/AdminUsageChart/AdminUsageChart' {
  interface AdminUsageChartProps {
    data?: any[];
    isLoading?: boolean;
    timeframe?: 'day' | 'week' | 'month' | 'year';
    className?: string;
  }
  const AdminUsageChart: React.FC<AdminUsageChartProps>;
  export default AdminUsageChart;
}

declare module '../../components/admin/AdminExportSection/AdminExportSection' {
  interface AdminExportSectionProps {
    data?: any;
    isLoading?: boolean;
    onExport?: (format: 'csv' | 'json' | 'pdf') => void;
    className?: string;
  }
  const AdminExportSection: React.FC<AdminExportSectionProps>;
  export default AdminExportSection;
}

// Desktop components
declare module '../../components/desktop/StepEditor/StepEditor' {
  interface StepEditorProps {
    steps?: any[];
    onStepsChange?: (steps: any[]) => void;
    onStepAdd?: () => void;
    onStepRemove?: (index: number) => void;
    onStepUpdate?: (index: number, step: any) => void;
    disabled?: boolean;
    className?: string;
  }
  const StepEditor: React.FC<StepEditorProps>;
  export default StepEditor;
}

declare module '../../components/desktop/FormPreview/FormPreview' {
  interface FormPreviewProps {
    formData?: any;
    steps?: any[];
    isVisible?: boolean;
    onClose?: () => void;
    className?: string;
  }
  const FormPreview: React.FC<FormPreviewProps>;
  export default FormPreview;
}

// Hook declarations for JS files
declare module '../../hooks/useAdminAnalytics' {
  interface UseAdminAnalyticsReturn {
    data: any;
    isLoading: boolean;
    error?: string;
    refetch: () => void;
  }
  export function useAdminAnalytics(): UseAdminAnalyticsReturn;
}

declare module '../../hooks/useLanguageDirection' {
  interface UseLanguageDirectionReturn {
    isRTL: boolean;
    direction: 'ltr' | 'rtl';
    conditionalClass: {
      textAlign: string;
      ml: (value: string) => string;
      mr: (value: string) => string;
      pl: (value: string) => string;
      pr: (value: string) => string;
    };
    languageClasses: string;
  }
  export function useLanguageDirection(): UseLanguageDirectionReturn;
}

// Additional JSX components that might be missing
declare module '../../components/common/Modal/Modal' {
  interface ModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    title?: string;
    children?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
    className?: string;
  }
  export const Modal: React.FC<ModalProps>;
  export default Modal;
}

declare module '../../components/common/Loading/Loading' {
  interface LoadingProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'spinner' | 'dots' | 'pulse';
    text?: string;
    className?: string;
  }
  export const Loading: React.FC<LoadingProps>;
  export default Loading;
}

declare module '../../components/common/Error/Error' {
  interface ErrorProps {
    message?: string;
    retry?: () => void;
    className?: string;
  }
  export const Error: React.FC<ErrorProps>;
  export default Error;
}

// Utility and service declarations
declare module '../../utils/constants' {
  export const API_BASE_URL: string;
  export const APP_NAME: string;
  export const DEFAULT_LANGUAGE: string;
  export const SUPPORTED_LANGUAGES: string[];
}

declare module '../../utils/helpers' {
  export function formatDate(date: string | Date): string;
  export function formatNumber(num: number): string;
  export function truncateText(text: string, length: number): string;
  export function capitalizeFirst(text: string): string;
}

declare module '../../services/adminService' {
  interface AdminServiceType {
    getAnalytics: () => Promise<any>;
    getUsers: () => Promise<any>;
    deleteUser: (id: string) => Promise<any>;
    exportData: (format: string) => Promise<any>;
  }
  export const adminService: AdminServiceType;
}

// App.tsx import fix
declare module './App.js' {
  const App: React.FC;
  export default App;
}

declare module './App' {
  const App: React.FC;
  export default App;
}
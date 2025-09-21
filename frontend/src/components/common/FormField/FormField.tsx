import React from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../Icon';

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Helper text shown below the field */
  helperText?: string;
  /** Error message (overrides helperText when present) */
  error?: string;
  /** Success message (overrides helperText when present) */
  success?: string;
  /** Warning message (overrides helperText when present) */
  warning?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether to display messages in a compact format */
  compact?: boolean;
  /** Custom icon to display with the message */
  messageIcon?: React.ReactNode;
  /** Additional class names for the container */
  className?: string;
  /** Additional class names for the label */
  labelClassName?: string;
  /** Additional class names for the message area */
  messageClassName?: string;
  /** The form field content (input, textarea, select, etc.) */
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  helperText,
  error,
  success,
  warning,
  required = false,
  compact = false,
  messageIcon,
  className = '',
  labelClassName = '',
  messageClassName = '',
  children
}) => {
  const { conditionalClass } = useLanguageDirection();
  
  // Determine the current state and message
  const currentState = error ? 'error' : warning ? 'warning' : success ? 'success' : 'default';
  const message = error || warning || success || helperText;
  
  // Get the appropriate icon for the state
  const getStateIcon = () => {
    if (messageIcon) return messageIcon;
    
    switch (currentState) {
      case 'error':
        return <Icon name="error" size="sm" />;
      case 'warning':
        return <Icon name="warning" size="sm" />;
      case 'success':
        return <Icon name="success" size="sm" />;
      default:
        return null;
    }
  };

  // Message styling based on state
  const messageClasses = `
    ${compact ? 'mt-1 text-xs' : 'mt-2 text-sm'} 
    flex items-start gap-2 transition-all duration-200
    ${currentState === 'error' ? 'text-red-600' : ''}
    ${currentState === 'warning' ? 'text-warning-600' : ''}
    ${currentState === 'success' ? 'text-success-600' : ''}
    ${currentState === 'default' ? 'text-gray-600' : ''}
    ${conditionalClass.textLeft}
    ${messageClassName}
  `;

  // Label styling based on state
  const labelClasses = `
    block text-sm font-medium mb-2 transition-colors duration-200
    ${conditionalClass.textLeft}
    ${currentState === 'error' ? 'text-red-700' : 'text-gray-700'}
    ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
    ${labelClassName}
  `;

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className={labelClasses}>
          {label}
        </label>
      )}

      {/* Form field content */}
      <div className="relative">
        {children}
      </div>

      {/* Message */}
      {message && (
        <div className={messageClasses}>
          {getStateIcon()}
          <span className="flex-1 leading-relaxed">
            {message}
          </span>
        </div>
      )}
    </div>
  );
};

// Field Group component for organizing multiple related fields
export interface FormFieldGroupProps {
  /** Group title */
  title?: string;
  /** Group description */
  description?: string;
  /** Whether to display the group in a card-like container */
  variant?: 'default' | 'card' | 'section';
  /** Additional class names */
  className?: string;
  /** Additional class names for the title */
  titleClassName?: string;
  /** Additional class names for the content area */
  contentClassName?: string;
  /** The form fields to group together */
  children: React.ReactNode;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  title,
  description,
  variant = 'default',
  className = '',
  titleClassName = '',
  contentClassName = '',
  children
}) => {
  const { conditionalClass } = useLanguageDirection();

  // Variant styling
  const variantClasses = {
    default: '',
    card: 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm',
    section: 'bg-gray-50 border border-gray-200 rounded-lg p-4'
  };

  const titleSizeClasses = {
    default: 'text-lg font-semibold',
    card: 'text-xl font-semibold',
    section: 'text-base font-medium'
  };

  return (
    <div className={`w-full ${variantClasses[variant]} ${className}`}>
      {/* Group header */}
      {(title || description) && (
        <div className={`mb-6 ${variant !== 'default' ? 'pb-4 border-b border-gray-200' : ''}`}>
          {title && (
            <h3 className={`
              ${titleSizeClasses[variant]} text-gray-900 mb-1
              ${conditionalClass.textLeft}
              ${titleClassName}
            `}>
              {title}
            </h3>
          )}
          {description && (
            <p className={`text-sm text-gray-600 ${conditionalClass.textLeft}`}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* Form fields */}
      <div className={`space-y-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

// Inline field layout for side-by-side fields
export interface FormFieldInlineProps {
  /** Gap between fields */
  gap?: 'sm' | 'md' | 'lg';
  /** Responsive breakpoint for stacking */
  stackAt?: 'sm' | 'md' | 'lg' | 'never';
  /** Additional class names */
  className?: string;
  /** Form fields to display inline */
  children: React.ReactNode;
}

export const FormFieldInline: React.FC<FormFieldInlineProps> = ({
  gap = 'md',
  stackAt = 'md',
  className = '',
  children
}) => {
  // Gap classes
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  // Responsive classes for stacking
  const responsiveClasses = {
    sm: 'flex flex-col sm:flex-row',
    md: 'flex flex-col md:flex-row',
    lg: 'flex flex-col lg:flex-row',
    never: 'flex flex-row'
  };

  return (
    <div className={`
      w-full ${responsiveClasses[stackAt]} ${gapClasses[gap]} items-start
      ${className}
    `}>
      {children}
    </div>
  );
};

export default FormField;
import React, { useState, forwardRef, useId } from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../Icon';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Description text shown below label */
  description?: string;
  /** Size of the checkbox */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'card';
  /** Validation state */
  state?: 'default' | 'success' | 'warning' | 'error';
  /** Whether checkbox is in indeterminate state */
  indeterminate?: boolean;
  /** Error message */
  error?: string;
  /** Icon to show when checked (overrides default checkmark) */
  checkedIcon?: React.ReactNode;
  /** Icon to show when indeterminate (overrides default minus) */
  indeterminateIcon?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Additional class names for container */
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  size = 'md',
  variant = 'default',
  state = 'default',
  indeterminate = false,
  error,
  checkedIcon,
  indeterminateIcon,
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  checked = false,
  ...props
}, ref) => {
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isFocused, setIsFocused] = useState(false);
  const checkboxId = useId();
  
  // Determine current state
  const currentState = error ? 'error' : state;

  // Size classes
  const sizeClasses = {
    sm: {
      checkbox: 'w-4 h-4',
      label: 'text-sm',
      description: 'text-xs',
      icon: 'w-3 h-3'
    },
    md: {
      checkbox: 'w-5 h-5',
      label: 'text-base',
      description: 'text-sm',
      icon: 'w-4 h-4'
    },
    lg: {
      checkbox: 'w-6 h-6',
      label: 'text-lg',
      description: 'text-base',
      icon: 'w-5 h-5'
    }
  };

  // Checkbox classes based on state
  const checkboxClasses = `
    ${sizeClasses[size].checkbox}
    border-2 rounded-md transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
    ${currentState === 'error' 
      ? 'border-red-500 focus:ring-red-500' 
      : currentState === 'warning'
      ? 'border-warning-500 focus:ring-warning-500'
      : currentState === 'success'
      ? 'border-success-500 focus:ring-success-500'
      : 'border-gray-300 focus:ring-primary-500'
    }
    ${checked || indeterminate
      ? currentState === 'error'
        ? 'bg-red-500 border-red-500'
        : currentState === 'warning'
        ? 'bg-warning-500 border-warning-500'
        : currentState === 'success'
        ? 'bg-success-500 border-success-500'
        : 'bg-primary-600 border-primary-600'
      : 'bg-white hover:bg-gray-50'
    }
    ${isFocused ? 'ring-2 ring-offset-2 ring-primary-500/20' : ''}
  `;

  // Card variant classes
  const cardClasses = variant === 'card' ? `
    p-4 border-2 rounded-xl transition-all duration-200
    ${checked 
      ? currentState === 'error'
        ? 'border-red-500 bg-red-50'
        : currentState === 'warning'
        ? 'border-warning-500 bg-warning-50'
        : currentState === 'success'
        ? 'border-success-500 bg-success-50'
        : 'border-primary-600 bg-primary-50'
      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  ` : '';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleClick = () => {
    if (!disabled && props.onChange) {
      const syntheticEvent = {
        target: {
          checked: !checked
        }
      } as React.ChangeEvent<HTMLInputElement>;
      props.onChange(syntheticEvent);
    }
  };

  const renderIcon = () => {
    if (indeterminate) {
      return indeterminateIcon || <Icon name="minus" size="xs" className="text-white" />;
    } else if (checked) {
      return checkedIcon || <Icon name="success" size="xs" className="text-white" />;
    }
    return null;
  };

  const CheckboxContent = () => (
    <>
      {/* Hidden native checkbox */}
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="sr-only"
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />

      {/* Custom checkbox display */}
      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Checkbox box */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={checkboxClasses}>
            <div className={`flex items-center justify-center ${sizeClasses[size].icon}`}>
              {renderIcon()}
            </div>
          </div>
        </div>

        {/* Label and description */}
        {(label || description) && (
          <div className={`flex-1 ${conditionalClass.textLeft}`}>
            {label && (
              <label 
                htmlFor={checkboxId}
                className={`
                  block font-medium cursor-pointer transition-colors duration-200
                  ${sizeClasses[size].label}
                  ${currentState === 'error' ? 'text-red-700' : 'text-gray-900'}
                  ${disabled ? 'cursor-not-allowed' : ''}
                  ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
                `}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={`
                mt-1 text-gray-600 transition-colors duration-200
                ${sizeClasses[size].description}
                ${currentState === 'error' ? 'text-red-600' : ''}
              `}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`w-full ${containerClassName}`}>
      {variant === 'card' ? (
        <div className={cardClasses} onClick={handleClick}>
          <CheckboxContent />
        </div>
      ) : (
        <div className={`flex ${className}`} onClick={handleClick}>
          <CheckboxContent />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
          <Icon name="error" size="sm" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// Checkbox Group Component
export interface CheckboxGroupProps {
  /** Group label */
  label?: string;
  /** Group description */
  description?: string;
  /** Array of checkbox options */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  /** Selected values */
  value?: string[];
  /** Change handler */
  onChange?: (values: string[]) => void;
  /** Size for all checkboxes */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'card';
  /** Validation state */
  state?: 'default' | 'success' | 'warning' | 'error';
  /** Error message */
  error?: string;
  /** Required field */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  description,
  options = [],
  value = [],
  onChange,
  size = 'md',
  variant = 'default',
  state = 'default',
  error,
  required = false,
  disabled = false,
  className = ''
}) => {
  const { conditionalClass } = useLanguageDirection();
  const currentState = error ? 'error' : state;

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    if (!onChange) return;

    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Group label */}
      {label && (
        <div className="mb-4">
          <h3 className={`
            text-base font-medium mb-1
            ${conditionalClass.textLeft}
            ${currentState === 'error' ? 'text-red-700' : 'text-gray-900'}
            ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
          `}>
            {label}
          </h3>
          {description && (
            <p className={`text-sm text-gray-600 ${conditionalClass.textLeft}`}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* Checkboxes */}
      <div className={`space-y-${variant === 'card' ? '3' : '2'}`}>
        {options.map((option, _index) => (
          <Checkbox
            key={option.value}
            label={option.label}
            description={option.description}
            size={size}
            variant={variant}
            state={currentState}
            disabled={disabled || option.disabled}
            checked={value.includes(option.value)}
            onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <Icon name="error" size="sm" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Checkbox;
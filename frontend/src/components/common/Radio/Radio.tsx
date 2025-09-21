import React, { useState, forwardRef, useId } from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../Icon';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string;
  /** Description text shown below label */
  description?: string;
  /** Size of the radio */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'card';
  /** Validation state */
  state?: 'default' | 'success' | 'warning' | 'error';
  /** Error message */
  error?: string;
  /** Additional class names */
  className?: string;
  /** Additional class names for container */
  containerClassName?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  description,
  size = 'md',
  variant = 'default',
  state = 'default',
  error,
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  checked = false,
  ...props
}, ref) => {
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isFocused, setIsFocused] = useState(false);
  const radioId = useId();
  
  // Determine current state
  const currentState = error ? 'error' : state;

  // Size classes
  const sizeClasses = {
    sm: {
      radio: 'w-4 h-4',
      label: 'text-sm',
      description: 'text-xs',
      dot: 'w-2 h-2'
    },
    md: {
      radio: 'w-5 h-5',
      label: 'text-base',
      description: 'text-sm',
      dot: 'w-2.5 h-2.5'
    },
    lg: {
      radio: 'w-6 h-6',
      label: 'text-lg',
      description: 'text-base',
      dot: 'w-3 h-3'
    }
  };

  // Radio classes based on state
  const radioClasses = `
    ${sizeClasses[size].radio}
    border-2 rounded-full transition-all duration-200 ease-out
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
    ${checked
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
      // Create a proper synthetic event that matches the native radio behavior
      const syntheticEvent = {
        target: {
          type: 'radio',
          name: props.name,
          value: props.value,
          checked: true
        },
        currentTarget: {
          type: 'radio',
          name: props.name,
          value: props.value,
          checked: true
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      console.log('🔘 Radio handleClick:', {
        value: props.value,
        name: props.name,
        checked: true
      });
      
      props.onChange(syntheticEvent);
    }
  };

  const renderDot = () => {
    if (checked) {
      return (
        <div className={`${sizeClasses[size].dot} bg-white rounded-full transition-all duration-200`} />
      );
    }
    return null;
  };

  const RadioContent = () => (
    <>
      {/* Hidden native radio */}
      <input
        ref={ref}
        id={radioId}
        type="radio"
        checked={checked}
        disabled={disabled}
        className="sr-only"
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />

      {/* Custom radio display */}
      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Radio button */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={radioClasses}>
            <div className={`flex items-center justify-center ${sizeClasses[size].radio}`}>
              {renderDot()}
            </div>
          </div>
        </div>

        {/* Label and description */}
        {(label || description) && (
          <div className={`flex-1 ${conditionalClass.textLeft}`}>
            {label && (
              <label 
                htmlFor={radioId}
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
          <RadioContent />
        </div>
      ) : (
        <div className={`flex ${className}`} onClick={handleClick}>
          <RadioContent />
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

Radio.displayName = 'Radio';

// Radio Group Component
export interface RadioGroupProps {
  /** Group label */
  label?: string;
  /** Group description */
  description?: string;
  /** Radio name attribute (shared across all radios) */
  name: string;
  /** Array of radio options */
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  /** Selected value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Size for all radios */
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

export const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  description,
  name,
  options = [],
  value,
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

  const handleRadioChange = (optionValue: string) => {
    if (!onChange) {
      console.warn('🚨 RadioGroup: onChange handler not provided');
      return;
    }
    
    console.log('📻 RadioGroup handleRadioChange:', {
      groupName: name,
      currentValue: value,
      newValue: optionValue,
      hasOnChange: !!onChange
    });
    
    onChange(optionValue);
  };

  return (
    <div className={`w-full ${className}`} role="radiogroup" aria-labelledby={label ? `${name}-label` : undefined}>
      {/* Group label */}
      {label && (
        <div className="mb-4">
          <h3 
            id={`${name}-label`}
            className={`
              text-base font-medium mb-1
              ${conditionalClass.textLeft}
              ${currentState === 'error' ? 'text-red-700' : 'text-gray-900'}
              ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
            `}
          >
            {label}
          </h3>
          {description && (
            <p className={`text-sm text-gray-600 ${conditionalClass.textLeft}`}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* Radio buttons */}
      <div className={`space-y-${variant === 'card' ? '3' : '2'}`}>
        {options.map((option, _index) => (
          <Radio
            key={option.value}
            name={name}
            label={option.label}
            description={option.description}
            size={size}
            variant={variant}
            state={currentState}
            disabled={disabled || option.disabled}
            checked={value === option.value}
            value={option.value}
            onChange={() => handleRadioChange(option.value)}
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

export default Radio;
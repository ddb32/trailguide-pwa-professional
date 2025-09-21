import React, { useState, useRef, useEffect, forwardRef, useId, useCallback } from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../Icon';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Visual variant of the textarea */
  variant?: 'outlined' | 'filled' | 'ghost';
  /** Size of the textarea */
  size?: 'sm' | 'md' | 'lg';
  /** Validation state */
  state?: 'default' | 'success' | 'warning' | 'error';
  /** Label text */
  label?: string;
  /** Helper text shown below textarea */
  helperText?: string;
  /** Error message (overrides helperText when present) */
  error?: string;
  /** Success message (overrides helperText when present) */
  success?: string;
  /** Warning message (overrides helperText when present) */
  warning?: string;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Whether label should float */
  floatingLabel?: boolean;
  /** Whether to auto-resize based on content */
  autoResize?: boolean;
  /** Minimum number of rows when auto-resizing */
  minRows?: number;
  /** Maximum number of rows when auto-resizing */
  maxRows?: number;
  /** Additional class names */
  className?: string;
  /** Additional class names for textarea container */
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  variant = 'outlined',
  size = 'md',
  state = 'default',
  label,
  helperText,
  error,
  success,
  warning,
  showCharCount = false,
  maxLength,
  floatingLabel = true,
  autoResize = true,
  minRows = 3,
  maxRows = 10,
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  value = '',
  rows = 3,
  ...props
}, ref) => {
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(Boolean(value));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();
  
  // Determine current state based on props
  const currentState = error ? 'error' : warning ? 'warning' : success ? 'success' : state;
  
  // Determine message to show
  const message = error || warning || success || helperText;
  
  // Character count
  const charCount = typeof value === 'string' ? value.length : 0;
  const showCount = showCharCount && maxLength;
  
  // Label should be floated if there's a value, focus, or not floating labels
  const shouldFloatLabel = !floatingLabel || hasValue || isFocused || Boolean(props.placeholder);

  // Auto-resize functionality
  const adjustHeight = () => {
    if (!autoResize || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the number of lines
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    
    // Set the height based on scrollHeight, respecting min/max
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  // Effect to handle auto-resize when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, autoResize, minRows, maxRows]);

  // Base classes for different variants
  const variantClasses = {
    outlined: `
      border-2 bg-white
      ${currentState === 'error' ? 'border-red-500 focus:border-red-600' : ''}
      ${currentState === 'warning' ? 'border-warning-500 focus:border-warning-600' : ''}
      ${currentState === 'success' ? 'border-success-500 focus:border-success-600' : ''}
      ${currentState === 'default' ? 'border-gray-300 focus:border-primary-600' : ''}
      ${disabled ? 'border-gray-200 bg-gray-50' : ''}
    `,
    filled: `
      border-0 border-b-2 bg-gray-50 rounded-t-lg
      ${currentState === 'error' ? 'border-red-500 focus:border-red-600 bg-red-50' : ''}
      ${currentState === 'warning' ? 'border-warning-500 focus:border-warning-600 bg-warning-50' : ''}
      ${currentState === 'success' ? 'border-success-500 focus:border-success-600 bg-success-50' : ''}
      ${currentState === 'default' ? 'border-gray-300 focus:border-primary-600' : ''}
      ${disabled ? 'border-gray-200 bg-gray-100' : ''}
    `,
    ghost: `
      border-0 bg-transparent border-b border-gray-300
      ${currentState === 'error' ? 'border-red-500 focus:border-red-600' : ''}
      ${currentState === 'warning' ? 'border-warning-500 focus:border-warning-600' : ''}
      ${currentState === 'success' ? 'border-success-500 focus:border-success-600' : ''}
      ${currentState === 'default' ? 'focus:border-primary-600' : ''}
      ${disabled ? 'border-gray-200' : ''}
    `
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // Padding classes based on size
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5'
  };

  // Label classes for floating behavior
  const labelClasses = `
    absolute transition-all duration-200 ease-out pointer-events-none
    ${conditionalClass.textLeft}
    ${shouldFloatLabel 
      ? `${size === 'sm' ? 'text-xs top-2' : size === 'lg' ? 'text-sm top-3' : 'text-sm top-2.5'} 
         ${currentState === 'error' ? 'text-red-600' : currentState === 'warning' ? 'text-warning-600' : currentState === 'success' ? 'text-success-600' : 'text-primary-600'}
         ${isRTL ? 'right-4' : 'left-4'}`
      : `${size === 'sm' ? 'text-sm top-3' : size === 'lg' ? 'text-lg top-5' : 'text-base top-4'} text-gray-500
         ${isRTL ? 'right-4' : 'left-4'}`
    }
  `;

  // Message classes
  const messageClasses = `
    mt-2 text-sm flex items-center gap-2 transition-all duration-200
    ${currentState === 'error' ? 'text-red-600' : ''}
    ${currentState === 'warning' ? 'text-warning-600' : ''}
    ${currentState === 'success' ? 'text-success-600' : ''}
    ${currentState === 'default' ? 'text-gray-600' : ''}
  `;

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHasValue(Boolean(e.target.value));
    props.onChange?.(e);
    // Adjust height after state update
    setTimeout(adjustHeight, 0);
  };

  // Combine refs
  const combinedRef = useCallback((node: HTMLTextAreaElement) => {
    // Set internal ref - check if mutable
    try {
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    } catch (e) {
      // Ref is read-only, skip assignment
    }
    
    // Set forwarded ref
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref && 'current' in ref) {
      try {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      } catch (e) {
        // Ref is read-only, skip assignment
      }
    }
  }, [ref]);

  return (
    <div className={`w-full ${containerClassName}`}>
      {/* Non-floating label */}
      {label && !floatingLabel && (
        <label 
          htmlFor={textareaId}
          className={`block text-sm font-medium mb-2 ${conditionalClass.textLeft}
            ${currentState === 'error' ? 'text-red-700' : 'text-gray-700'}
            ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
          `}
        >
          {label}
        </label>
      )}

      {/* Textarea container */}
      <div className={`relative ${variant === 'outlined' ? 'rounded-xl' : variant === 'filled' ? 'rounded-t-xl' : ''}`}>
        {/* Floating label */}
        {label && floatingLabel && (
          <label 
            htmlFor={textareaId}
            className={labelClasses}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Textarea element */}
        <textarea
          ref={combinedRef}
          id={textareaId}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          rows={autoResize ? minRows : rows}
          className={`
            w-full outline-none transition-all duration-200 ease-out resize-none
            placeholder-gray-400 text-gray-900
            ${sizeClasses[size]}
            ${paddingClasses[size]}
            ${variantClasses[variant]}
            ${disabled ? 'cursor-not-allowed text-gray-500' : ''}
            ${conditionalClass.textLeft}
            ${floatingLabel ? (shouldFloatLabel ? 'pt-6' : '') : ''}
            ${className}
          `}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          style={{
            overflow: autoResize ? 'hidden' : 'auto',
            ...(props.style || {})
          }}
          {...props}
        />

        {/* Focus ring */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-200 ease-out
          ${variant === 'outlined' ? 'rounded-xl' : variant === 'filled' ? 'rounded-t-xl' : ''}
          ${isFocused && !disabled ? 'ring-2 ring-offset-1 ring-primary-500/20' : ''}
        `} />
      </div>

      {/* Helper text / Error message and character count */}
      <div className={`flex justify-between items-start mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Message */}
        {message && (
          <div className={messageClasses}>
            {currentState === 'error' && <Icon name="error" size="sm" />}
            {currentState === 'warning' && <Icon name="warning" size="sm" />}
            {currentState === 'success' && <Icon name="success" size="sm" />}
            <span>{message}</span>
          </div>
        )}

        {/* Character count */}
        {showCount && (
          <div className={`text-sm transition-colors duration-200 ${
            charCount > maxLength! * 0.9 ? 'text-warning-600' : 
            charCount === maxLength ? 'text-red-600' : 'text-gray-500'
          }`}>
            {charCount}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
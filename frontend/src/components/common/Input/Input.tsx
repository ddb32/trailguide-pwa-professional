import React, { useState, forwardRef, useId } from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../Icon';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual variant of the input */
  variant?: 'outlined' | 'filled' | 'ghost';
  /** Size of the input */
  size?: 'sm' | 'md' | 'lg';
  /** Validation state */
  state?: 'default' | 'success' | 'warning' | 'error';
  /** Label text */
  label?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Error message (overrides helperText when present) */
  error?: string;
  /** Success message (overrides helperText when present) */
  success?: string;
  /** Warning message (overrides helperText when present) */
  warning?: string;
  /** Icon to show at start of input */
  startIcon?: React.ReactNode;
  /** Icon to show at end of input */
  endIcon?: React.ReactNode;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Whether label should float */
  floatingLabel?: boolean;
  /** Additional class names */
  className?: string;
  /** Additional class names for input container */
  containerClassName?: string;
  /** Enable enhanced animations */
  animate?: boolean;
  /** Enable focus glow effect */
  focusGlow?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'outlined',
  size = 'md',
  state = 'default',
  label,
  helperText,
  error,
  success,
  warning,
  startIcon,
  endIcon,
  showCharCount = false,
  maxLength,
  floatingLabel = true,
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  value,
  animate = true,
  focusGlow = false,
  ...props
}, ref) => {
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(Boolean(value));
  const inputId = useId();
  
  // Determine current state based on props
  const currentState = error ? 'error' : warning ? 'warning' : success ? 'success' : state;
  
  // Determine message to show
  const message = error || warning || success || helperText;
  
  // Character count
  const charCount = typeof value === 'string' ? value.length : 0;
  const showCount = showCharCount && maxLength;
  
  // Label should be floated if there's a value, focus, or not floating labels
  const shouldFloatLabel = !floatingLabel || hasValue || isFocused || Boolean(props.placeholder);

  // Base classes for different variants with enhanced animations
  const variantClasses = {
    outlined: `
      border-2 bg-white transform-gpu
      ${animate ? 'transition-all duration-300 ease-out' : 'transition-colors duration-200'}
      ${currentState === 'error' ? 'border-red-500 focus:border-red-600 motion-safe:animate-shake-subtle' : ''}
      ${currentState === 'warning' ? 'border-warning-500 focus:border-warning-600 motion-safe:animate-pulse-warning' : ''}
      ${currentState === 'success' ? 'border-success-500 focus:border-success-600 motion-safe:animate-glow-success' : ''}
      ${currentState === 'default' ? 'border-gray-300 focus:border-primary-600' : ''}
      ${disabled ? 'border-gray-200 bg-gray-50 opacity-60' : ''}
      ${isFocused && animate ? 'motion-safe:scale-[1.01] shadow-elevation-1' : ''}
      ${focusGlow && isFocused ? 'motion-safe:animate-glow-soft' : ''}
    `,
    filled: `
      border-0 border-b-2 bg-gray-50 rounded-t-lg transform-gpu
      ${animate ? 'transition-all duration-300 ease-out' : 'transition-colors duration-200'}
      ${currentState === 'error' ? 'border-red-500 focus:border-red-600 bg-red-50 motion-safe:animate-shake-subtle' : ''}
      ${currentState === 'warning' ? 'border-warning-500 focus:border-warning-600 bg-warning-50 motion-safe:animate-pulse-warning' : ''}
      ${currentState === 'success' ? 'border-success-500 focus:border-success-600 bg-success-50 motion-safe:animate-glow-success' : ''}
      ${currentState === 'default' ? 'border-gray-300 focus:border-primary-600' : ''}
      ${disabled ? 'border-gray-200 bg-gray-100 opacity-60' : ''}
      ${isFocused && animate ? 'bg-gray-100 border-b-4' : ''}
    `,
    ghost: `
      border-0 bg-transparent border-b border-gray-300 transform-gpu
      ${animate ? 'transition-all duration-300 ease-out' : 'transition-colors duration-200'}
      ${currentState === 'error' ? 'border-red-500 focus:border-red-600 motion-safe:animate-shake-subtle' : ''}
      ${currentState === 'warning' ? 'border-warning-500 focus:border-warning-600 motion-safe:animate-pulse-warning' : ''}
      ${currentState === 'success' ? 'border-success-500 focus:border-success-600 motion-safe:animate-glow-success' : ''}
      ${currentState === 'default' ? 'focus:border-primary-600' : ''}
      ${disabled ? 'border-gray-200 opacity-60' : ''}
      ${isFocused && animate ? 'border-b-2' : ''}
    `
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // Padding classes based on size and icons
  const paddingClasses = {
    sm: `py-2 ${startIcon ? (isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3') : 'px-3'} ${endIcon ? (isRTL ? 'pl-10' : 'pr-10') : ''}`,
    md: `py-3 ${startIcon ? (isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4') : 'px-4'} ${endIcon ? (isRTL ? 'pl-12' : 'pr-12') : ''}`,
    lg: `py-4 ${startIcon ? (isRTL ? 'pr-14 pl-5' : 'pl-14 pr-5') : 'px-5'} ${endIcon ? (isRTL ? 'pl-14' : 'pr-14') : ''}`
  };

  // Enhanced label classes with smooth animations
  const labelClasses = `
    absolute pointer-events-none transform-gpu
    ${animate ? 'transition-all duration-300 ease-out' : 'transition-all duration-200 ease-out'}
    ${conditionalClass.textLeft}
    ${shouldFloatLabel 
      ? `${size === 'sm' ? 'text-xs top-2 scale-90' : size === 'lg' ? 'text-sm top-3 scale-95' : 'text-sm top-2.5 scale-90'} 
         ${currentState === 'error' ? 'text-red-600' : currentState === 'warning' ? 'text-warning-600' : currentState === 'success' ? 'text-success-600' : 'text-primary-600'}
         ${startIcon ? (isRTL ? 'right-10' : 'left-10') : (isRTL ? 'right-4' : 'left-4')}
         ${isFocused && animate ? 'motion-safe:animate-bounce-gentle font-medium' : ''}`
      : `${size === 'sm' ? 'text-sm top-2' : size === 'lg' ? 'text-lg top-4' : 'text-base top-3'} text-gray-500 scale-100
         ${startIcon ? (isRTL ? 'right-10' : 'left-10') : (isRTL ? 'right-4' : 'left-4')}
         ${isFocused && animate ? 'text-gray-700' : ''}`
    }
  `;

  // Enhanced message classes with animations
  const messageClasses = `
    mt-2 text-sm flex items-center gap-2 transform-gpu
    ${animate ? 'transition-all duration-300 ease-out' : 'transition-all duration-200'}
    ${currentState === 'error' ? 'text-red-600 motion-safe:animate-slide-in-up' : ''}
    ${currentState === 'warning' ? 'text-warning-600 motion-safe:animate-slide-in-up' : ''}
    ${currentState === 'success' ? 'text-success-600 motion-safe:animate-slide-in-up' : ''}
    ${currentState === 'default' ? 'text-gray-600' : ''}
  `;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(Boolean(e.target.value));
    props.onChange?.(e);
  };

  return (
    <div className={`w-full ${containerClassName}`}>
      {/* Non-floating label */}
      {label && !floatingLabel && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-medium mb-2 ${conditionalClass.textLeft}
            ${currentState === 'error' ? 'text-red-700' : 'text-gray-700'}
            ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
          `}
        >
          {label}
        </label>
      )}

      {/* Input container */}
      <div className={`relative ${variant === 'outlined' ? 'rounded-xl' : variant === 'filled' ? 'rounded-t-xl' : ''}`}>
        {/* Enhanced start icon with animations */}
        {startIcon && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 z-10 transform-gpu
            ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
            ${isRTL ? 'right-3' : 'left-3'}
            ${animate ? 'transition-all duration-300 ease-out' : 'transition-colors duration-200'}
            ${currentState === 'error' ? 'text-red-500 motion-safe:animate-shake-subtle' : currentState === 'warning' ? 'text-warning-500' : currentState === 'success' ? 'text-success-500 motion-safe:animate-pulse-gentle' : 'text-gray-400'}
            ${isFocused && animate ? 'motion-safe:scale-110 text-primary-500' : ''}
          `}>
            {startIcon}
          </div>
        )}

        {/* Floating label */}
        {label && floatingLabel && (
          <label 
            htmlFor={inputId}
            className={labelClasses}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Enhanced input element with animations */}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          value={value}
          maxLength={maxLength}
          className={`
            w-full outline-none transform-gpu
            placeholder-gray-400 text-gray-900
            ${animate ? 'transition-all duration-300 ease-out' : 'transition-all duration-200 ease-out'}
            ${sizeClasses[size]}
            ${paddingClasses[size]}
            ${variantClasses[variant]}
            ${disabled ? 'cursor-not-allowed text-gray-500' : ''}
            ${conditionalClass.textLeft}
            ${animate && isFocused ? 'placeholder-gray-300' : ''}
            ${className}
          `}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />

        {/* Enhanced end icon with animations */}
        {endIcon && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 z-10 transform-gpu
            ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
            ${isRTL ? 'left-3' : 'right-3'}
            ${animate ? 'transition-all duration-300 ease-out' : 'transition-colors duration-200'}
            ${currentState === 'error' ? 'text-red-500 motion-safe:animate-shake-subtle' : currentState === 'warning' ? 'text-warning-500' : currentState === 'success' ? 'text-success-500 motion-safe:animate-pulse-gentle' : 'text-gray-400'}
            ${isFocused && animate ? 'motion-safe:scale-110 text-primary-500' : ''}
          `}>
            {endIcon}
          </div>
        )}

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

Input.displayName = 'Input';

export default Input;
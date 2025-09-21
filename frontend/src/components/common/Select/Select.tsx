import React, { useState, useRef, useEffect, forwardRef, useId, useCallback } from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../Icon';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Select options */
  options: SelectOption[];
  /** Visual variant of the select */
  variant?: 'outlined' | 'filled' | 'ghost';
  /** Size of the select */
  size?: 'sm' | 'md' | 'lg';
  /** Validation state */
  state?: 'default' | 'success' | 'warning' | 'error';
  /** Label text */
  label?: string;
  /** Helper text shown below select */
  helperText?: string;
  /** Error message (overrides helperText when present) */
  error?: string;
  /** Success message (overrides helperText when present) */
  success?: string;
  /** Warning message (overrides helperText when present) */
  warning?: string;
  /** Whether label should float */
  floatingLabel?: boolean;
  /** Custom placeholder when no option is selected */
  placeholder?: string;
  /** Whether to enable search functionality */
  searchable?: boolean;
  /** Icon to show at start of select */
  startIcon?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Additional class names for select container */
  containerClassName?: string;
  /** Custom filter function for search */
  filterOption?: (option: SelectOption, searchValue: string) => boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options = [],
  variant = 'outlined',
  size = 'md',
  state = 'default',
  label,
  helperText,
  error,
  success,
  warning,
  floatingLabel = true,
  placeholder = 'Select an option...',
  searchable = false,
  startIcon,
  className = '',
  containerClassName = '',
  disabled = false,
  required = false,
  value = '',
  filterOption,
  ...props
}, ref) => {
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [hasValue, setHasValue] = useState(Boolean(value));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectId = useId();
  
  // Determine current state based on props
  const currentState = error ? 'error' : warning ? 'warning' : success ? 'success' : state;
  
  // Determine message to show
  const message = error || warning || success || helperText;
  
  // Label should be floated if there's a value, focus, or not floating labels
  const shouldFloatLabel = !floatingLabel || hasValue || isFocused || Boolean(placeholder);

  // Find selected option
  const selectedOption = options.find(option => option.value === value);

  // Filter options based on search
  const filteredOptions = searchable && searchValue
    ? options.filter(option => {
        if (filterOption) {
          return filterOption(option, searchValue);
        }
        return option.label.toLowerCase().includes(searchValue.toLowerCase());
      })
    : options;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Padding classes based on size and icons
  const paddingClasses = {
    sm: `py-2 ${startIcon ? (isRTL ? 'pr-10 pl-8' : 'pl-10 pr-8') : (isRTL ? 'pr-3 pl-8' : 'pl-3 pr-8')}`,
    md: `py-3 ${startIcon ? (isRTL ? 'pr-12 pl-10' : 'pl-12 pr-10') : (isRTL ? 'pr-4 pl-10' : 'pl-4 pr-10')}`,
    lg: `py-4 ${startIcon ? (isRTL ? 'pr-14 pl-12' : 'pl-14 pr-12') : (isRTL ? 'pr-5 pl-12' : 'pl-5 pr-12')}`
  };

  // Label classes for floating behavior
  const labelClasses = `
    absolute transition-all duration-200 ease-out pointer-events-none
    ${conditionalClass.textLeft}
    ${shouldFloatLabel 
      ? `${size === 'sm' ? 'text-xs top-2' : size === 'lg' ? 'text-sm top-3' : 'text-sm top-2.5'} 
         ${currentState === 'error' ? 'text-red-600' : currentState === 'warning' ? 'text-warning-600' : currentState === 'success' ? 'text-success-600' : 'text-primary-600'}
         ${startIcon ? (isRTL ? 'right-10' : 'left-10') : (isRTL ? 'right-4' : 'left-4')}`
      : `${size === 'sm' ? 'text-sm top-2' : size === 'lg' ? 'text-lg top-4' : 'text-base top-3'} text-gray-500
         ${startIcon ? (isRTL ? 'right-10' : 'left-10') : (isRTL ? 'right-4' : 'left-4')}`
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

  const handleClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (searchable && !isOpen) {
        // Focus search input when opening
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    }
  };

  const handleOptionClick = (option: SelectOption) => {
    if (!option.disabled) {
      setHasValue(true);
      setIsOpen(false);
      setSearchValue('');
      
      // Create synthetic change event
      if (selectRef.current && props.onChange) {
        const syntheticEvent = {
          target: {
            ...selectRef.current,
            value: String(option.value)
          }
        } as React.ChangeEvent<HTMLSelectElement>;
        props.onChange(syntheticEvent);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  // Combine refs
  const combinedRef = useCallback((node: HTMLSelectElement) => {
    // Set internal ref - check if mutable
    try {
      (selectRef as React.MutableRefObject<HTMLSelectElement | null>).current = node;
    } catch (e) {
      // Ref is read-only, skip assignment
    }
    
    // Set forwarded ref
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref && 'current' in ref) {
      try {
        (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
      } catch (e) {
        // Ref is read-only, skip assignment
      }
    }
  }, [ref]);

  return (
    <div className={`w-full ${containerClassName}`} ref={containerRef}>
      {/* Non-floating label */}
      {label && !floatingLabel && (
        <label 
          htmlFor={selectId}
          className={`block text-sm font-medium mb-2 ${conditionalClass.textLeft}
            ${currentState === 'error' ? 'text-red-700' : 'text-gray-700'}
            ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}
          `}
        >
          {label}
        </label>
      )}

      {/* Select container */}
      <div className={`relative ${variant === 'outlined' ? 'rounded-xl' : variant === 'filled' ? 'rounded-t-xl' : ''}`}>
        {/* Start icon */}
        {startIcon && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 z-10
            ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
            ${isRTL ? 'right-3' : 'left-3'}
            ${currentState === 'error' ? 'text-red-500' : currentState === 'warning' ? 'text-warning-500' : currentState === 'success' ? 'text-success-500' : 'text-gray-400'}
          `}>
            {startIcon}
          </div>
        )}

        {/* Floating label */}
        {label && floatingLabel && (
          <label 
            htmlFor={selectId}
            className={labelClasses}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Hidden native select for form submission */}
        <select
          ref={combinedRef}
          id={selectId}
          value={value}
          disabled={disabled}
          className="sr-only"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom select display */}
        <div
          className={`
            w-full cursor-pointer outline-none transition-all duration-200 ease-out
            flex items-center justify-between
            ${sizeClasses[size]}
            ${paddingClasses[size]}
            ${variantClasses[variant]}
            ${disabled ? 'cursor-not-allowed text-gray-500' : 'text-gray-900'}
            ${className}
          `}
          onClick={handleClick}
        >
          <div className={`flex items-center gap-2 flex-1 ${conditionalClass.textLeft}`}>
            {selectedOption?.icon && <span className="text-gray-400">{selectedOption.icon}</span>}
            <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          
          {/* Dropdown arrow */}
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <Icon name="chevron-down" size="sm" className="text-gray-400" />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto
            ${isRTL ? 'origin-top-right' : 'origin-top-left'}
          `}>
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Search options..."
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${conditionalClass.textLeft}`}
                />
              </div>
            )}

            {/* Options */}
            <div className="py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={index}
                    className={`
                      px-3 py-2 cursor-pointer transition-colors duration-150
                      flex items-center gap-2
                      ${option.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-50'}
                      ${option.value === value ? 'bg-primary-50 text-primary-700' : ''}
                      ${conditionalClass.textLeft}
                    `}
                    onClick={() => handleOptionClick(option)}
                  >
                    {option.icon && <span className="text-gray-400">{option.icon}</span>}
                    <span className="flex-1">{option.label}</span>
                    {option.value === value && (
                      <Icon name="success" size="sm" className="text-primary-600" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Focus ring */}
        <div className={`absolute inset-0 pointer-events-none transition-all duration-200 ease-out
          ${variant === 'outlined' ? 'rounded-xl' : variant === 'filled' ? 'rounded-t-xl' : ''}
          ${(isFocused || isOpen) && !disabled ? 'ring-2 ring-offset-1 ring-primary-500/20' : ''}
        `} />
      </div>

      {/* Helper text / Error message */}
      {message && (
        <div className={messageClasses}>
          {currentState === 'error' && <Icon name="error" size="sm" />}
          {currentState === 'warning' && <Icon name="warning" size="sm" />}
          {currentState === 'success' && <Icon name="success" size="sm" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
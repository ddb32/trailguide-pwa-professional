import React, { useCallback, useRef } from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outlined' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  iconOnly?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  ripple?: boolean;
  pulse?: boolean;
  glowOnHover?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  iconOnly = false,
  icon,
  iconPosition = 'left',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  children,
  onClick,
  type = 'button',
  ripple = true,
  pulse = false,
  glowOnHover = false
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!ripple || disabled || loading) return;
    
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    const rippleElement = button.getElementsByClassName('ripple')[0];
    if (rippleElement) {
      rippleElement.remove();
    }

    button.appendChild(circle);

    // Clean up ripple after animation
    setTimeout(() => {
      circle.remove();
    }, 600);
  }, [ripple, disabled, loading]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    if (onClick) {
      onClick(event);
    }
  }, [createRipple, onClick]);
  const baseClasses = [
    'relative overflow-hidden inline-flex items-center justify-center font-medium rounded-xl',
    'transition-all duration-300 ease-out transform-gpu',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'motion-safe:active:scale-[0.96] motion-safe:hover:scale-[1.02] touch-manipulation',
    'motion-reduce:transition-none motion-reduce:transform-none',
    pulse ? 'animate-pulse-gentle' : '',
    glowOnHover ? 'hover:animate-glow-soft' : '',
    iconOnly ? 'aspect-square' : ''
  ].filter(Boolean).join(' ');

  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-primary-600 to-primary-700 text-white',
      'hover:from-primary-700 hover:to-primary-800 hover:shadow-elevation-2',
      'focus:ring-primary-500 focus:shadow-elevation-1',
      'active:from-primary-800 active:to-primary-900 active:shadow-inner',
      'shadow-md transition-all duration-300'
    ].join(' '),
    secondary: [
      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 border border-gray-300',
      'hover:from-gray-200 hover:to-gray-300 hover:shadow-elevation-1 hover:border-gray-400',
      'focus:ring-gray-500 focus:shadow-elevation-1',
      'active:from-gray-300 active:to-gray-400 active:shadow-inner',
      'transition-all duration-300'
    ].join(' '),
    ghost: [
      'bg-transparent text-gray-700',
      'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-soft',
      'focus:ring-gray-500 focus:bg-gray-50',
      'active:bg-gray-200 active:shadow-inner',
      'transition-all duration-300'
    ].join(' '),
    danger: [
      'bg-gradient-to-r from-red-600 to-red-700 text-white',
      'hover:from-red-700 hover:to-red-800 hover:shadow-elevation-2',
      'focus:ring-red-500 focus:shadow-elevation-1',
      'active:from-red-800 active:to-red-900 active:shadow-inner',
      'shadow-md transition-all duration-300'
    ].join(' '),
    outlined: [
      'bg-transparent text-primary-700 border-2 border-primary-600',
      'hover:bg-primary-50 hover:border-primary-700 hover:shadow-soft',
      'focus:ring-primary-500 focus:bg-primary-25',
      'active:bg-primary-100 active:shadow-inner',
      'transition-all duration-300'
    ].join(' '),
    link: [
      'bg-transparent text-primary-600 px-0',
      'hover:text-primary-700 hover:underline',
      'focus:ring-primary-500 focus:underline',
      'active:text-primary-800',
      'transition-all duration-200'
    ].join(' ')
  };

  const sizeClasses = {
    xs: iconOnly ? 'p-1.5 text-xs' : 'px-2.5 py-1.5 text-xs',
    sm: iconOnly ? 'p-2 text-sm' : 'px-3 py-2 text-sm',
    md: iconOnly ? 'p-2.5 text-base' : 'px-4 py-2.5 text-base',
    lg: iconOnly ? 'p-3 text-lg' : 'px-6 py-3 text-lg',
    xl: iconOnly ? 'p-4 text-xl' : 'px-8 py-4 text-xl'
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].join(' ');

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
          {!iconOnly && <span className="ml-2 sr-only">Loading...</span>}
        </>
      );
    }

    if (iconOnly) {
      return icon || children;
    }

    if (icon && children) {
      return iconPosition === 'left' ? (
        <>
          <span className="mr-2">{icon}</span>
          {children}
        </>
      ) : (
        <>
          {children}
          <span className="ml-2">{icon}</span>
        </>
      );
    }

    return children;
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      aria-label={ariaLabel || (iconOnly ? 'Button' : undefined)}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      onClick={handleClick}
      style={{
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {renderContent()}
    </button>
  );
};
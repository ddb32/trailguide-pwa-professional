import React, { useState, useEffect } from 'react';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../../common/Icon';

export interface FormCardProps {
  /** Card title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Actions to display in header */
  actions?: React.ReactNode;
  /** Whether card is collapsible */
  collapsible?: boolean;
  /** Default expanded state for collapsible cards */
  defaultExpanded?: boolean;
  /** Color variant */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Visual appearance */
  appearance?: 'elevated' | 'flat' | 'outlined';
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon to display in header */
  icon?: string | React.ReactNode;
  /** Callback when expansion state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

export const FormCard: React.FC<FormCardProps> = ({
  title,
  subtitle = null,
  children,
  className = '',
  actions = null,
  collapsible = false,
  defaultExpanded = true,
  variant = 'default',
  appearance = 'elevated',
  isLoading = false,
  disabled = false,
  icon,
  onExpandChange,
  ariaLabel
}) => {
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle expansion toggle
  const handleToggleExpand = () => {
    if (!disabled && collapsible) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onExpandChange?.(newExpanded);
    }
  };

  // Color variants
  const colorVariants = {
    default: {
      background: 'bg-white',
      border: 'border-secondary-200',
      borderHover: 'hover:border-secondary-300',
      header: 'bg-gradient-to-r from-secondary-25 to-secondary-50',
      headerBorder: 'border-secondary-200',
      title: 'text-secondary-900',
      subtitle: 'text-secondary-600',
      accent: 'bg-secondary-500'
    },
    primary: {
      background: 'bg-white',
      border: 'border-primary-200',
      borderHover: 'hover:border-primary-300',
      header: 'bg-gradient-to-r from-primary-25 to-primary-50',
      headerBorder: 'border-primary-200',
      title: 'text-primary-900',
      subtitle: 'text-primary-600',
      accent: 'bg-primary-500'
    },
    secondary: {
      background: 'bg-white',
      border: 'border-secondary-200',
      borderHover: 'hover:border-secondary-300',
      header: 'bg-gradient-to-r from-secondary-25 to-secondary-50',
      headerBorder: 'border-secondary-200',
      title: 'text-secondary-900',
      subtitle: 'text-secondary-600',
      accent: 'bg-secondary-500'
    },
    success: {
      background: 'bg-white',
      border: 'border-success-200',
      borderHover: 'hover:border-success-300',
      header: 'bg-gradient-to-r from-success-25 to-success-50',
      headerBorder: 'border-success-200',
      title: 'text-success-900',
      subtitle: 'text-success-600',
      accent: 'bg-success-500'
    },
    warning: {
      background: 'bg-white',
      border: 'border-warning-200',
      borderHover: 'hover:border-warning-300',
      header: 'bg-gradient-to-r from-warning-25 to-warning-50',
      headerBorder: 'border-warning-200',
      title: 'text-warning-900',
      subtitle: 'text-warning-600',
      accent: 'bg-warning-500'
    },
    error: {
      background: 'bg-white',
      border: 'border-error-200',
      borderHover: 'hover:border-error-300',
      header: 'bg-gradient-to-r from-error-25 to-error-50',
      headerBorder: 'border-error-200',
      title: 'text-error-900',
      subtitle: 'text-error-600',
      accent: 'bg-error-500'
    },
    info: {
      background: 'bg-white',
      border: 'border-info-200',
      borderHover: 'hover:border-info-300',
      header: 'bg-gradient-to-r from-info-25 to-info-50',
      headerBorder: 'border-info-200',
      title: 'text-info-900',
      subtitle: 'text-info-600',
      accent: 'bg-info-500'
    }
  };

  // Appearance variants
  const appearanceVariants = {
    elevated: 'shadow-sm hover:shadow-lg',
    flat: 'shadow-none hover:shadow-sm',
    outlined: 'shadow-none border-2'
  };

  const theme = colorVariants[variant];
  const appearanceStyles = appearanceVariants[appearance];

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="animate-pulse p-6 lg:p-8">
      <div className="space-y-4">
        <div className="h-6 bg-secondary-200 rounded w-3/4 animate-shimmer"></div>
        <div className="h-4 bg-secondary-200 rounded w-full animate-shimmer"></div>
        <div className="h-4 bg-secondary-200 rounded w-5/6 animate-shimmer"></div>
        <div className="space-y-2">
          <div className="h-10 bg-secondary-200 rounded animate-shimmer"></div>
          <div className="h-10 bg-secondary-200 rounded animate-shimmer"></div>
        </div>
      </div>
    </div>
  );

  const cardClasses = `
    ${theme.background} rounded-lg lg:rounded-xl border
    overflow-hidden transition-all duration-300 ease-out
    ${appearanceStyles} ${theme.border} ${theme.borderHover}
    ${disabled ? 'opacity-60' : ''}
    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
    ${className}
  `;

  return (
    <div 
      className={cardClasses}
      aria-label={ariaLabel}
      aria-expanded={collapsible ? isExpanded : undefined}
    >
      {/* Top accent bar */}
      <div className={`h-1 ${theme.accent} opacity-75`} />

      {/* Header */}
      <div className={`
        px-6 lg:px-8 py-3 lg:py-4 
        ${theme.header} border-b ${theme.headerBorder}
        ${collapsible && !disabled ? 'cursor-pointer hover:opacity-90' : ''}
        transition-all duration-300
      `}>
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="flex-1">
            <div 
              className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-3`}
              onClick={handleToggleExpand}
              role={collapsible ? 'button' : undefined}
              tabIndex={collapsible && !disabled ? 0 : undefined}
              onKeyDown={(e) => {
                if (collapsible && !disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleToggleExpand();
                }
              }}
              aria-label={collapsible ? `${isExpanded ? 'Collapse' : 'Expand'} ${title}` : undefined}
            >
              {/* Collapse/Expand Icon */}
              {collapsible && (
                <div className={`
                  flex-shrink-0 transition-all duration-300
                  ${disabled ? 'text-secondary-400' : 'text-secondary-600 hover:text-secondary-800'}
                `}>
                  <Icon 
                    name="chevron-right"
                    size="md"
                    className={`transform transition-transform duration-300 ${
                      isExpanded ? 'rotate-90' : isRTL ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              )}

              {/* Icon */}
              {icon && (
                <div className={`
                  flex-shrink-0 transition-transform duration-300
                  ${collapsible ? 'group-hover:scale-105' : ''}
                `}>
                  {typeof icon === 'string' && icon.length <= 2 ? (
                    <span className="text-2xl">{icon}</span>
                  ) : typeof icon === 'string' ? (
                    <Icon name={icon as any} size="lg" className={theme.title} />
                  ) : (
                    icon
                  )}
                </div>
              )}
              
              {/* Title and Subtitle */}
              <div className={conditionalClass.textLeft}>
                <h3 className={`
                  text-base lg:text-lg font-medium transition-colors duration-300
                  ${theme.title}
                  ${collapsible && !disabled ? 'group-hover:opacity-90' : ''}
                `}>
                  {title}
                </h3>
                {subtitle && (
                  <p className={`
                    text-sm mt-1 transition-colors duration-300
                    ${theme.subtitle}
                  `}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className={`
              flex items-center space-x-3 transition-all duration-300
              ${isRTL ? 'space-x-reverse' : ''}
              ${disabled ? 'opacity-60 pointer-events-none' : ''}
            `}>
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`
        transition-all duration-500 ease-out overflow-hidden
        ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
      `}>
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="px-6 lg:px-8 py-4 lg:py-6">
            {children}
          </div>
        )}
      </div>

      {/* Focus indicator */}
      <div className="absolute inset-0 rounded-xl ring-0 ring-primary-500/20 transition-all duration-300 focus-within:ring-4 pointer-events-none" />
    </div>
  );
};

export default FormCard;
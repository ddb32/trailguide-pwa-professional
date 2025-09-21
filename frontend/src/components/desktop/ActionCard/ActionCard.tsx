import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../../common/Icon';

export interface ActionCardProps {
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Icon to display (emoji or icon name) */
  icon: string | React.ReactNode;
  /** Navigation URL */
  href?: string;
  /** Color theme variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Visual style variant */
  appearance?: 'elevated' | 'flat' | 'outlined';
  /** Disabled state */
  disabled?: boolean;
  /** Coming soon state */
  comingSoon?: boolean;
  /** Recent activity text */
  recentActivity?: string | null;
  /** Click handler for non-navigation actions */
  onClick?: () => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Show action indicator */
  showActionHint?: boolean;
  /** Enable enhanced hover animations */
  enhanced?: boolean;
  /** Enable floating animation on hover */
  floatOnHover?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  href,
  variant = 'primary',
  appearance = 'elevated',
  disabled = false,
  comingSoon = false,
  recentActivity = null,
  onClick,
  isLoading = false,
  className = '',
  ariaLabel,
  showActionHint = true,
  enhanced = false,
  floatOnHover = false
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Semantic color variants
  const colorVariants = {
    primary: {
      background: 'bg-gradient-to-br from-primary-25 to-primary-50',
      backgroundHover: 'hover:from-primary-50 hover:to-primary-100',
      border: 'border-primary-200',
      borderHover: 'hover:border-primary-300',
      icon: 'text-primary-600',
      iconHover: 'group-hover:text-primary-700',
      iconBg: 'bg-primary-100',
      title: 'text-primary-900',
      titleHover: 'group-hover:text-primary-800',
      description: 'text-primary-700',
      descriptionHover: 'group-hover:text-primary-600',
      badge: 'bg-primary-600 text-white',
      accent: 'bg-primary-500'
    },
    secondary: {
      background: 'bg-gradient-to-br from-secondary-25 to-secondary-50',
      backgroundHover: 'hover:from-secondary-50 hover:to-secondary-100',
      border: 'border-secondary-200',
      borderHover: 'hover:border-secondary-300',
      icon: 'text-secondary-600',
      iconHover: 'group-hover:text-secondary-700',
      iconBg: 'bg-secondary-100',
      title: 'text-secondary-900',
      titleHover: 'group-hover:text-secondary-800',
      description: 'text-secondary-700',
      descriptionHover: 'group-hover:text-secondary-600',
      badge: 'bg-secondary-600 text-white',
      accent: 'bg-secondary-500'
    },
    success: {
      background: 'bg-gradient-to-br from-success-25 to-success-50',
      backgroundHover: 'hover:from-success-50 hover:to-success-100',
      border: 'border-success-200',
      borderHover: 'hover:border-success-300',
      icon: 'text-success-600',
      iconHover: 'group-hover:text-success-700',
      iconBg: 'bg-success-100',
      title: 'text-success-900',
      titleHover: 'group-hover:text-success-800',
      description: 'text-success-700',
      descriptionHover: 'group-hover:text-success-600',
      badge: 'bg-success-600 text-white',
      accent: 'bg-success-500'
    },
    warning: {
      background: 'bg-gradient-to-br from-warning-25 to-warning-50',
      backgroundHover: 'hover:from-warning-50 hover:to-warning-100',
      border: 'border-warning-200',
      borderHover: 'hover:border-warning-300',
      icon: 'text-warning-600',
      iconHover: 'group-hover:text-warning-700',
      iconBg: 'bg-warning-100',
      title: 'text-warning-900',
      titleHover: 'group-hover:text-warning-800',
      description: 'text-warning-700',
      descriptionHover: 'group-hover:text-warning-600',
      badge: 'bg-warning-600 text-white',
      accent: 'bg-warning-500'
    },
    error: {
      background: 'bg-gradient-to-br from-error-25 to-error-50',
      backgroundHover: 'hover:from-error-50 hover:to-error-100',
      border: 'border-error-200',
      borderHover: 'hover:border-error-300',
      icon: 'text-error-600',
      iconHover: 'group-hover:text-error-700',
      iconBg: 'bg-error-100',
      title: 'text-error-900',
      titleHover: 'group-hover:text-error-800',
      description: 'text-error-700',
      descriptionHover: 'group-hover:text-error-600',
      badge: 'bg-error-600 text-white',
      accent: 'bg-error-500'
    },
    info: {
      background: 'bg-gradient-to-br from-info-25 to-info-50',
      backgroundHover: 'hover:from-info-50 hover:to-info-100',
      border: 'border-info-200',
      borderHover: 'hover:border-info-300',
      icon: 'text-info-600',
      iconHover: 'group-hover:text-info-700',
      iconBg: 'bg-info-100',
      title: 'text-info-900',
      titleHover: 'group-hover:text-info-800',
      description: 'text-info-700',
      descriptionHover: 'group-hover:text-info-600',
      badge: 'bg-info-600 text-white',
      accent: 'bg-info-500'
    }
  };

  // Appearance variants
  const appearanceVariants = {
    elevated: 'shadow-sm hover:shadow-xl border-2',
    flat: 'border-2 hover:shadow-md',
    outlined: 'border-2 bg-white hover:shadow-sm'
  };

  const theme = colorVariants[variant];
  const appearanceStyles = appearanceVariants[appearance];

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="w-16 h-16 bg-secondary-200 rounded-2xl animate-shimmer"></div>
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-secondary-200 rounded w-3/4 animate-shimmer"></div>
          <div className="h-4 bg-secondary-200 rounded w-full animate-shimmer"></div>
          <div className="h-4 bg-secondary-200 rounded w-2/3 animate-shimmer"></div>
        </div>
      </div>
    </div>
  );

  const cardClasses = `
    group relative overflow-hidden transform-gpu
    rounded-xl lg:rounded-2xl 
    ${enhanced ? 'transition-all duration-500 ease-out' : 'transition-all duration-300 ease-out'}
    ${appearanceStyles}
    ${disabled || comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
    ${appearance === 'outlined' ? 'bg-white' : theme.background}
    ${appearance !== 'outlined' ? theme.backgroundHover : ''}
    ${theme.border} ${theme.borderHover}
    ${!disabled && !comingSoon ? 
      enhanced && floatOnHover ? 
        'motion-safe:hover:-translate-y-4 motion-safe:hover:scale-[1.05] motion-safe:hover:rotate-1 motion-safe:hover:shadow-elevation-4' : 
        'hover:-translate-y-1 hover:scale-[1.02]' : 
      ''
    }
    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
    ${enhanced ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:via-transparent before:to-primary-500/5 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100' : ''}
    motion-reduce:transform-none motion-reduce:transition-none
    p-6 lg:p-8 ${className}
  `;

  const handleClick = () => {
    if (!disabled && !comingSoon && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && !comingSoon && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (onClick) onClick();
    }
  };

  const cardContent = (
    <div 
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled || comingSoon ? -1 : 0}
      role={onClick || href ? 'button' : undefined}
      aria-label={ariaLabel || `${title}: ${description}`}
      aria-disabled={disabled || comingSoon}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Coming Soon Badge */}
      {comingSoon && (
        <div className={`
          absolute top-4 ${isRTL ? 'left-4' : 'right-4'}
          px-3 py-1.5 text-xs font-medium rounded-full
          ${theme.badge} shadow-sm
          animate-pulse
        `}>
          {t('dashboard.quickActions.comingSoon')}
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Main Content */}
          <div className={`flex items-start ${isRTL ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-4 lg:space-x-6`}>
            {/* Enhanced Icon */}
            <div className={`
              flex-shrink-0 p-4 rounded-xl lg:rounded-2xl transform-gpu
              ${theme.iconBg} backdrop-blur-sm shadow-sm
              ${enhanced ? 
                'transition-all duration-500 ease-out motion-safe:group-hover:scale-125 motion-safe:group-hover:rotate-12 motion-safe:group-hover:shadow-elevation-2' : 
                'transition-all duration-300 group-hover:scale-110 group-hover:rotate-3'
              }
              ${theme.icon} ${theme.iconHover}
              motion-reduce:transition-none motion-reduce:transform-none
            `}>
              {typeof icon === 'string' && icon.length <= 2 ? (
                <span className="text-4xl lg:text-5xl">{icon}</span>
              ) : typeof icon === 'string' ? (
                <Icon name={icon as any} size="2xl" />
              ) : (
                icon
              )}
            </div>
            
            {/* Content */}
            <div className={`flex-1 ${conditionalClass.textLeft}`}>
              <h3 className={`
                text-lg lg:text-xl xl:text-2xl font-bold mb-2 lg:mb-3
                transition-colors duration-300
                ${theme.title} ${theme.titleHover}
              `}>
                {title}
              </h3>
              
              <p className={`
                text-sm lg:text-base leading-relaxed mb-4 lg:mb-6
                transition-colors duration-300
                ${theme.description} ${theme.descriptionHover}
              `}>
                {description}
              </p>

              {/* Desktop-only additional info */}
              <div className="hidden lg:block space-y-3">
                {recentActivity && (
                  <div className={`
                    flex items-center text-xs font-medium
                    ${isRTL ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-2
                  `}>
                    <div className={`w-2 h-2 rounded-full ${theme.badge} animate-pulse`}></div>
                    <span className={`${theme.description} transition-colors duration-300`}>
                      {t('dashboard.quickActions.recentActivity')}: {recentActivity}
                    </span>
                  </div>
                )}

                {showActionHint && !disabled && !comingSoon && (
                  <div className={`
                    flex items-center text-xs font-medium opacity-0 group-hover:opacity-100
                    transition-all duration-300 transform translate-x-0 group-hover:translate-x-1
                    ${isRTL ? 'flex-row-reverse space-x-reverse' : 'flex-row'} space-x-2
                    ${theme.description}
                  `}>
                    <Icon name="chevron-right" size="xs" />
                    <span>{t('dashboard.quickActions.clickToAction')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced hover overlay effect */}
      <div className={`
        absolute inset-0 rounded-2xl pointer-events-none
        ${enhanced ? 
          'bg-gradient-to-br from-white/10 via-transparent to-primary-500/10 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out' : 
          'bg-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300'
        }
        motion-reduce:transition-none
      `} />

      {/* Enhanced shimmer effect */}
      {enhanced && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out motion-reduce:transition-none motion-reduce:transform-none" />
        </div>
      )}
      
      {/* Focus ring */}
      <div className="absolute inset-0 rounded-2xl ring-0 ring-primary-500/20 transition-all duration-300 focus-within:ring-4 pointer-events-none" />
    </div>
  );

  // Wrap in Link if href is provided and not disabled
  if (href && !disabled && !comingSoon) {
    return (
      <Link to={href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export default ActionCard;
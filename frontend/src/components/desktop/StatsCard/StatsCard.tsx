import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../../common/Icon';

export interface StatsCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Icon to display (emoji or icon name) */
  icon?: string | React.ReactNode;
  /** Color theme variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Change indicator (e.g., "+5%", "-2%") */
  change?: string | null;
  /** Type of change for styling */
  changeType?: 'positive' | 'negative' | 'neutral';
  /** Subtitle or additional info */
  subtitle?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Enable animated number counting */
  animateValue?: boolean;
  /** Previous value for animation comparison */
  previousValue?: string | number;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Enable enhanced hover animations */
  enhanced?: boolean;
  /** Enable floating animation on hover */
  floatOnHover?: boolean;
  /** Enable glow effect */
  glowEffect?: boolean;
}

// Animation hook for number counting
const useAnimatedNumber = (
  endValue: number, 
  duration: number = 1000, 
  startValue: number = 0,
  enabled: boolean = true
): number => {
  const [value, setValue] = useState(startValue);

  useEffect(() => {
    if (!enabled) {
      setValue(endValue);
      return;
    }

    const startTime = Date.now();
    const startVal = value;
    const difference = endValue - startVal;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setValue(startVal + difference * easeOutQuart);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [endValue, duration, enabled]);

  return Math.round(value);
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  variant = 'primary',
  change = null,
  changeType = 'neutral',
  subtitle,
  isLoading = false,
  className = '',
  animateValue = true,
  previousValue,
  onClick,
  ariaLabel,
  enhanced = false,
  floatOnHover = false,
  glowEffect = false
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Color variants using new semantic color system
  const variants = {
    primary: {
      background: 'bg-gradient-to-br from-primary-50 to-primary-100',
      border: 'border-primary-200',
      icon: 'text-primary-600',
      iconBg: 'bg-primary-100',
      title: 'text-primary-900',
      value: 'text-primary-800',
      accent: 'bg-primary-500'
    },
    secondary: {
      background: 'bg-gradient-to-br from-secondary-50 to-secondary-100',
      border: 'border-secondary-200',
      icon: 'text-secondary-600',
      iconBg: 'bg-secondary-100',
      title: 'text-secondary-900',
      value: 'text-secondary-800',
      accent: 'bg-secondary-500'
    },
    success: {
      background: 'bg-gradient-to-br from-success-50 to-success-100',
      border: 'border-success-200',
      icon: 'text-success-600',
      iconBg: 'bg-success-100',
      title: 'text-success-900',
      value: 'text-success-800',
      accent: 'bg-success-500'
    },
    warning: {
      background: 'bg-gradient-to-br from-warning-50 to-warning-100',
      border: 'border-warning-200',
      icon: 'text-warning-600',
      iconBg: 'bg-warning-100',
      title: 'text-warning-900',
      value: 'text-warning-800',
      accent: 'bg-warning-500'
    },
    error: {
      background: 'bg-gradient-to-br from-error-50 to-error-100',
      border: 'border-error-200',
      icon: 'text-error-600',
      iconBg: 'bg-error-100',
      title: 'text-error-900',
      value: 'text-error-800',
      accent: 'bg-error-500'
    },
    info: {
      background: 'bg-gradient-to-br from-info-50 to-info-100',
      border: 'border-info-200',
      icon: 'text-info-600',
      iconBg: 'bg-info-100',
      title: 'text-info-900',
      value: 'text-info-800',
      accent: 'bg-info-500'
    }
  };

  const theme = variants[variant];

  // Animated value calculation
  const numericValue = useMemo(() => {
    const parsed = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    return isNaN(parsed) ? 0 : parsed;
  }, [value]);

  const animatedValue = useAnimatedNumber(
    numericValue,
    1200,
    previousValue ? (typeof previousValue === 'string' ? parseFloat(previousValue.replace(/,/g, '')) : previousValue) : 0,
    animateValue && !isLoading && isVisible
  );

  const displayValue = useMemo(() => {
    if (typeof value === 'string' && isNaN(numericValue)) {
      return value; // Return original string if not numeric
    }
    
    if (animateValue && !isLoading) {
      return animatedValue.toLocaleString();
    }
    
    return typeof value === 'number' ? value.toLocaleString() : value;
  }, [value, animatedValue, animateValue, isLoading, numericValue]);

  // Change indicator styling
  const changeStyles = {
    positive: 'text-success-600 bg-success-50',
    negative: 'text-error-600 bg-error-50',
    neutral: 'text-secondary-600 bg-secondary-50'
  };

  // Change icons
  const changeIcons = {
    positive: 'trending-up',
    negative: 'trending-down',
    neutral: 'minus'
  };

  // Professional shimmer loading component
  const ShimmerSkeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-shimmer"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-shimmer"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 animate-shimmer"></div>
        </div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-full animate-shimmer"></div>
    </div>
  );

  const cardClasses = `
    group relative overflow-hidden transform-gpu
    bg-white rounded-2xl border shadow-lg
    ${enhanced ? 'transition-all duration-500 ease-out' : 'transition-all duration-300 ease-out'}
    ${enhanced && floatOnHover ?
      'motion-safe:hover:shadow-xl motion-safe:hover:-translate-y-2 motion-safe:hover:scale-[1.02]' :
      'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]'
    }
    ${theme.border}
    ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/30 active:scale-[0.98]' : ''}
    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
    motion-reduce:transform-none motion-reduce:transition-none
    ${className}
  `;

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || `${title}: ${displayValue}`}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Simple accent bar matching mockup */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accent}`} />

      <div className="p-6 lg:p-8">
        {isLoading ? (
          <ShimmerSkeleton />
        ) : (
          <>
            {/* Enhanced content layout for full-screen dashboard */}
            <div className="text-center">
              {/* Larger icon for better presence */}
              <div className={`inline-flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-xl mb-4 lg:mb-5 ${theme.iconBg}`}>
                {typeof icon === 'string' && icon.length <= 2 ? (
                  <span className="text-2xl lg:text-3xl">{icon}</span>
                ) : typeof icon === 'string' ? (
                  <Icon name={icon as any} size="lg" className={theme.icon} />
                ) : (
                  icon
                )}
              </div>

              {/* Enhanced value with better scaling */}
              <div className={`text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight mb-2 lg:mb-3 ${theme.value}`}>
                {displayValue}
              </div>

              {/* Enhanced title */}
              <h3 className={`text-sm lg:text-base font-medium text-gray-600 ${conditionalClass.textLeft}`}>
                {title}
              </h3>

              {/* Enhanced subtitle */}
              {subtitle && (
                <div className={`text-sm lg:text-base text-gray-500 mt-1 lg:mt-2 text-center`}>
                  {subtitle.split('\n').map((line, index) => (
                    <div key={index} className="leading-relaxed">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
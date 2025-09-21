import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../../common/Icon';

export interface AdminStatsCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Subtitle or additional info */
  subtitle?: string;
  /** Icon to display (emoji or icon name) */
  icon?: string | React.ReactNode;
  /** Color theme variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  /** Loading state */
  isLoading?: boolean;
  /** Change indicator (e.g., "+5%", "-2%") */
  change?: string | null;
  /** Type of change for styling */
  changeType?: 'positive' | 'negative' | 'neutral';
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
}

// Reuse the animated number hook from StatsCard
const useAnimatedNumber = (
  endValue: number, 
  duration: number = 800, 
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

export const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  isLoading = false,
  change = null,
  changeType = 'neutral',
  className = '',
  animateValue = true,
  previousValue,
  onClick,
  ariaLabel
}) => {
  const { t: _t } = useTranslation(); // Prefix to indicate intentionally unused
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Admin-focused color variants (more subtle than regular StatsCard)
  const variants = {
    primary: {
      background: 'bg-gradient-to-br from-primary-25 to-white',
      border: 'border-primary-100',
      iconBg: 'bg-primary-50',
      icon: 'text-primary-600',
      title: 'text-primary-700',
      value: 'text-primary-900',
      accent: 'bg-primary-400'
    },
    secondary: {
      background: 'bg-gradient-to-br from-secondary-25 to-white',
      border: 'border-secondary-100',
      iconBg: 'bg-secondary-50',
      icon: 'text-secondary-600',
      title: 'text-secondary-700',
      value: 'text-secondary-900',
      accent: 'bg-secondary-400'
    },
    success: {
      background: 'bg-gradient-to-br from-success-25 to-white',
      border: 'border-success-100',
      iconBg: 'bg-success-50',
      icon: 'text-success-600',
      title: 'text-success-700',
      value: 'text-success-900',
      accent: 'bg-success-400'
    },
    warning: {
      background: 'bg-gradient-to-br from-warning-25 to-white',
      border: 'border-warning-100',
      iconBg: 'bg-warning-50',
      icon: 'text-warning-600',
      title: 'text-warning-700',
      value: 'text-warning-900',
      accent: 'bg-warning-400'
    },
    error: {
      background: 'bg-gradient-to-br from-error-25 to-white',
      border: 'border-error-100',
      iconBg: 'bg-error-50',
      icon: 'text-error-600',
      title: 'text-error-700',
      value: 'text-error-900',
      accent: 'bg-error-400'
    },
    info: {
      background: 'bg-gradient-to-br from-info-25 to-white',
      border: 'border-info-100',
      iconBg: 'bg-info-50',
      icon: 'text-info-600',
      title: 'text-info-700',
      value: 'text-info-900',
      accent: 'bg-info-400'
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
    800,
    previousValue ? (typeof previousValue === 'string' ? parseFloat(previousValue.replace(/,/g, '')) : previousValue) : 0,
    animateValue && !isLoading && isVisible
  );

  const displayValue = useMemo(() => {
    if (typeof value === 'string' && isNaN(numericValue)) {
      return value;
    }
    
    if (animateValue && !isLoading) {
      return animatedValue.toLocaleString();
    }
    
    return typeof value === 'number' ? value.toLocaleString() : value;
  }, [value, animatedValue, animateValue, isLoading, numericValue]);

  // Change indicator styling
  const changeStyles = {
    positive: 'text-success-700 bg-success-50 border-success-200',
    negative: 'text-error-700 bg-error-50 border-error-200',
    neutral: 'text-secondary-700 bg-secondary-50 border-secondary-200'
  };

  // Change icons
  const changeIcons = {
    positive: 'trending-up',
    negative: 'trending-down',
    neutral: 'minus'
  };

  // Professional loading skeleton for admin cards
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="h-4 bg-secondary-200 rounded w-2/3 animate-shimmer"></div>
        <div className="w-10 h-10 bg-secondary-200 rounded-lg animate-shimmer"></div>
      </div>
      <div className="space-y-3">
        <div className="h-8 bg-secondary-200 rounded w-3/4 animate-shimmer"></div>
        <div className="h-3 bg-secondary-200 rounded w-1/2 animate-shimmer"></div>
      </div>
    </div>
  );

  const cardClasses = `
    group relative overflow-hidden
    bg-white rounded-lg border shadow-sm
    transition-all duration-300 ease-out
    hover:shadow-md hover:-translate-y-0.5 hover:border-opacity-60
    ${theme.background} ${theme.border}
    ${onClick ? 'cursor-pointer focus:outline-none focus:ring-3 focus:ring-primary-500/20' : ''}
    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
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
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${theme.accent} opacity-60`} />
      
      <div className="p-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Header with title and icon */}
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`
                text-sm font-medium truncate
                ${theme.title} ${conditionalClass.textLeft}
                transition-colors duration-300
              `}>
                {title}
              </h3>
              
              {/* Icon container */}
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                ${theme.iconBg} 
                transition-all duration-300 group-hover:scale-105
              `}>
                {typeof icon === 'string' && icon.length <= 2 ? (
                  <span className="text-xl">{icon}</span>
                ) : typeof icon === 'string' ? (
                  <Icon name={icon as any} size="md" className={theme.icon} />
                ) : (
                  icon
                )}
              </div>
            </div>
            
            {/* Value and change indicator */}
            <div className={`flex items-baseline justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`
                text-2xl font-bold
                ${theme.value}
                transition-all duration-500 ease-out
              `}>
                {displayValue}
              </div>
              
              {change && (
                <div className={`
                  inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border
                  ${changeStyles[changeType]}
                  transition-all duration-300 group-hover:scale-105
                `}>
                  <Icon 
                    name={changeIcons[changeType] as any} 
                    size="xs" 
                    className={`${isRTL ? 'ml-1' : 'mr-1'}`}
                  />
                  {change}
                </div>
              )}
            </div>
            
            {/* Subtitle */}
            {subtitle && (
              <p className={`
                text-sm text-secondary-500 mt-2
                ${conditionalClass.textLeft}
                transition-colors duration-300
              `}>
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>

      {/* Subtle hover effect */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default AdminStatsCard;
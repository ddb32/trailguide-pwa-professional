import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLifecycleStatus } from '../../../utils/activation';
import type { FormattedEvent } from '../../../types/global';

export interface StatusDisplayProps {
  /** Guide/Event data */
  event: FormattedEvent;
  /** Display variant for different contexts */
  variant?: 'default' | 'compact' | 'detailed';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Unified Status Display Component
 *
 * Replaces StatusBadge + ActivationDisplay + ExpirationDisplay with a single,
 * lifecycle-aware component that shows clear messages like:
 * - "Will be published in 2 hours" (scheduled)
 * - "Active, expires in 3 days" (active with expiration)
 * - "Expired 1 day ago" (expired)
 *
 * Features:
 * - Real-time updates with smart intervals
 * - Professional time formatting (<24h = hours, >24h = days)
 * - Clear lifecycle phase messaging
 * - Responsive design for mobile/desktop
 * - Production-ready error handling
 */
const StatusDisplay: React.FC<StatusDisplayProps> = ({
  event,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const { t } = useTranslation();

  // Real-time status updates
  const [lifecycleStatus, setLifecycleStatus] = useState(() =>
    getLifecycleStatus(event.activation_date || null, event.expiration_date || null, event.status, t)
  );

  // Real-time update effect with smart intervals
  useEffect(() => {
    const updateStatus = () => {
      try {
        const newStatus = getLifecycleStatus(
          event.activation_date || null,
          event.expiration_date || null,
          event.status,
          t
        );
        setLifecycleStatus(newStatus);
      } catch (error) {
        console.error('StatusDisplay: Error updating status', error);
        // Graceful degradation - keep last known status
      }
    };

    // Update immediately
    updateStatus();

    // Smart interval based on urgency
    let interval: NodeJS.Timeout;

    // Only set up intervals for time-sensitive statuses
    if (lifecycleStatus.phase === 'scheduled' || lifecycleStatus.phase === 'active') {
      switch (lifecycleStatus.urgency) {
        case 'imminent': // Last hour before activation
          interval = setInterval(updateStatus, 30000); // 30 seconds
          break;
        case 'warning': // Last 24 hours before expiration
          interval = setInterval(updateStatus, 60000); // 1 minute
          break;
        case 'scheduled':
        case 'active':
          interval = setInterval(updateStatus, 300000); // 5 minutes
          break;
        default:
          // No updates needed for static statuses
          break;
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [event.activation_date, event.expiration_date, event.status, lifecycleStatus.urgency]);

  // Size-based styling
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      message: 'text-xs font-medium',
      subMessage: 'text-xs'
    },
    md: {
      container: 'px-3 py-2 text-sm',
      message: 'text-sm font-medium',
      subMessage: 'text-xs'
    },
    lg: {
      container: 'px-4 py-3 text-base',
      message: 'text-base font-medium',
      subMessage: 'text-sm'
    }
  };

  // Variant-based styling
  const variantClasses = {
    default: 'rounded-lg border',
    compact: 'rounded-md border-none',
    detailed: 'rounded-xl border shadow-sm'
  };

  const currentSizeClasses = sizeClasses[size];
  const currentVariantClasses = variantClasses[variant];

  // Handle error states gracefully
  if (!lifecycleStatus) {
    return (
      <div className={`${currentSizeClasses.container} ${currentVariantClasses} bg-gray-50 border-gray-200 ${className}`}>
        <div className={`${currentSizeClasses.message} text-gray-500`}>
          {t('dashboard.status.unknown', 'Unknown')}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        ${currentSizeClasses.container}
        ${currentVariantClasses}
        ${lifecycleStatus.bgColor}
        ${lifecycleStatus.borderColor}
        transition-all duration-200
        ${className}
      `}
      role="status"
      aria-live={lifecycleStatus.phase === 'scheduled' ? 'polite' : 'off'}
    >
      {/* Main status message */}
      <div className={`${currentSizeClasses.message} ${lifecycleStatus.color} leading-tight`}>
        {lifecycleStatus.message}
      </div>

      {/* Sub-message for additional context */}
      {lifecycleStatus.subMessage && variant !== 'compact' && (
        <div className={`${currentSizeClasses.subMessage} text-gray-600 mt-1 leading-tight`}>
          {lifecycleStatus.subMessage}
        </div>
      )}
    </div>
  );
};

export default StatusDisplay;

/**
 * Hook for getting real-time lifecycle status
 * Useful for components that need to react to status changes
 */
export const useLifecycleStatus = (
  activationDate?: string,
  expirationDate?: string,
  status?: string
) => {
  const { t } = useTranslation();
  const [lifecycleStatus, setLifecycleStatus] = useState(() =>
    getLifecycleStatus(activationDate || null, expirationDate || null, status, t)
  );

  useEffect(() => {
    const updateStatus = () => {
      try {
        const newStatus = getLifecycleStatus(activationDate || null, expirationDate || null, status, t);
        setLifecycleStatus(newStatus);
      } catch (error) {
        console.error('useLifecycleStatus: Error updating status', error);
      }
    };

    updateStatus();

    // Smart interval
    let interval: NodeJS.Timeout;
    if (lifecycleStatus.phase === 'scheduled' || lifecycleStatus.phase === 'active') {
      const intervalMs = lifecycleStatus.urgency === 'imminent' ? 30000 : 300000;
      interval = setInterval(updateStatus, intervalMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activationDate, expirationDate, status, lifecycleStatus.urgency, t]);

  return lifecycleStatus;
};
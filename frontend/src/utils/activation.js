/**
 * Utility functions for handling guide activation countdown and status
 * Similar to expiration.js but for scheduled activation timing
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatInIsraelTimezone } from './timezone';

/**
 * Check if a guide is pending activation (scheduled for future)
 * @param {string} activationDate - ISO date string
 * @returns {boolean} True if pending activation
 */
export const isPendingActivation = (activationDate) => {
  if (!activationDate) return false;
  return new Date(activationDate) > new Date();
};

/**
 * Check if a guide should be active now (activation time has passed)
 * @param {string} activationDate - ISO date string
 * @returns {boolean} True if should be active
 */
export const shouldBeActive = (activationDate) => {
  if (!activationDate) return true; // No activation date means immediate
  return new Date(activationDate) <= new Date();
};

/**
 * Calculate remaining time until activation
 * @param {string} activationDate - ISO date string
 * @param {Function} t - Translation function from react-i18next
 * @returns {Object} Object with remaining time info
 */
export const getRemainingTimeUntilActivation = (activationDate, t = null) => {
  if (!activationDate) {
    return { hasActivation: false, isPending: false, remaining: null };
  }

  // Get current time and activation in UTC for accurate comparison
  const now = new Date();
  const activation = new Date(activationDate);

  // Calculate difference in milliseconds
  const diffMs = activation.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      hasActivation: true,
      isPending: false,
      remaining: null,
      overdue: formatTimeAgo(Math.abs(diffMs), t)
    };
  }

  return {
    hasActivation: true,
    isPending: true,
    remaining: formatRemainingTime(diffMs, t),
    totalHours: Math.ceil(diffMs / (1000 * 60 * 60)),
    totalMinutes: Math.ceil(diffMs / (1000 * 60))
  };
};

/**
 * Format remaining time until activation for display
 * User requirement: <24h = hours, >24h = days
 * @param {number} ms - Milliseconds remaining
 * @param {Function} t - Translation function from react-i18next
 * @returns {string} Formatted time string
 */
const formatRemainingTime = (ms, t = null) => {
  // Fallback function for when translation is not available
  const translate = t || ((key, fallback) => fallback || key);

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.floor(totalDays / 7);

  // Less than 1 hour - show minutes
  if (totalHours < 1) {
    if (totalMinutes <= 5) {
      // Show seconds for last 5 minutes - use compact format
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      if (totalMinutes > 0) {
        return `${totalMinutes}${translate('time.abbreviations.m')} ${seconds}${translate('time.abbreviations.s')}`;
      }
      return `${seconds}${translate('time.abbreviations.s')}`;
    }
    const unit = totalMinutes === 1 ? translate('time.units.minute') : translate('time.units.minutes');
    return `${totalMinutes} ${unit}`;
  }

  // Less than 24 hours - show hours and minutes (user requirement)
  if (totalHours < 24) {
    const remainingMinutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (totalHours > 0 && remainingMinutes > 0) {
      const hourUnit = totalHours === 1 ? translate('time.units.hour') : translate('time.units.hours');
      const minuteUnit = remainingMinutes === 1 ? translate('time.units.minute') : translate('time.units.minutes');
      return translate('time.formats.hoursAndMinutes', {
        hours: totalHours,
        hourUnit: hourUnit,
        minutes: remainingMinutes,
        minuteUnit: minuteUnit
      });
    } else if (totalHours > 0) {
      const hourUnit = totalHours === 1 ? translate('time.units.hour') : translate('time.units.hours');
      return `${totalHours} ${hourUnit}`;
    } else {
      const minuteUnit = remainingMinutes === 1 ? translate('time.units.minute') : translate('time.units.minutes');
      return `${remainingMinutes} ${minuteUnit}`;
    }
  }

  // 24 hours or more - show days (user requirement)
  if (totalDays < 7) {
    const unit = totalDays === 1 ? translate('time.units.day') : translate('time.units.days');
    return `${totalDays} ${unit}`;
  }

  // 7 days or more - show weeks for better readability
  if (totalWeeks < 4) {
    const unit = totalWeeks === 1 ? translate('time.units.week') : translate('time.units.weeks');
    return `${totalWeeks} ${unit}`;
  }

  // 4+ weeks - show days for precision
  const unit = translate('time.units.days');
  return `${totalDays} ${unit}`;
};

/**
 * Format time ago for overdue activations
 * Using same smart formatting as formatRemainingTime
 * @param {number} ms - Milliseconds since activation time
 * @param {Function} t - Translation function from react-i18next
 * @returns {string} Formatted time string
 */
const formatTimeAgo = (ms, t = null) => {
  // Fallback function for when translation is not available
  const translate = t || ((key, fallback) => fallback || key);

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));

  // Less than 1 hour
  if (totalHours < 1) {
    const unit = totalMinutes === 1 ? translate('time.units.minute') : translate('time.units.minutes');
    return translate('time.formats.timeAgo', { time: totalMinutes, unit });
  }

  // Less than 24 hours
  if (totalHours < 24) {
    const unit = totalHours === 1 ? translate('time.units.hour') : translate('time.units.hours');
    return translate('time.formats.timeAgo', { time: totalHours, unit });
  }

  // 24 hours or more
  const unit = totalDays === 1 ? translate('time.units.day') : translate('time.units.days');
  return translate('time.formats.timeAgo', { time: totalDays, unit });
};

/**
 * Get activation status with color coding
 * @param {string} activationDate - ISO date string
 * @param {string} status - Guide status (draft, scheduled, published, etc.)
 * @param {Function} t - Translation function from react-i18next
 * @returns {Object} Status with color classes and text
 */
export const getActivationStatus = (activationDate, status = 'scheduled', t = null) => {
  // Handle non-scheduled statuses
  if (status === 'draft') {
    return {
      text: 'Draft',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      urgency: 'draft'
    };
  }

  if (status === 'published') {
    return {
      text: 'Active',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      urgency: 'active'
    };
  }

  if (status === 'expired') {
    return {
      text: 'Expired',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      urgency: 'expired'
    };
  }

  // Handle scheduled status with activation timing
  const timeInfo = getRemainingTimeUntilActivation(activationDate, t);

  if (!timeInfo.hasActivation) {
    return {
      text: 'No activation date',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      urgency: 'none'
    };
  }

  if (!timeInfo.isPending) {
    return {
      text: 'Should be active',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      urgency: 'overdue'
    };
  }

  // Determine urgency based on remaining time until activation
  const totalMinutes = timeInfo.totalMinutes;

  if (totalMinutes <= 60) { // Less than 1 hour
    return {
      text: timeInfo.remaining,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      urgency: 'imminent'
    };
  }

  if (totalMinutes <= 6 * 60) { // Less than 6 hours
    return {
      text: timeInfo.remaining,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      urgency: 'soon'
    };
  }

  // More than 6 hours remaining
  return {
    text: timeInfo.remaining,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    urgency: 'scheduled'
  };
};

/**
 * Format activation date for display
 * @param {string} activationDate - ISO date string
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatActivationDate = (activationDate, locale = 'en-US') => {
  if (!activationDate) return null;

  try {
    const date = new Date(activationDate);
    return formatInIsraelTimezone(date, locale, {
      weekday: 'short'
    });
  } catch (error) {
    console.error('Error formatting activation date:', error);
    return activationDate;
  }
};

/**
 * Hook for real-time activation countdown updates with smart intervals
 * @param {string} activationDate - ISO date string
 * @param {string} status - Guide status for optimization
 * @returns {Object} Real-time activation time info and status
 */
export const useRealTimeActivation = (activationDate, status = 'scheduled') => {
  // Use translation hook for localized time formatting
  const { t } = useTranslation();

  const [timeInfo, setTimeInfo] = useState(() => ({
    time: getRemainingTimeUntilActivation(activationDate, t),
    status: getActivationStatus(activationDate, status, t)
  }));

  useEffect(() => {
    // Don't update for non-scheduled statuses or if no activation date
    if (status !== 'scheduled' || !activationDate) {
      setTimeInfo({
        time: getRemainingTimeUntilActivation(activationDate, t),
        status: getActivationStatus(activationDate, status, t)
      });
      return;
    }

    const updateTime = () => {
      const newTime = getRemainingTimeUntilActivation(activationDate, t);
      const newStatus = getActivationStatus(activationDate, status, t);

      setTimeInfo({
        time: newTime,
        status: newStatus
      });
    };

    // Update immediately
    updateTime();

    // Smart interval based on remaining time
    let interval;
    const timeRemaining = getRemainingTimeUntilActivation(activationDate, t);

    if (!timeRemaining.isPending) {
      // No updates needed for overdue activations
      return;
    } else if (timeRemaining.totalMinutes <= 10) {
      // Update every 30 seconds for last 10 minutes
      interval = setInterval(updateTime, 30000);
    } else if (timeRemaining.totalMinutes <= 60) {
      // Update every minute for last hour
      interval = setInterval(updateTime, 60000);
    } else {
      // Update every 5 minutes for longer periods
      interval = setInterval(updateTime, 300000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activationDate, status]);

  return timeInfo;
};

/**
 * Get lifecycle-aware status message for production UI
 * Creates clear messages like "Will be published in 2 hours" or "Active, expires in 3 days"
 * @param {string} activationDate - ISO date string
 * @param {string} expirationDate - ISO date string
 * @param {string} status - Current guide status
 * @param {Function} t - Translation function from react-i18next
 * @returns {Object} Lifecycle status with message, color, and phase info
 */
export const getLifecycleStatus = (activationDate, expirationDate, status, t = null) => {
  const now = new Date();
  const activation = activationDate ? new Date(activationDate) : null;
  const expiration = expirationDate ? new Date(expirationDate) : null;

  // Fallback function for when translation is not available
  const translate = t || ((key, fallback) => fallback || key);

  // Handle draft status
  if (status === 'draft') {
    return {
      phase: 'draft',
      message: translate('createGuide.status.lifecycle.draft', 'Draft'),
      subMessage: null,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      urgency: 'none'
    };
  }

  // Handle archived status
  if (status === 'archived') {
    return {
      phase: 'archived',
      message: translate('createGuide.status.lifecycle.archived', 'Archived'),
      subMessage: null,
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      urgency: 'none'
    };
  }

  // Handle scheduled status (future activation)
  if (activation && activation > now) {
    const timeInfo = getRemainingTimeUntilActivation(activationDate, t);
    if (timeInfo.isPending) {
      return {
        phase: 'scheduled',
        message: translate('createGuide.status.lifecycle.willPublishIn', 'Will be published in {{time}}', {
          time: timeInfo.remaining
        }),
        subMessage: null,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        urgency: timeInfo.totalMinutes <= 60 ? 'imminent' : 'scheduled'
      };
    }
  }

  // Handle expired status
  if (expiration && expiration <= now) {
    const expiredMs = now.getTime() - expiration.getTime();
    const expiredAgo = formatTimeAgo(expiredMs, t);
    return {
      phase: 'expired',
      message: translate('createGuide.status.lifecycle.expiredAgo', 'Expired {{time}} ago', {
        time: expiredAgo
      }),
      subMessage: null,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      urgency: 'expired'
    };
  }

  // Handle active status with expiration
  if (expiration) {
    const expiresInMs = expiration.getTime() - now.getTime();
    const expiresIn = formatRemainingTime(expiresInMs, t);
    const totalHours = Math.floor(expiresInMs / (1000 * 60 * 60));

    return {
      phase: 'active',
      message: translate('createGuide.status.lifecycle.activeExpiresIn', 'Active, expires in {{time}}', {
        time: expiresIn
      }),
      subMessage: null,
      color: totalHours <= 24 ? 'text-amber-700' : 'text-green-700',
      bgColor: totalHours <= 24 ? 'bg-amber-50' : 'bg-green-50',
      borderColor: totalHours <= 24 ? 'border-amber-200' : 'border-green-200',
      urgency: totalHours <= 24 ? 'warning' : 'active'
    };
  }

  // Handle active status without expiration
  return {
    phase: 'active',
    message: translate('createGuide.status.lifecycle.activeNoExpiration', 'Active'),
    subMessage: null,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    urgency: 'active'
  };
};

/**
 * Get combined status for guides with both activation and expiration dates
 * @param {string} activationDate - ISO date string
 * @param {string} expirationDate - ISO date string
 * @param {string} status - Current guide status
 * @returns {Object} Combined status info
 */
export const getCombinedActivationExpirationStatus = (activationDate, expirationDate, status) => {
  const now = new Date();
  const activation = activationDate ? new Date(activationDate) : null;
  const expiration = expirationDate ? new Date(expirationDate) : null;

  // Determine the effective status based on timing
  if (activation && activation > now) {
    // Not yet activated - show countdown to activation
    return {
      phase: 'scheduled',
      primary: getActivationStatus(activationDate, 'scheduled'),
      secondary: null,
      message: 'Waiting for activation'
    };
  } else if (expiration && expiration <= now) {
    // Expired
    return {
      phase: 'expired',
      primary: {
        text: 'Expired',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        urgency: 'expired'
      },
      secondary: null,
      message: 'Guide has expired'
    };
  } else {
    // Currently active - show time until expiration
    return {
      phase: 'active',
      primary: {
        text: 'Active',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        urgency: 'active'
      },
      secondary: expiration ? {
        text: 'Expires in',
        // This would be calculated by expiration.js utilities
        urgency: 'expiring'
      } : null,
      message: 'Guide is currently active'
    };
  }
};
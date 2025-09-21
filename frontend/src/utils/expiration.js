/**
 * Utility functions for handling guide expiration
 */

import { useState, useEffect } from 'react';

/**
 * Check if a guide is expired
 * @param {string} expirationDate - ISO date string
 * @returns {boolean} True if expired
 */
export const isExpired = (expirationDate) => {
  if (!expirationDate) return false;
  return new Date(expirationDate) <= new Date();
};

/**
 * Calculate remaining time until expiration
 * @param {string} expirationDate - ISO date string
 * @returns {Object} Object with remaining time info
 */
export const getRemainingTime = (expirationDate) => {
  if (!expirationDate) {
    return { hasExpiration: false, isExpired: false, remaining: null };
  }

  // Get current time in Israeli timezone
  const now = new Date();
  const expiration = new Date(expirationDate);

  // Calculate difference in milliseconds
  const diffMs = expiration.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { 
      hasExpiration: true, 
      isExpired: true, 
      remaining: null,
      expiredAgo: formatTimeAgo(Math.abs(diffMs))
    };
  }

  return {
    hasExpiration: true,
    isExpired: false,
    remaining: formatRemainingTime(diffMs),
    totalHours: Math.ceil(diffMs / (1000 * 60 * 60)),
    totalMinutes: Math.ceil(diffMs / (1000 * 60))
  };
};

/**
 * Format remaining time for display
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Formatted time string
 */
const formatRemainingTime = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }
  
  if (minutes > 5) {
    return `${minutes}m`;
  }
  
  // Show seconds for last 5 minutes
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${minutes}m ${seconds}s`;
};

/**
 * Format time ago for expired items
 * @param {number} ms - Milliseconds since expiration
 * @returns {string} Formatted time string
 */
const formatTimeAgo = (ms) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  
  if (hours > 0) {
    return `${hours}h ago`;
  }
  
  return `${minutes}m ago`;
};

/**
 * Get expiration status with color coding - supports draft status
 * @param {string} expirationDate - ISO date string
 * @param {string} status - Guide status (draft, published, etc.)
 * @returns {Object} Status with color classes and text
 */
export const getExpirationStatus = (expirationDate, status = 'published') => {
  // Handle draft status - no expiration
  if (status === 'draft') {
    return {
      text: 'No expiration (Draft)',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      urgency: 'draft'
    };
  }

  // Normalize 'active' status to 'published' for expiration logic
  const normalizedStatus = status === 'active' ? 'published' : status;

  const timeInfo = getRemainingTime(expirationDate);
  
  if (!timeInfo.hasExpiration) {
    return {
      text: 'No expiration',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      urgency: 'none'
    };
  }
  
  if (timeInfo.isExpired) {
    return {
      text: timeInfo.expiredAgo,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      urgency: 'expired'
    };
  }
  
  // Determine urgency based on remaining time
  const totalMinutes = timeInfo.totalMinutes;
  
  if (totalMinutes <= 60) { // Less than 1 hour
    return {
      text: timeInfo.remaining,
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      urgency: 'critical'
    };
  }
  
  if (totalMinutes <= 6 * 60) { // Less than 6 hours
    return {
      text: timeInfo.remaining,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      urgency: 'warning'
    };
  }
  
  // More than 6 hours remaining
  return {
    text: timeInfo.remaining,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    urgency: 'safe'
  };
};

/**
 * Format expiration date for display
 * @param {string} expirationDate - ISO date string
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatExpirationDate = (expirationDate, locale = 'en-US') => {
  if (!expirationDate) return null;

  try {
    const date = new Date(expirationDate);
    const isRTL = locale.startsWith('he');

    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: !isRTL,
      timeZone: 'Asia/Jerusalem'  // Always use Israeli timezone
    }).format(date);
  } catch (error) {
    console.error('Error formatting expiration date:', error);
    return expirationDate;
  }
};

/**
 * Hook for real-time remaining time updates with smart intervals
 * @param {string} expirationDate - ISO date string
 * @param {string} status - Guide status for optimization
 * @returns {Object} Real-time remaining time info and status
 */
export const useRealTimeExpiration = (expirationDate, status = 'published') => {
  // Normalize 'active' status to 'published' for expiration logic
  const normalizedStatus = status === 'active' ? 'published' : status;

  const [timeInfo, setTimeInfo] = useState(() => ({
    time: getRemainingTime(expirationDate),
    status: getExpirationStatus(expirationDate, normalizedStatus)
  }));

  useEffect(() => {
    // Don't update for drafts or if no expiration
    if (normalizedStatus === 'draft' || !expirationDate) {
      setTimeInfo({
        time: getRemainingTime(expirationDate),
        status: getExpirationStatus(expirationDate, normalizedStatus)
      });
      return;
    }
    
    const updateTime = () => {
      const newTime = getRemainingTime(expirationDate);
      const newStatus = getExpirationStatus(expirationDate, normalizedStatus);

      setTimeInfo({
        time: newTime,
        status: newStatus
      });
    };
    
    // Update immediately
    updateTime();
    
    // Smart interval based on remaining time
    let interval;
    const timeRemaining = getRemainingTime(expirationDate);
    
    if (timeRemaining.isExpired) {
      // No updates needed for expired guides
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
  }, [expirationDate, normalizedStatus]);
  
  return timeInfo;
};
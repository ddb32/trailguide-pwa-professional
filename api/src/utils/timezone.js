/**
 * Backend timezone utility functions for TrailGuide PWA
 * Handles date processing in Israel timezone on the server side
 */

// Israel timezone
const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Get current date/time in Israel timezone
 * @returns {Date} Current date in Israel timezone
 */
const nowInIsrael = () => {
  // Use Intl.DateTimeFormat to get current time in Israel timezone
  const now = new Date();
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }));
  return israelTime;
};

/**
 * Convert a date to Israel timezone preserving the absolute moment
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date object representing the same moment in Israel timezone
 */
const toIsraelTimezone = (date) => {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;

  // Get the date string as it would appear in Israel timezone
  const israelDateString = dateObj.toLocaleString('sv-SE', { timeZone: ISRAEL_TIMEZONE });
  return new Date(israelDateString);
};

/**
 * Format date for Israel timezone display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string in Israel timezone
 */
const formatIsraelDate = (date) => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  return dateObj.toLocaleString('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Get PostgreSQL NOW() function adjusted for Israel timezone
 * This returns a SQL snippet that can be used in queries
 * @returns {string} SQL expression for current time in Israel timezone
 */
const getIsraelNowSQL = () => {
  return "NOW() AT TIME ZONE 'Asia/Jerusalem'";
};

/**
 * Validate date ranges for activation and expiration
 * @param {Date} activationDate - When guide becomes active
 * @param {Date} expirationDate - When guide expires
 * @returns {Object} Validation result
 */
const validateDateRange = (activationDate, expirationDate) => {
  const now = new Date();
  const errors = [];

  if (activationDate) {
    // Allow scheduling up to 30 days in the future
    const maxActivation = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (activationDate > maxActivation) {
      errors.push('Activation date cannot be more than 30 days in the future');
    }
  }

  if (expirationDate) {
    // Check if expiration is in the past (allow 1 minute grace period)
    if (expirationDate.getTime() < now.getTime() - 60000) {
      errors.push('Expiration date cannot be in the past');
    }
  }

  if (activationDate && expirationDate) {
    if (activationDate >= expirationDate) {
      errors.push('Activation date must be before expiration date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Parse date from frontend and ensure it's in the correct format
 * Frontend sends dates in ISO format but we need to ensure they're properly handled
 * @param {string} dateString - ISO date string from frontend
 * @returns {Date|null} Parsed date or null if invalid
 */
const parseFrontendDate = (dateString) => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.error('Error parsing frontend date:', error);
    return null;
  }
};

/**
 * Log timezone-aware timestamp for debugging
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
const logWithTimezone = (message, data = {}) => {
  const israelTime = nowInIsrael();
  console.log(`[${formatIsraelDate(israelTime)} IST] ${message}`, data);
};

module.exports = {
  ISRAEL_TIMEZONE,
  nowInIsrael,
  toIsraelTimezone,
  formatIsraelDate,
  getIsraelNowSQL,
  validateDateRange,
  parseFrontendDate,
  logWithTimezone
};
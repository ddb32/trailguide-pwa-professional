/**
 * Timezone utility functions for TrailGuide PWA
 * Handles conversion between browser timezone and Israel timezone (Asia/Jerusalem)
 */

// Israel timezone
export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Convert a date to Israel timezone and return formatted string for datetime-local input
 * @param {Date} date - The date to convert
 * @returns {string} - Formatted string for datetime-local input (YYYY-MM-DDTHH:MM)
 */
export const toIsraelDateTimeLocal = (date) => {
  if (!date || isNaN(date.getTime())) return '';

  console.log('🕐 Converting date to Israel timezone:', {
    inputDate: date.toISOString(),
    inputLocalTime: date.toString()
  });

  // Use Intl.DateTimeFormat with formatToParts for accurate timezone conversion
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const partsMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const result = `${partsMap.year}-${partsMap.month}-${partsMap.day}T${partsMap.hour}:${partsMap.minute}`;

  console.log('🕐 Israel timezone conversion result:', {
    parts: partsMap,
    formatted: result,
    verification: new Date().toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE })
  });

  return result;
};

/**
 * Convert datetime-local input value to Israel timezone Date object
 * @param {string} dateTimeLocalValue - Value from datetime-local input (YYYY-MM-DDTHH:MM)
 * @returns {Date} - Date object in Israel timezone
 */
export const fromIsraelDateTimeLocal = (dateTimeLocalValue) => {
  if (!dateTimeLocalValue) return null;

  console.log('🕐 Converting from Israel datetime-local:', dateTimeLocalValue);

  // Parse the datetime-local value
  const [datePart, timePart] = dateTimeLocalValue.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  console.log('🕐 Parsed components:', { year, month, day, hours, minutes });

  // Create a date string that represents the Israel time
  // We'll use a technique to create the date as if it were in Israel timezone
  const israelTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Use a reverse calculation: create what the UTC time would be for this Israel time
  // First, create a temporary date in UTC
  const tempDate = new Date(`${israelTimeString}Z`);

  // Get the Israel time for this UTC date
  const israelFormattedTime = tempDate.toLocaleString('sv-SE', { timeZone: ISRAEL_TIMEZONE });

  // Calculate the difference between what we want and what we got
  const targetTime = new Date(israelTimeString);
  const actualIsraelTime = new Date(israelFormattedTime);
  const diff = targetTime.getTime() - actualIsraelTime.getTime();

  // Apply the difference to get the correct UTC time
  const correctUtcTime = tempDate.getTime() + diff;
  const result = new Date(correctUtcTime);

  console.log('🕐 Israel datetime conversion:', {
    input: dateTimeLocalValue,
    israelTimeString,
    tempUTC: tempDate.toISOString(),
    israelFormatted: israelFormattedTime,
    diff,
    resultUTC: result.toISOString(),
    resultIsraelTime: result.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE })
  });

  return result;
};

/**
 * Get current date/time in Israel timezone
 * @returns {Date} - Current date in Israel timezone
 */
export const nowInIsrael = () => {
  const now = new Date();
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }));
  return israelTime;
};

/**
 * Get current date/time in Israel timezone formatted for datetime-local input
 * @returns {string} - Current Israel time formatted for datetime-local input
 */
export const nowInIsraelForInput = () => {
  const now = new Date();
  console.log('🕐 Getting current Israel time for input:', {
    browserTime: now.toString(),
    browserUTC: now.toISOString(),
    browserLocal: now.toLocaleString(),
    israelTime: now.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE })
  });

  const result = toIsraelDateTimeLocal(now);
  console.log('🕐 Current Israel time for input result:', result);
  return result;
};

/**
 * Format date for display in Israel timezone
 * @param {Date} date - Date to format
 * @param {string} locale - Locale for formatting ('he-IL' or 'en-US')
 * @param {Object} options - Additional Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export const formatInIsraelTimezone = (date, locale = 'he-IL', options = {}) => {
  if (!date || isNaN(date.getTime())) return '';

  const defaultOptions = {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en-US'
  };

  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(date);
};

/**
 * Get timezone offset for Israel at a specific date (handles DST)
 * @param {Date} date - Date to check offset for
 * @returns {number} - Offset in minutes
 */
const getIsraelTimezoneOffset = (date) => {
  // Create date formatted in Israel timezone
  const israelTime = new Date(date.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }));
  const utcTime = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));

  // Calculate offset in minutes
  return (israelTime.getTime() - utcTime.getTime()) / 60000;
};

/**
 * Check if a date is in daylight saving time in Israel
 * @param {Date} date - Date to check
 * @returns {boolean} - True if in DST
 */
export const isIsraelDST = (date) => {
  // Israel DST typically runs from late March to late October
  // This is a simplified check - actual dates vary by year
  const month = date.getMonth();
  const day = date.getDate();

  // Rough approximation: DST from April through September
  return month >= 3 && month <= 9;
};

/**
 * Convert any date to Israel timezone preserving the absolute moment
 * @param {Date} date - Date to convert
 * @returns {Date} - Date object representing the same moment in Israel timezone
 */
export const toIsraelTimezone = (date) => {
  if (!date || isNaN(date.getTime())) return null;

  // Get the date string as it would appear in Israel timezone
  const israelDateString = date.toLocaleString('sv-SE', { timeZone: ISRAEL_TIMEZONE });
  return new Date(israelDateString);
};

/**
 * Validate that a scheduled date is reasonable (not too far in past/future)
 * @param {Date} date - Date to validate
 * @returns {Object} - Validation result { isValid: boolean, error?: string }
 */
export const validateScheduledDate = (date) => {
  if (!date || isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date' };
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Check if date is in the past (allow 1 minute grace period)
  if (diffMs < -60000) {
    return { isValid: false, error: 'Date cannot be in the past' };
  }

  // Check if date is too far in the future (30 days)
  if (diffDays > 30) {
    return { isValid: false, error: 'Date cannot be more than 30 days in the future' };
  }

  return { isValid: true };
};
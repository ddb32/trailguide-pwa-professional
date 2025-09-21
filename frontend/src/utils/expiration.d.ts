/**
 * TypeScript declarations for expiration utilities
 * Provides expiration date handling and status checking
 */

export type ExpirationStatus = 'active' | 'expired' | 'expiring_soon' | 'no_expiration';

export interface ExpirationInfo {
  status: ExpirationStatus;
  daysRemaining: number | null;
  hoursRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  expirationDate: Date | null;
}

/**
 * Get expiration status for an event
 */
export declare function getExpirationStatus(
  expirationDate: string | Date | null,
  warningDays?: number
): ExpirationStatus;

/**
 * Get detailed expiration information
 */
export declare function getExpirationInfo(
  expirationDate: string | Date | null,
  warningDays?: number
): ExpirationInfo;

/**
 * Format expiration date for display
 */
export declare function formatExpirationDate(
  expirationDate: string | Date | null,
  locale?: string
): string;

/**
 * Check if an event is expired
 */
export declare function isExpired(expirationDate: string | Date | null): boolean;

/**
 * Check if an event is expiring soon
 */
export declare function isExpiringSoon(
  expirationDate: string | Date | null,
  warningDays?: number
): boolean;

/**
 * Status information returned by expiration hooks
 */
export interface ExpirationStatusInfo {
  text: string;
  color: string;
  bgColor?: string;
  borderColor?: string;
  urgency: 'draft' | 'none' | 'safe' | 'warning' | 'critical' | 'expired';
}

/**
 * Time information returned by expiration hooks
 */
export interface ExpirationTimeInfo {
  hasExpiration: boolean;
  isExpired: boolean;
  remaining: string | null;
  expiredAgo?: string;
  totalHours?: number;
  totalMinutes?: number;
}

/**
 * Real-time expiration tracking hook
 */
export declare function useRealTimeExpiration(
  expirationDate: string | Date | null,
  status?: string
): {
  time: ExpirationTimeInfo;
  status: ExpirationStatusInfo;
};
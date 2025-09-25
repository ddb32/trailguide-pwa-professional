/**
 * Type definitions for activation utility functions
 */

export interface ActivationTimeInfo {
  hasActivation: boolean;
  isPending: boolean;
  remaining: string | null;
  overdue?: string;
  totalHours?: number;
  totalMinutes?: number;
}

export interface ActivationStatus {
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
  urgency: 'none' | 'draft' | 'active' | 'expired' | 'overdue' | 'imminent' | 'soon' | 'scheduled';
}

export interface LifecycleStatusResult {
  phase: 'draft' | 'scheduled' | 'active' | 'expired' | 'archived';
  message: string;
  subMessage: string | null;
  color: string;
  bgColor: string;
  borderColor: string;
  urgency: 'none' | 'draft' | 'active' | 'expired' | 'overdue' | 'imminent' | 'soon' | 'scheduled' | 'warning';
}

export interface RealTimeActivationInfo {
  time: ActivationTimeInfo;
  status: ActivationStatus;
}

export function isPendingActivation(activationDate: string): boolean;
export function shouldBeActive(activationDate: string): boolean;
export function getRemainingTimeUntilActivation(activationDate: string, t?: (key: string, fallback?: string, options?: any) => string): ActivationTimeInfo;
export function getActivationStatus(activationDate: string, status?: string, t?: (key: string, fallback?: string, options?: any) => string): ActivationStatus;
export function formatActivationDate(activationDate: string, locale?: string): string | null;
export function useRealTimeActivation(activationDate: string, status?: string): RealTimeActivationInfo;
export function getLifecycleStatus(
  activationDate: string | null,
  expirationDate: string | null,
  status: string,
  t?: (key: string, fallback?: string, options?: any) => string
): LifecycleStatusResult;
export function getCombinedActivationExpirationStatus(
  activationDate: string,
  expirationDate: string,
  status: string
): any;
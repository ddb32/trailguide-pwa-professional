/**
 * TypeScript declarations for useCopyLink hook
 * Provides copy-to-clipboard functionality with user feedback
 */

export interface UseCopyLinkReturn {
  copyLink: (url: string) => Promise<boolean>;
  copyGuideLink: (guideId: string) => Promise<boolean>;
  isCopying: boolean;
  copyStatus: 'idle' | 'copying' | 'success' | 'error';
  lastCopiedUrl: string | null;
}

/**
 * Custom hook for copying links to clipboard with user feedback
 * Provides copy functionality with loading states and success/error handling
 */
export declare function useCopyLink(): UseCopyLinkReturn;
/**
 * TypeScript declarations for useLanguageDirection hook
 * Provides comprehensive type safety for RTL/LTR language direction utilities
 */

export interface ConditionalClass {
  // Margin utilities
  ml: (value: string | number) => string;
  mr: (value: string | number) => string;
  
  // Padding utilities  
  pl: (value: string | number) => string;
  pr: (value: string | number) => string;
  
  // Text alignment
  textLeft: string;
  textRight: string;
  textAlign: string;
  
  // Flexbox direction
  flexRow: string;
  flexRowReverse: string;
  
  // Float utilities
  floatLeft: string;
  floatRight: string;
  
  // Border radius
  roundedL: string;
  roundedR: string;
}

export interface LanguageDirectionReturn {
  direction: 'rtl' | 'ltr';
  isRTL: boolean;
  isLTR: boolean;
  language: string;
  conditionalClass: ConditionalClass;
  languageClasses: string;
  
  // Helper functions
  getSpacingClass: (property: string, value: string | number) => string;
  getIconDirection: (iconName: string) => string;
}

/**
 * Custom hook for managing language direction (RTL/LTR) in TrailGuide PWA
 * Provides direction utilities for Hebrew RTL and English LTR support
 */
export declare function useLanguageDirection(): LanguageDirectionReturn;
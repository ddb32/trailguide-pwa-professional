import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

/**
 * Custom hook for managing language direction (RTL/LTR) in TrailGuide PWA
 * Provides direction utilities for Hebrew RTL and English LTR support
 */
export function useLanguageDirection() {
  const { i18n } = useTranslation();

  const direction = useMemo(() => {
    // Hebrew and Arabic are RTL languages
    const rtlLanguages = ['he', 'ar', 'fa', 'ur'];
    return rtlLanguages.includes(i18n.language) ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const isRTL = useMemo(() => direction === 'rtl', [direction]);
  const isLTR = useMemo(() => direction === 'ltr', [direction]);

  // Helper functions for conditional styling
  const conditionalClass = useMemo(() => ({
    // Margin utilities
    ml: (value) => isRTL ? `mr-${value}` : `ml-${value}`,
    mr: (value) => isRTL ? `ml-${value}` : `mr-${value}`,
    
    // Padding utilities  
    pl: (value) => isRTL ? `pr-${value}` : `pl-${value}`,
    pr: (value) => isRTL ? `pl-${value}` : `pr-${value}`,
    
    // Text alignment
    textLeft: isRTL ? 'text-right' : 'text-left',
    textRight: isRTL ? 'text-left' : 'text-right',
    
    // Flexbox direction
    flexRow: isRTL ? 'flex-row-reverse' : 'flex-row',
    flexRowReverse: isRTL ? 'flex-row' : 'flex-row-reverse',
    
    // Float utilities
    floatLeft: isRTL ? 'float-right' : 'float-left',
    floatRight: isRTL ? 'float-left' : 'float-right',
    
    // Border radius (for consistent UI)
    roundedL: isRTL ? 'rounded-r' : 'rounded-l',
    roundedR: isRTL ? 'rounded-l' : 'rounded-r',
  }), [isRTL]);

  // Language-specific class names
  const languageClasses = useMemo(() => {
    const baseClasses = ['font-heebo'];
    
    if (isRTL) {
      baseClasses.push('rtl', 'text-right');
    } else {
      baseClasses.push('ltr', 'text-left');
    }
    
    return baseClasses.join(' ');
  }, [isRTL]);

  return {
    direction,
    isRTL,
    isLTR,
    language: i18n.language,
    conditionalClass,
    languageClasses,
    
    // Helper functions
    getSpacingClass: (property, value) => {
      const spacingMap = {
        'margin-left': isRTL ? 'margin-right' : 'margin-left',
        'margin-right': isRTL ? 'margin-left' : 'margin-right',
        'padding-left': isRTL ? 'padding-right' : 'padding-left', 
        'padding-right': isRTL ? 'padding-left' : 'padding-right',
      };
      
      return spacingMap[property] || property;
    },
    
    // Icon direction helper (for arrows, etc.)
    getIconDirection: (iconName) => {
      const directionalIcons = {
        'arrow-left': isRTL ? 'arrow-right' : 'arrow-left',
        'arrow-right': isRTL ? 'arrow-left' : 'arrow-right',
        'chevron-left': isRTL ? 'chevron-right' : 'chevron-left',
        'chevron-right': isRTL ? 'chevron-left' : 'chevron-right',
      };
      
      return directionalIcons[iconName] || iconName;
    }
  };
}
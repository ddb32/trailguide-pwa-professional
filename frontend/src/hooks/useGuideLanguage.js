import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook for managing language preferences in ViewGuide component
 * Implements Hebrew-first approach with per-guide language persistence
 * 
 * @param {string} guideId - Unique identifier for the guide to enable per-guide language persistence
 */
export const useGuideLanguage = (guideId) => {
  const { i18n } = useTranslation();

  // Generate guide-specific localStorage key
  const getGuideLanguageKey = (id) => `guide_language_${id}`;

  // Hebrew-first default - always default to Hebrew for end-users
  const getDefaultLanguage = () => 'he';

  // Initialize language on mount
  useEffect(() => {
    if (!guideId) return; // Don't initialize without guideId
    
    const guideLanguageKey = getGuideLanguageKey(guideId);
    
    // Check if user has made a language choice for this specific guide
    const savedLanguage = localStorage.getItem(guideLanguageKey);
    
    if (savedLanguage && (savedLanguage === 'he' || savedLanguage === 'en')) {
      // Use saved preference for this guide
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage);
      }
    } else {
      // No saved preference - use Hebrew-first default
      const defaultLanguage = getDefaultLanguage();
      if (i18n.language !== defaultLanguage) {
        i18n.changeLanguage(defaultLanguage);
      }
      // Store Hebrew as the initial language for this guide
      localStorage.setItem(guideLanguageKey, defaultLanguage);
    }
  }, [i18n, guideId]);

  // Save language choice to localStorage with guide-specific key
  const setGuideLanguage = (language) => {
    if (!guideId) return;
    
    const guideLanguageKey = getGuideLanguageKey(guideId);
    localStorage.setItem(guideLanguageKey, language);
    i18n.changeLanguage(language);
  };

  // Clear language preference for this specific guide
  const clearGuideLanguage = () => {
    if (!guideId) return;
    
    const guideLanguageKey = getGuideLanguageKey(guideId);
    localStorage.removeItem(guideLanguageKey);
    
    // Reset to Hebrew default
    const defaultLanguage = getDefaultLanguage();
    i18n.changeLanguage(defaultLanguage);
    localStorage.setItem(guideLanguageKey, defaultLanguage);
  };

  // Get current language preference for this guide (for debugging/testing)
  const getGuideLanguagePreference = () => {
    if (!guideId) return null;
    
    const guideLanguageKey = getGuideLanguageKey(guideId);
    return localStorage.getItem(guideLanguageKey);
  };

  return {
    currentLanguage: i18n.language,
    setGuideLanguage,
    clearGuideLanguage,
    getGuideLanguagePreference,
    defaultLanguage: getDefaultLanguage(),
  };
};
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EventPreviewData, EventFormData, CreateStepData } from '@/types/events';

interface UseEventPreviewResult {
  isPreviewOpen: boolean;
  previewData: EventPreviewData;
  openPreview: (formData: EventFormData) => void;
  closePreview: () => void;
  validateEventData: (formData: EventFormData) => {
    isValid: boolean;
    errors: string[];
  };
}

export const useEventPreview = (): UseEventPreviewResult => {
  const { t } = useTranslation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<EventFormData | null>(null);

  const validateEventData = useCallback((formData: EventFormData) => {
    const errors: string[] = [];

    // Validate event name
    if (!formData.event_name?.trim()) {
      errors.push(t('createGuide.validation.eventNameRequired'));
    } else if (formData.event_name.trim().length > 255) {
      errors.push(t('createGuide.validation.eventNameTooLong'));
    }

    // Validate expiration date
    if (!formData.expiration_date) {
      errors.push(t('createGuide.validation.expirationDateRequired'));
    } else {
      const expirationDate = new Date(formData.expiration_date);
      const now = new Date();
      if (expirationDate <= now) {
        errors.push(t('createGuide.validation.expirationDatePast'));
      }
    }

    // Validate steps
    if (!formData.steps || formData.steps.length === 0) {
      errors.push(t('createGuide.validation.stepsRequired'));
    } else {
      formData.steps.forEach((step, index) => {
        if (!step.description?.trim()) {
          errors.push(`שלב ${index + 1}: ${t('createGuide.validation.stepDescriptionRequired')}`);
        } else if (step.description.trim().length > 1000) {
          errors.push(`שלב ${index + 1}: ${t('createGuide.validation.stepDescriptionTooLong')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [t]);

  const sanitizeStepData = useCallback((steps: CreateStepData[]): CreateStepData[] => {
    return steps
      .filter(step => step.description?.trim()) // Remove empty steps
      .map((step, index) => ({
        step_order: index + 1,
        description: step.description.trim(),
        image_url: step.image_url || undefined,
        image_alt: step.image_alt?.trim() || undefined
      }))
      .sort((a, b) => a.step_order - b.step_order); // Ensure proper ordering
  }, []);

  const previewData = useMemo((): EventPreviewData => {
    if (!currentFormData) {
      return {
        event_name: '',
        steps: [],
        isValid: false,
        validationErrors: ['אין נתונים לתצוגה מקדימה']
      };
    }

    const validation = validateEventData(currentFormData);
    const sanitizedSteps = validation.isValid 
      ? sanitizeStepData(currentFormData.steps) 
      : [];

    return {
      event_name: currentFormData.event_name.trim(),
      steps: sanitizedSteps,
      isValid: validation.isValid,
      validationErrors: validation.errors
    };
  }, [currentFormData, validateEventData, sanitizeStepData]);

  const openPreview = useCallback((formData: EventFormData) => {
    // Basic security validation - prevent XSS
    const sanitizedFormData: EventFormData = {
      event_name: formData.event_name?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim() || '',
      expiration_date: formData.expiration_date,
      steps: formData.steps.map(step => ({
        ...step,
        description: step.description?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim() || '',
        image_alt: step.image_alt?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim() || undefined
      }))
    };

    setCurrentFormData(sanitizedFormData);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    // Don't clear currentFormData immediately to allow for smooth closing animation
    setTimeout(() => {
      setCurrentFormData(null);
    }, 300);
  }, []);

  return {
    isPreviewOpen,
    previewData,
    openPreview,
    closePreview,
    validateEventData
  };
};
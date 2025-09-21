import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';

const FormValidation = ({ 
  errors = {},
  warnings = {},
  className = ''
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();

  // Filter to only show form-level errors/warnings (not field-specific ones)
  const formLevelErrors = Object.entries(errors).filter(([key, value]) => 
    value && (key === 'steps' || key === 'form')
  );
  
  const formLevelWarnings = Object.entries(warnings).filter(([key, value]) => 
    value && (key === 'form')
  );

  const errorCount = formLevelErrors.length;
  const warningCount = formLevelWarnings.length;

  if (errorCount === 0 && warningCount === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Summary */}
      {errorCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-red-900 mb-2">
                {errorCount === 1 
                  ? t('validation.singleError') 
                  : t('validation.multipleErrors', { count: errorCount })
                }
              </h4>
              <ul className="space-y-1 text-sm text-red-800">
                {formLevelErrors.map(([field, error]) => (
                  <li key={field} className={`flex items-start space-x-2 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
                    <span className="text-red-500 font-medium">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warning Summary */}
      {warningCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-amber-900 mb-2">
                {warningCount === 1 
                  ? t('validation.singleWarning') 
                  : t('validation.multipleWarnings', { count: warningCount })
                }
              </h4>
              <ul className="space-y-1 text-sm text-amber-800">
                {formLevelWarnings.map(([field, warning]) => (
                  <li key={field} className={`flex items-start space-x-2 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
                    <span className="text-amber-500 font-medium">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FieldError = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div className={`flex items-center space-x-2 text-red-600 text-sm mt-1 ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  );
};

const FieldWarning = ({ warning, className = '' }) => {
  if (!warning) return null;

  return (
    <div className={`flex items-center space-x-2 text-amber-600 text-sm mt-1 ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <span>{warning}</span>
    </div>
  );
};

const FieldSuccess = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`flex items-center space-x-2 text-green-600 text-sm mt-1 ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
      <span>{message}</span>
    </div>
  );
};

// Validation hook for form fields
export const useFormValidation = (formData, steps = []) => {
  const { t } = useTranslation();
  
  const validateField = (field, value) => {
    switch (field) {
      case 'eventName':
        if (!value || !value.trim()) {
          return t('createGuide.validation.eventNameRequired');
        }
        if (value.length > 100) {
          return t('createGuide.validation.eventNameTooLong');
        }
        return null;


      case 'location':
        if (value && value.length > 200) {
          return t('createGuide.form.validation.locationTooLong');
        }
        return null;

      default:
        return null;
    }
  };

  const getFieldWarning = (field, value) => {
    switch (field) {
      case 'location':
        if (!value || !value.trim()) {
          return t('validation.warnings.noLocation');
        }
        return null;

      case 'coverImage':
        if (!value) {
          return t('validation.warnings.noCoverImage');
        }
        return null;

      default:
        return null;
    }
  };

  const errors = {};
  const warnings = {};

  // Validate basic form fields
  Object.keys(formData).forEach(field => {
    const error = validateField(field, formData[field]);
    const warning = getFieldWarning(field, formData[field]);
    
    if (error) errors[field] = error;
    if (warning) warnings[field] = warning;
  });

  // Validate steps
  if (steps.length === 0) {
    errors.steps = t('createGuide.validation.stepsRequired');
  } else {
    steps.forEach((step, index) => {
      if (!step.description || !step.description.trim()) {
        errors[`step_${index}_description`] = t('createGuide.validation.stepDescriptionRequired');
      } else if (step.description.length > 1000) {
        errors[`step_${index}_description`] = t('createGuide.validation.stepDescriptionTooLong');
      }

      if (!step.image) {
        warnings[`step_${index}_image`] = t('validation.warnings.stepNoImage', { stepNumber: index + 1 });
      }
    });
  }

  const isValid = Object.keys(errors).length === 0;
  const hasWarnings = Object.keys(warnings).length > 0;

  return {
    errors,
    warnings,
    isValid,
    hasWarnings,
    validateField,
    getFieldWarning
  };
};

FormValidation.FieldError = FieldError;
FormValidation.FieldWarning = FieldWarning;
FormValidation.FieldSuccess = FieldSuccess;

export default FormValidation;
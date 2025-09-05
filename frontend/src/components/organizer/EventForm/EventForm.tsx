import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Button } from '@/components/common/Button/Button';
import { PreviewModal } from '@/components/organizer/PreviewModal/PreviewModal';
import { useEventPreview } from '@/hooks/useEventPreview';
import { EventFormData, CreateStepData } from '@/types/events';

interface EventFormProps {
  initialData?: EventFormData;
  onSave?: (data: EventFormData) => Promise<void>;
  onPublish?: (data: EventFormData) => Promise<void>;
}

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSave,
  onPublish
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const { isPreviewOpen, previewData, openPreview, closePreview, validateEventData } = useEventPreview();
  
  const [formData, setFormData] = useState<EventFormData>({
    event_name: initialData?.event_name || '',
    expiration_date: initialData?.expiration_date || '',
    steps: initialData?.steps || []
  });

  // Update formData when initialData changes (for sample data loading)
  useEffect(() => {
    if (initialData) {
      setFormData({
        event_name: initialData.event_name || '',
        expiration_date: initialData.expiration_date || '',
        steps: initialData.steps || []
      });
      // Auto-advance to step 2 if we have sample data with steps
      if (initialData.steps && initialData.steps.length > 0) {
        setCurrentStep(2);
      }
    }
  }, [initialData]);
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = useCallback((field: keyof EventFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Real-time validation for better UX
    if (field === 'event_name' && value.trim() && value.trim().length > 255) {
      setErrors(prev => ({
        ...prev,
        event_name: t('createGuide.validation.eventNameTooLong')
      }));
    }
    
    if (field === 'expiration_date' && value) {
      const expirationDate = new Date(value);
      const now = new Date();
      if (expirationDate <= now) {
        setErrors(prev => ({
          ...prev,
          expiration_date: t('createGuide.validation.expirationDatePast')
        }));
      }
    }
  }, [errors, t]);

  const handleStepChange = useCallback((stepIndex: number, field: keyof CreateStepData, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === stepIndex ? { ...step, [field]: value } : step
      )
    }));
  }, []);

  const addStep = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          step_order: prev.steps.length + 1,
          description: '',
          image_url: '',
          image_alt: ''
        }
      ]
    }));
  }, []);

  const removeStep = useCallback((stepIndex: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, index) => index !== stepIndex)
        .map((step, index) => ({ ...step, step_order: index + 1 }))
    }));
  }, []);

  const handlePreview = useCallback(() => {
    const validation = validateEventData(formData);
    if (!validation.isValid) {
      // Show validation errors
      const newErrors: Record<string, string> = {};
      validation.errors.forEach((error, index) => {
        newErrors[`validation_${index}`] = error;
      });
      setErrors(newErrors);
      return;
    }
    
    openPreview(formData);
  }, [formData, validateEventData, openPreview]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    setIsLoading(true);
    try {
      await onSave(formData);
      // Show success message
    } catch (error) {
      console.error('Save error:', error);
      setErrors({ general: t('errors.generic') });
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave, t]);

  const handlePublish = useCallback(async () => {
    if (!onPublish) return;
    
    const validation = validateEventData(formData);
    if (!validation.isValid) {
      setErrors({ general: t('errors.pleaseFixErrors') });
      return;
    }
    
    setIsLoading(true);
    try {
      await onPublish(formData);
      // Show success message and redirect
    } catch (error) {
      console.error('Publish error:', error);
      setErrors({ general: t('errors.generic') });
    } finally {
      setIsLoading(false);
    }
  }, [formData, onPublish, validateEventData, t]);

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 font-hebrew">
        {t('createGuide.step1.title')}
      </h2>

      {/* Progress Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 font-hebrew">
          📝 שלב 1 מתוך 3: בואו נתחיל עם פרטי האירוע הבסיסיים
        </p>
      </div>
      
      <div>
        <label htmlFor="event_name" className="block text-sm font-medium text-gray-700 mb-2 font-hebrew">
          {t('createGuide.step1.eventName')}
        </label>
        <input
          type="text"
          id="event_name"
          value={formData.event_name}
          onChange={(e) => handleInputChange('event_name', e.target.value)}
          placeholder={t('createGuide.step1.eventNamePlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-hebrew"
          dir={isRTL ? 'rtl' : 'ltr'}
        />
        {errors.event_name && (
          <p className="text-red-600 text-sm mt-1 font-hebrew">{errors.event_name}</p>
        )}
      </div>

      <div>
        <label htmlFor="expiration_date" className="block text-sm font-medium text-gray-700 mb-2 font-hebrew">
          {t('createGuide.step1.expirationDate')}
        </label>
        <input
          type="datetime-local"
          id="expiration_date"
          value={formData.expiration_date}
          onChange={(e) => handleInputChange('expiration_date', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          min={new Date().toISOString().slice(0, 16)}
        />
        <p className="text-sm text-gray-500 mt-1 font-hebrew">
          {t('createGuide.step1.expirationHelp')}
        </p>
        {errors.expiration_date && (
          <p className="text-red-600 text-sm mt-1 font-hebrew">{errors.expiration_date}</p>
        )}
      </div>

      {/* Next Step Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700 font-hebrew">
          💡 לאחר מילוי השדות, עבור לשלב 2 להוספת שלבי ההכוונה
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 font-hebrew">
          {t('createGuide.step2.title')}
        </h2>
        <Button onClick={addStep} size="sm">
          {t('createGuide.step2.addStep')}
        </Button>
      </div>

      {/* Progress Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 font-hebrew">
          🎯 שלב 2 מתוך 3: הוסף שלבי הכוונה עם תמונות ותיאורים
        </p>
      </div>

      {formData.steps.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="font-hebrew">עדיין לא נוספו שלבים</p>
          <Button onClick={addStep} variant="ghost" className="mt-2">
            {t('createGuide.step2.addStep')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.steps.map((step, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 font-hebrew">
                  שלב {index + 1}
                </h3>
                <Button
                  onClick={() => removeStep(index)}
                  variant="danger"
                  size="sm"
                >
                  {t('createGuide.step2.deleteStep')}
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-hebrew">
                    {t('createGuide.step2.stepDescription')}
                  </label>
                  <textarea
                    value={step.description}
                    onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                    placeholder={t('createGuide.step2.stepDescriptionPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-hebrew"
                    rows={3}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-hebrew">
                    {t('createGuide.step2.uploadImage')}
                  </label>
                  <input
                    type="url"
                    value={step.image_url || ''}
                    onChange={(e) => handleStepChange(index, 'image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {step.image_url && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-hebrew">
                      {t('createGuide.step2.imageAlt')}
                    </label>
                    <input
                      type="text"
                      value={step.image_alt || ''}
                      onChange={(e) => handleStepChange(index, 'image_alt', e.target.value)}
                      placeholder="תיאור התמונה"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-hebrew"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Quick Preview Section in Step 2 */}
          {formData.steps.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-md font-semibold text-blue-900 font-hebrew">
                    תצוגה מקדימה זמינה
                  </h4>
                  <p className="text-sm text-blue-700 font-hebrew">
                    צפה בשלבים שהוספת עד כה ({formData.steps.length} שלבים)
                  </p>
                </div>
                <Button
                  onClick={handlePreview}
                  variant="secondary"
                  size="sm"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                  disabled={isLoading}
                >
                  תצוגה מקדימה 👁️
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 font-hebrew">
        {t('createGuide.step3.title')}
      </h2>

      {/* Progress Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 font-hebrew">
          ✅ שלב 3 מתוך 3: צפה בתצוגה מקדימה ופרסם את ההכוונה
        </p>
      </div>

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-2 font-hebrew">יש לתקן את השגיאות הבאות:</h4>
          <ul className="text-red-700 space-y-1">
            {Object.values(errors).map((error, index) => (
              <li key={index} className="font-hebrew">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 font-hebrew">
          {t('createGuide.step3.preview')}
        </h3>
        <p className="text-blue-700 mb-4 font-hebrew">
          צפה בהכוונה כפי שהמשתמשים יראו אותה
        </p>
        <Button
          onClick={handlePreview}
          variant="secondary"
          className="w-full mb-2"
          disabled={isLoading}
        >
          {t('createGuide.step3.preview')} 👁️
        </Button>
      </div>

      {/* Actions Section */}
      <div className="space-y-3">
        {onSave && (
          <Button
            onClick={handleSave}
            variant="secondary"
            className="w-full"
            disabled={isLoading}
            loading={isLoading}
          >
            {t('common.save')}
          </Button>
        )}
        
        {onPublish && (
          <Button
            onClick={handlePublish}
            variant="primary"
            className="w-full"
            disabled={isLoading}
            loading={isLoading}
          >
            {t('createGuide.step3.publish')}
          </Button>
        )}
      </div>
    </div>
  );

  const renderStepNavigation = () => (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      <Button
        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1) as 1 | 2 | 3)}
        variant="ghost"
        disabled={currentStep === 1}
      >
        {t('common.previous')}
      </Button>

      <div className="flex space-x-2 rtl:space-x-reverse">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`w-3 h-3 rounded-full ${
              step === currentStep
                ? 'bg-primary-500'
                : step < currentStep
                ? 'bg-primary-300'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <Button
        onClick={() => setCurrentStep(prev => Math.min(3, prev + 1) as 1 | 2 | 3)}
        variant="ghost"
        disabled={currentStep === 3}
      >
        {t('common.next')}
      </Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-hebrew">
            {t('createGuide.title')}
          </h1>
        </div>

        {/* Form Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Step Navigation */}
        {renderStepNavigation()}
      </div>

      {/* Floating Preview Button - Always Visible when Steps Exist */}
      {formData.steps.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={handlePreview}
            variant="primary"
            size="lg"
            className="shadow-lg bg-primary-600 hover:bg-primary-700 text-white rounded-full px-6 py-3 font-hebrew"
            disabled={isLoading}
            ariaLabel="פתח תצוגה מקדימה"
          >
            <span className="flex items-center space-x-2 rtl:space-x-reverse">
              <span>תצוגה מקדימה</span>
              <span className="text-xl">👁️</span>
              <span className="bg-white text-primary-600 rounded-full px-2 py-1 text-xs font-semibold">
                {formData.steps.length}
              </span>
            </span>
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        previewData={previewData}
      />
    </div>
  );
};
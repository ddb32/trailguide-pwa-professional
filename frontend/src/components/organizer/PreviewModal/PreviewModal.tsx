import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { ImageWithFallback } from '@/components/common/ImageWithFallback/ImageWithFallback';
import { PreviewModalProps, CreateStepData } from '@/types/events';

export const PreviewModal: React.FC<PreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  previewData 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [currentStep, setCurrentStep] = useState(0);
  const [isStartScreen, setIsStartScreen] = useState(true);
  const [isCompleteScreen, setIsCompleteScreen] = useState(false);

  const steps = previewData.steps || [];
  const totalSteps = steps.length;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsStartScreen(true);
      setIsCompleteScreen(false);
    }
  }, [isOpen]);

  const handleStartNavigation = useCallback(() => {
    if (totalSteps > 0) {
      setIsStartScreen(false);
      setCurrentStep(0);
    }
  }, [totalSteps]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsCompleteScreen(true);
    }
  }, [currentStep, totalSteps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setIsStartScreen(true);
    setIsCompleteScreen(false);
  }, []);

  const handleKeyNavigation = useCallback((event: KeyboardEvent) => {
    if (!isOpen || isStartScreen || isCompleteScreen) return;

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
        if (currentStep < totalSteps - 1) {
          event.preventDefault();
          handleNext();
        }
        break;
      case 'ArrowLeft':
        if (currentStep > 0) {
          event.preventDefault();
          handlePrevious();
        }
        break;
      case 'Home':
        event.preventDefault();
        setCurrentStep(0);
        break;
      case 'End':
        event.preventDefault();
        setCurrentStep(totalSteps - 1);
        break;
    }
  }, [isOpen, isStartScreen, isCompleteScreen, currentStep, totalSteps, handleNext, handlePrevious]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNavigation);
    return () => document.removeEventListener('keydown', handleKeyNavigation);
  }, [handleKeyNavigation]);

  if (!previewData.isValid) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={t('preview.title')} size="md">
        <div className="text-center py-8" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 font-hebrew">
            {t('errors.previewUnavailable')}
          </h3>
          <div className="text-gray-600 mb-6">
            {previewData.validationErrors?.map((error, index) => (
              <p key={index} className="mb-1 font-hebrew">{error}</p>
            ))}
          </div>
          <Button onClick={onClose} variant="primary">
            {t('preview.backToEdit')}
          </Button>
        </div>
      </Modal>
    );
  }

  const renderStartScreen = () => (
    <div className="text-center py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-hebrew">
          {previewData.event_name}
        </h1>
        <p className="text-lg text-gray-600 font-hebrew">
          ההכוונה מכילה {totalSteps} שלבים
        </p>
      </div>
      
      <div className="flex flex-col space-y-4">
        <Button 
          onClick={handleStartNavigation} 
          variant="primary" 
          size="lg"
          className="w-full"
        >
          {t('preview.startNavigation')}
        </Button>
        
        <Button 
          onClick={onClose} 
          variant="ghost"
          className="w-full"
        >
          {t('preview.backToEdit')}
        </Button>
      </div>
    </div>
  );

  const renderCompleteScreen = () => (
    <div className="text-center py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-green-500 text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4 font-hebrew">
        {t('preview.navigationComplete')}
      </h2>
      
      <div className="flex flex-col space-y-4">
        <Button 
          onClick={handleRestart} 
          variant="primary"
          className="w-full"
        >
          {t('preview.restartNavigation')}
        </Button>
        
        <Button 
          onClick={onClose} 
          variant="ghost"
          className="w-full"
        >
          {t('preview.backToEdit')}
        </Button>
      </div>
    </div>
  );

  const renderStepScreen = () => {
    const step = steps[currentStep];
    if (!step) return null;

    return (
      <div className="max-w-md mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 font-hebrew">
              {t('preview.stepCounter', { current: currentStep + 1, total: totalSteps })}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {step.image_url && (
            <div className="aspect-video">
              <ImageWithFallback
                src={step.image_url}
                alt={step.image_alt || `שלב ${currentStep + 1}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          )}

          <div className="p-6">
            <p className="text-lg text-gray-800 leading-relaxed mb-6 font-hebrew">
              {step.description}
            </p>

            {/* Navigation Controls */}
            <div className="flex justify-between space-x-4 rtl:space-x-reverse">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                variant="secondary"
                className="flex-1"
              >
                {t('common.previous')}
              </Button>
              
              <Button
                onClick={handleNext}
                variant="primary"
                className="flex-1"
              >
                {currentStep === totalSteps - 1 ? t('common.complete') : t('common.next')}
              </Button>
            </div>
          </div>
        </div>

        {/* Back to Edit */}
        <div className="mt-6 text-center">
          <Button 
            onClick={onClose} 
            variant="ghost" 
            size="sm"
            className="text-gray-500"
          >
            {t('preview.exitPreview')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t('preview.title')}
      size="full"
      className="bg-gray-50"
    >
      <div className="min-h-[60vh] flex items-center justify-center">
        {isStartScreen && renderStartScreen()}
        {isCompleteScreen && renderCompleteScreen()}
        {!isStartScreen && !isCompleteScreen && renderStepScreen()}
      </div>
    </Modal>
  );
};
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import FormValidation from '../FormValidation/FormValidation';

// Extract StepCard as a separate component to prevent recreation on re-renders
const StepCard = React.memo(({ 
  step, 
  index, 
  updateStep, 
  deleteStep, 
  handleImageUpload, 
  handleDragStart, 
  handleDragOver, 
  handleDrop, 
  draggedStep,
  validationErrors,
  validationWarnings,
  showValidation
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();
  
  return (
    <div 
      className={`
        bg-white border border-gray-200 rounded-lg lg:rounded-2xl p-4 lg:p-6 
        shadow-sm lg:shadow-desktop transition-all duration-300
        lg:hover:shadow-desktop-hover lg:hover:-translate-y-1
        ${draggedStep === index ? 'opacity-50 scale-95' : ''}
      `}
      draggable
      onDragStart={(e) => handleDragStart(e, index)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index)}
    >
      <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-sm lg:text-base font-semibold">
            {index + 1}
          </div>
          <h3 className="text-lg lg:text-xl font-semibold text-gray-900">
            {t('createGuide.steps.title')} {index + 1}
          </h3>
        </div>
        
        <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 lg:hover:bg-gray-100 p-2 rounded-lg transition-all duration-200 cursor-move"
            title={t('createGuide.step2.reorderSteps')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => updateStep(step.id, { hasNavigation: !step.hasNavigation, wazeLink: step.hasNavigation ? null : step.wazeLink })}
            className={`p-2 rounded-lg transition-all duration-200 ${
              step.hasNavigation 
                ? 'text-blue-600 hover:text-blue-700 lg:hover:bg-blue-50 bg-blue-50' 
                : 'text-gray-400 hover:text-gray-600 lg:hover:bg-gray-100'
            }`}
            title={step.hasNavigation ? t('createGuide.navigation.remove') : t('createGuide.navigation.add')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => deleteStep(step.id)}
            className="text-red-400 hover:text-red-600 lg:hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
            title={t('createGuide.step2.deleteStep')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8 space-y-4 lg:space-y-0">
        {/* Image Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm lg:text-base font-medium text-gray-700">
            {t('createGuide.step2.uploadImage')}
          </label>
          
          {(step.imagePreview || step.existingImageUrl) ? (
            <div className="relative">
              <img 
                src={step.imagePreview || step.existingImageUrl} 
                alt={`${t('createGuide.steps.title')} ${index + 1}`}
                className="w-full h-48 lg:h-64 object-contain bg-gray-100 rounded-lg lg:rounded-xl border border-gray-200"
                onError={(e) => {
                  console.error('Failed to load step image:', step.imagePreview || step.existingImageUrl);
                  e.target.style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => updateStep(step.id, { 
                  image: null, 
                  imagePreview: null, 
                  existingImageUrl: null,
                  hasExistingImage: false 
                })}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-gray-300 hover:border-blue-400 lg:hover:border-blue-500 rounded-lg lg:rounded-xl p-6 lg:p-8 text-center transition-all duration-300 lg:hover:bg-blue-50/30">
                <svg className="mx-auto h-12 w-12 lg:h-16 lg:w-16 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-sm lg:text-base text-gray-600">
                  {t('createGuide.basicInfo.dragDropImage')}
                </p>
                <p className="text-xs lg:text-sm text-gray-400 mt-1">
                  {t('createGuide.basicInfo.imageFormats')}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => handleImageUpload(step.id, e.target.files[0])}
              />
            </label>
          )}
        </div>

        {/* Description Section */}
        <div className="space-y-3">
          <label className="block text-sm lg:text-base font-medium text-gray-700">
            {t('createGuide.step2.stepDescription')}
          </label>
          <textarea
            value={step.description}
            onChange={(e) => updateStep(step.id, { description: e.target.value })}
            placeholder={t('createGuide.step2.stepDescriptionPlaceholder')}
            className={`
              w-full h-32 lg:h-48 px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 
              rounded-lg lg:rounded-xl text-sm lg:text-base
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
              transition-all duration-200 resize-none
              ${conditionalClass.textAlign}
            `}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <div className="space-y-1">
            <div className={`text-xs lg:text-sm text-gray-500 ${conditionalClass.textAlign}`}>
              {step.description.length}/1000 {t('common.characters')}
            </div>
            {showValidation && (
              <div className="space-y-1">
                <FormValidation.FieldError error={validationErrors[`step_${index}_description`]} />
                <FormValidation.FieldWarning warning={validationWarnings[`step_${index}_image`]} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Section - Optional */}
      {step.hasNavigation && (
        <div className="mt-6 lg:mt-8 border-t border-gray-100 pt-6 lg:pt-8">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm lg:text-base font-medium text-gray-700">
              {t('createGuide.navigation.title')}
            </label>
            <button
              type="button"
              onClick={() => updateStep(step.id, { hasNavigation: false, wazeLink: null })}
              className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors duration-200"
              title={t('createGuide.navigation.remove')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={step.wazeLink || ''}
            onChange={(e) => updateStep(step.id, { wazeLink: e.target.value })}
            placeholder={t('createGuide.navigation.placeholder')}
            className={`
              w-full px-3 lg:px-4 py-2 lg:py-3 border border-gray-300 
              rounded-lg lg:rounded-xl text-sm lg:text-base
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
              transition-all duration-200
              ${conditionalClass.textAlign}
            `}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <p className={`mt-2 text-xs lg:text-sm text-gray-500 ${conditionalClass.textAlign}`}>
            {t('createGuide.navigation.description')}
          </p>
        </div>
      )}
    </div>
  );
});

const StepEditor = ({ 
  steps = [], 
  onStepsChange,
  className = '',
  validationErrors = {},
  validationWarnings = {},
  showValidation = false
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [draggedStep, setDraggedStep] = useState(null);

  const addStep = useCallback(() => {
    const newStep = {
      id: Date.now(),
      description: '',
      image: null,
      imagePreview: null,
      wazeLink: null,
      hasNavigation: false
    };
    onStepsChange([...steps, newStep]);
  }, [steps, onStepsChange]);

  const updateStep = useCallback((stepId, updates) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    );
    onStepsChange(updatedSteps);
  }, [steps, onStepsChange]);

  const deleteStep = useCallback((stepId) => {
    const updatedSteps = steps.filter(step => step.id !== stepId);
    onStepsChange(updatedSteps);
  }, [steps, onStepsChange]);

  const handleImageUpload = useCallback((stepId, file) => {
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    updateStep(stepId, { 
      image: file, 
      imagePreview: imageUrl,
      existingImageUrl: null, // Clear existing image when new one is uploaded
      hasExistingImage: false
    });
  }, [updateStep]);

  const handleDragStart = (e, stepIndex) => {
    setDraggedStep(stepIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedStep === null) return;

    const newSteps = [...steps];
    const draggedItem = newSteps[draggedStep];
    newSteps.splice(draggedStep, 1);
    newSteps.splice(targetIndex, 0, draggedItem);
    
    onStepsChange(newSteps);
    setDraggedStep(null);
  };


  return (
    <div className={`space-y-6 lg:space-y-8 ${className}`}>
      {steps.length === 0 ? (
        <div className="text-center py-12 lg:py-16 bg-gray-50 lg:bg-gradient-to-br lg:from-gray-50 lg:to-blue-50 rounded-lg lg:rounded-2xl border-2 border-dashed border-gray-300 lg:border-blue-200">
          <div className="text-4xl lg:text-6xl mb-4 lg:mb-6">📝</div>
          <h3 className="text-lg lg:text-xl font-medium text-gray-900 mb-2">
            {t('createGuide.steps.noStepsYet')}
          </h3>
          <p className="text-gray-600 lg:text-lg mb-6 lg:mb-8 max-w-md mx-auto">
            {t('createGuide.steps.addFirstStep')}
          </p>
          <button
            type="button"
            onClick={addStep}
            className="btn btn-primary lg:text-lg lg:px-8 lg:py-4"
          >
            <span className="mr-2">➕</span>
            {t('createGuide.steps.addStep')}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 lg:space-y-6">
            {steps.map((step, index) => (
              <StepCard 
                key={step.id} 
                step={step} 
                index={index}
                updateStep={updateStep}
                deleteStep={deleteStep}
                handleImageUpload={handleImageUpload}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                draggedStep={draggedStep}
                validationErrors={validationErrors}
                validationWarnings={validationWarnings}
                showValidation={showValidation}
              />
            ))}
          </div>
          
          <div className="flex justify-center pt-4 lg:pt-8">
            <button
              type="button"
              onClick={addStep}
              className="btn btn-secondary lg:text-lg lg:px-8 lg:py-4 group"
            >
              <span className="mr-2 group-hover:scale-110 transition-transform duration-200">➕</span>
              {t('createGuide.steps.addStep')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StepEditor;
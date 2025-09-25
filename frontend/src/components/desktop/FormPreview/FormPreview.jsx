import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';

const FormPreview = ({ 
  formData = {},
  steps = [],
  coverImage = null,
  className = ''
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'published': return t('createGuide.status.published');
      case 'draft': return t('createGuide.status.draft');
      case 'scheduled': return t('createGuide.status.scheduled');
      case 'expired': return t('createGuide.status.expired');
      case 'archived': return t('createGuide.status.archived');
      default: return status;
    }
  };

  return (
    <div className={`sticky top-8 space-y-6 ${className}`}>
      {/* Preview Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('preview.title')}
          </h3>
          <div className="text-2xl">🔍</div>
        </div>
        
        <p className="text-sm text-gray-600">
          {t('preview.livePreviewDescription')}
        </p>
      </div>

      {/* Guide Preview Card */}
      <div className="bg-white rounded-2xl shadow-desktop border border-gray-200 overflow-hidden">
        {/* Cover Image Preview */}
        {(formData.coverImage || coverImage) ? (
          <div className="relative h-48 bg-gray-100">
            <img 
              src={
                formData.coverImagePreview || 
                (formData.coverImage && URL.createObjectURL(formData.coverImage)) ||
                (coverImage && URL.createObjectURL(coverImage))
              } 
              alt={formData.eventName || t('createGuide.basicInfo.coverImage')}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h4 className="text-white text-xl font-semibold truncate">
                {formData.eventName || t('createGuide.form.eventNamePlaceholder')}
              </h4>
            </div>
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-sm">{t('createGuide.basicInfo.noCoverImage')}</p>
            </div>
          </div>
        )}

        {/* Guide Details */}
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {formData.eventName || t('createGuide.basicInfo.eventNamePlaceholder')}
            </h4>
          </div>

          {/* Status and Location */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`
              inline-flex px-3 py-1 text-xs font-semibold rounded-full border
              ${getStatusColor(formData.status || 'draft')}
            `}>
              {getStatusText(formData.status || 'draft')}
            </span>
            
            {formData.location && (
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate max-w-32">{formData.location}</span>
              </div>
            )}
          </div>

          {/* Steps Summary */}
          <div className="pt-4 border-t border-gray-100">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="text-sm font-medium text-gray-700">
                {t('createGuide.steps.title')}
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                {steps.length} {t('app.stepsCount')}
              </span>
            </div>
            
            {steps.length > 0 && (
              <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                {steps.slice(0, 3).map((step, index) => (
                  <div key={step.id || index} className="flex items-start space-x-3 text-xs">
                    <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-600 line-clamp-2 leading-tight">
                      {step.description || t('createGuide.steps.stepPlaceholder')}
                    </span>
                  </div>
                ))}
                {steps.length > 3 && (
                  <div className="text-center text-xs text-gray-500 pt-1">
                    +{steps.length - 3} {t('common.more')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl shadow-desktop border border-gray-200 p-6">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          {t('preview.quickStats')}
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {steps.length}
            </div>
            <div className="text-xs text-gray-600">
              {t('app.stepsCount')}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {steps.filter(step => step.description && step.description.trim()).length}
            </div>
            <div className="text-xs text-gray-600">
              {t('preview.completedSteps')}
            </div>
          </div>
        </div>
        
        {/* Completion Progress */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className={`flex items-center justify-between text-xs text-gray-600 mb-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <span>{t('preview.completeness')}</span>
            <span>
              {Math.round((steps.filter(step => step.description && step.description.trim()).length / Math.max(steps.length, 1)) * 100)}%
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 rounded-full h-2 transition-all duration-300"
              style={{ 
                width: `${Math.round((steps.filter(step => step.description && step.description.trim()).length / Math.max(steps.length, 1)) * 100)}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
        <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
          <div className="text-2xl flex-shrink-0">💡</div>
          <div>
            <h4 className="text-base font-semibold text-amber-900 mb-2">
              {t('preview.tips.title')}
            </h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• {t('preview.tips.addImages')}</li>
              <li>• {t('preview.tips.clearInstructions')}</li>
              <li>• {t('preview.tips.testNavigation')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreview;
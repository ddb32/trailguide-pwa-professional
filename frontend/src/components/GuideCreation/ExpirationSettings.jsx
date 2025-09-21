import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const ExpirationSettings = ({ 
  value = 24, 
  onChange, 
  disabled = false, 
  className = '',
  showPreview = true 
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();
  const [expirationHours, setExpirationHours] = useState(value);
  const [isCustom, setIsCustom] = useState(value !== 24);

  // Predefined hour options
  const hourOptions = [
    { value: 1, label: '1' },
    { value: 3, label: '3' },
    { value: 6, label: '6' },
    { value: 12, label: '12' },
    { value: 24, label: '24' }
  ];

  // Update internal state when prop changes
  useEffect(() => {
    setExpirationHours(value);
    setIsCustom(value !== 24);
  }, [value]);

  // Calculate expiration date for preview
  const getExpirationDate = (hours) => {
    const now = new Date();
    const expiration = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return expiration;
  };

  // Format date for display
  const formatExpirationDate = (date) => {
    return new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: !isRTL
    }).format(date);
  };

  // Handle quick hour selection
  const handleQuickSelection = (hours) => {
    setExpirationHours(hours);
    setIsCustom(false);
    onChange && onChange(hours);
  };

  // Handle custom input change
  const handleCustomChange = (e) => {
    const hours = Math.max(1, Math.min(24, parseInt(e.target.value) || 1));
    setExpirationHours(hours);
    setIsCustom(true);
    onChange && onChange(hours);
  };

  return (
    <div className={`bg-white rounded-lg lg:rounded-2xl shadow-sm lg:shadow-desktop p-6 lg:p-8 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">
          {t('createGuide.expiration.title')}
        </h3>
        <p className="text-sm lg:text-base text-gray-600">
          {t('createGuide.expiration.subtitle')}
        </p>
      </div>

      {/* Quick Selection Buttons */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('createGuide.expiration.defaultHours')}
        </label>
        <div className={`grid grid-cols-3 lg:grid-cols-5 gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          {hourOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleQuickSelection(option.value)}
              disabled={disabled}
              className={`
                relative px-4 py-3 rounded-lg border-2 font-medium text-sm lg:text-base
                transition-all duration-200 hover:shadow-md
                ${expirationHours === option.value && !isCustom
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isRTL ? 'font-hebrew' : ''}
              `}
            >
              {option.label}
              <span className="block text-xs text-gray-500 mt-1">
                {t('createGuide.expiration.hoursLabel')}
              </span>
              {expirationHours === option.value && !isCustom && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Duration Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('createGuide.expiration.customHours')}
        </label>
        <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
          <div className="flex-1 max-w-32">
            <input
              type="number"
              min="1"
              max="24"
              value={expirationHours}
              onChange={handleCustomChange}
              onFocus={() => setIsCustom(true)}
              disabled={disabled}
              className={`
                block w-full px-4 py-3 border border-gray-300 rounded-lg
                text-base font-medium text-gray-900 placeholder-gray-500
                focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${conditionalClass.textLeft}
                ${isCustom && expirationHours ? 'ring-2 ring-blue-500 border-transparent' : ''}
              `}
              placeholder="24"
            />
          </div>
          <span className="text-gray-700 font-medium">
            {t('createGuide.expiration.hoursLabel')}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t('createGuide.expiration.minHours')} • {t('createGuide.expiration.maxHours')}
        </p>
      </div>

      {/* Expiration Preview */}
      {showPreview && expirationHours && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 lg:p-6">
          <div className={`flex items-start space-x-3 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">
                {t('createGuide.expiration.expiresAt', { 
                  date: formatExpirationDate(getExpirationDate(expirationHours))
                })}
              </h4>
              <p className="text-xs text-blue-600">
                {expirationHours === 1 
                  ? t('createGuide.expiration.remaining', { time: '1 hour' })
                  : t('createGuide.expiration.remaining', { time: `${expirationHours} hours` })
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500 leading-relaxed">
        <p>
          ℹ️ {t('createGuide.expiration.expirationInfo')}
        </p>
      </div>
    </div>
  );
};

export default ExpirationSettings;
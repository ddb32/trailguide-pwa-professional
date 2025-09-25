import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import {
  toIsraelDateTimeLocal,
  fromIsraelDateTimeLocal,
  nowInIsraelForInput,
  formatInIsraelTimezone,
  validateScheduledDate
} from '../../utils/timezone';

const TimingSettings = ({
  activationDate = null,
  expirationHours = 24,
  onActivationChange,
  onExpirationChange,
  disabled = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();

  // Unified state management
  const [activationMode, setActivationMode] = useState(activationDate ? 'scheduled' : 'immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(expirationHours);
  const [isCustomDuration, setIsCustomDuration] = useState(![1, 3, 6, 12, 24].includes(expirationHours));

  // Duration options with localized labels
  const durationOptions = [
    { value: 1, label: '1', fullLabel: t('createGuide.timing.duration.oneHour') },
    { value: 3, label: '3', fullLabel: t('createGuide.timing.duration.threeHours') },
    { value: 6, label: '6', fullLabel: t('createGuide.timing.duration.sixHours') },
    { value: 12, label: '12', fullLabel: t('createGuide.timing.duration.twelveHours') },
    { value: 24, label: '24', fullLabel: t('createGuide.timing.duration.twentyFourHours') }
  ];

  // Initialize component state
  useEffect(() => {
    if (activationDate) {
      const date = new Date(activationDate);
      const israelDateTimeLocal = toIsraelDateTimeLocal(date);
      const [datePart, timePart] = israelDateTimeLocal.split('T');
      setScheduledDate(datePart);
      setScheduledTime(timePart);
    } else if (activationMode === 'scheduled') {
      // Default to current time when switching to scheduled
      const israelNow = nowInIsraelForInput();
      const [datePart, timePart] = israelNow.split('T');
      setScheduledDate(datePart);
      setScheduledTime(timePart);
    }
  }, [activationDate, activationMode]);

  // Calculate activation and expiration dates
  const getActivationDateTime = () => {
    if (activationMode === 'immediate') {
      return new Date();
    }
    if (scheduledDate && scheduledTime) {
      return fromIsraelDateTimeLocal(`${scheduledDate}T${scheduledTime}`);
    }
    return null;
  };

  const getExpirationDateTime = () => {
    const activation = getActivationDateTime();
    if (!activation) return null;
    return new Date(activation.getTime() + duration * 60 * 60 * 1000);
  };

  // Format dates for display
  const formatDateTime = (date, options = {}) => {
    if (!date) return '';
    return formatInIsraelTimezone(date, isRTL ? 'he-IL' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: !isRTL,
      ...options
    });
  };

  // Handle activation mode change
  const handleActivationModeChange = (mode) => {
    setActivationMode(mode);

    if (mode === 'immediate') {
      onActivationChange && onActivationChange(null);
    } else if (mode === 'scheduled') {
      // Set to current time as default
      const israelNow = nowInIsraelForInput();
      const [newDate, newTime] = israelNow.split('T');
      setScheduledDate(newDate);
      setScheduledTime(newTime);
      onActivationChange && onActivationChange(fromIsraelDateTimeLocal(israelNow));
    }
  };

  // Handle scheduled date/time changes
  const handleScheduledChange = (newDate = scheduledDate, newTime = scheduledTime) => {
    if (activationMode === 'scheduled' && newDate && newTime) {
      const activationDateTime = fromIsraelDateTimeLocal(`${newDate}T${newTime}`);

      // Validate the scheduled date
      const validation = validateScheduledDate(activationDateTime);
      if (!validation.isValid) {
        console.warn('Invalid scheduled date:', validation.error);
      }

      onActivationChange && onActivationChange(activationDateTime);
    }
  };

  // Handle duration selection
  const handleDurationChange = (hours) => {
    setDuration(hours);
    setIsCustomDuration(![1, 3, 6, 12, 24].includes(hours));
    onExpirationChange && onExpirationChange(hours);
  };

  // Handle custom duration input
  const handleCustomDurationChange = (e) => {
    const hours = Math.max(1, Math.min(168, parseInt(e.target.value) || 1)); // Max 1 week
    setDuration(hours);
    setIsCustomDuration(true);
    onExpirationChange && onExpirationChange(hours);
  };

  // Set to current time
  const setToCurrentTime = () => {
    const israelNow = nowInIsraelForInput();
    const [datePart, timePart] = israelNow.split('T');
    setScheduledDate(datePart);
    setScheduledTime(timePart);
    handleScheduledChange(datePart, timePart);
  };

  // Validation
  const isValidActivation = () => {
    if (activationMode === 'immediate') return true;
    const activation = getActivationDateTime();
    if (!activation) return false;
    return activation >= new Date();
  };

  const activation = getActivationDateTime();
  const expiration = getExpirationDateTime();

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className={`text-xl font-bold text-gray-900 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
              {t('createGuide.timing.title', 'תזמון ההכוונה')}
            </h3>
            <p className={`text-sm text-gray-600 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
              {t('createGuide.timing.subtitle', 'קבעו מתי ההכוונה תהיה זמינה ולכמה זמן')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Step 1: When to Start */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <h4 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'font-hebrew' : ''}`}>
              {t('createGuide.timing.whenToStart', 'מתי להתחיל?')}
            </h4>
          </div>

          {/* Activation Mode Selection */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <button
              type="button"
              onClick={() => handleActivationModeChange('immediate')}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 font-medium transition-all duration-200
                ${activationMode === 'immediate'
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isRTL ? 'font-hebrew' : ''}
              `}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="font-semibold">{t('createGuide.activation.immediate', 'מיידית')}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('createGuide.activation.immediateDesc', 'ההכוונה תהיה זמינה מיד לאחר הפרסום')}
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleActivationModeChange('scheduled')}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border-2 font-medium transition-all duration-200
                ${activationMode === 'scheduled'
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isRTL ? 'font-hebrew' : ''}
              `}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="font-semibold">{t('createGuide.activation.scheduled', 'מתוזמן')}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('createGuide.activation.scheduledDesc', 'ההכוונה תהיה זמינה במועד שתקבעו')}
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Scheduled Date/Time Inputs - Progressive Disclosure */}
          {activationMode === 'scheduled' && (
            <div className="ml-11 space-y-4 animate-fade-in">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'space-x-reverse' : ''}`}>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
                    {t('createGuide.activation.date', 'תאריך')}
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setScheduledDate(newDate);
                      handleScheduledChange(newDate, scheduledTime);
                    }}
                    disabled={disabled}
                    min={new Date().toISOString().split('T')[0]}
                    className={`
                      block w-full px-4 py-3 border border-gray-300 rounded-lg
                      text-base font-medium text-gray-900
                      focus:ring-2 focus:ring-green-500 focus:border-transparent focus:outline-none
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${conditionalClass.textLeft}
                      ${!isValidActivation() ? 'border-red-300 bg-red-50' : ''}
                    `}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
                    {t('createGuide.activation.time', 'שעה')}
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      setScheduledTime(newTime);
                      handleScheduledChange(scheduledDate, newTime);
                    }}
                    disabled={disabled}
                    className={`
                      block w-full px-4 py-3 border border-gray-300 rounded-lg
                      text-base font-medium text-gray-900
                      focus:ring-2 focus:ring-green-500 focus:border-transparent focus:outline-none
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${conditionalClass.textLeft}
                      ${!isValidActivation() ? 'border-red-300 bg-red-50' : ''}
                    `}
                  />
                </div>
              </div>

              {!isValidActivation() && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={isRTL ? 'font-hebrew' : ''}>
                    {t('createGuide.activation.pastDateWarning', 'תאריך או שעה בעבר אינם תקפים')}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={setToCurrentTime}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
                  border border-blue-300 bg-blue-50 text-blue-700
                  hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none
                  transition-colors duration-200
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${isRTL ? 'flex-row-reverse font-hebrew' : ''}
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t('createGuide.activation.setCurrentTime', 'קבע לשעה הנוכחית')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Step 2: How Long Active */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <h4 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'font-hebrew' : ''}`}>
              {t('createGuide.timing.howLongActive', 'כמה זמן פעיל?')}
            </h4>
          </div>

          {/* Duration Selection */}
          <div className="ml-11 space-y-4">
            <div className={`grid grid-cols-3 sm:grid-cols-5 gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleDurationChange(option.value)}
                  disabled={disabled}
                  className={`
                    relative p-3 rounded-lg border-2 font-medium text-sm
                    transition-all duration-200 hover:shadow-md
                    ${duration === option.value && !isCustomDuration
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isRTL ? 'font-hebrew' : ''}
                  `}
                >
                  <div className="text-center">
                    <div className="font-bold">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.fullLabel}</div>
                  </div>
                  {duration === option.value && !isCustomDuration && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Duration Input */}
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium text-gray-700 ${isRTL ? 'font-hebrew' : ''}`}>
                  {t('createGuide.timing.customDuration', 'מותאם:')}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={duration}
                    onChange={handleCustomDurationChange}
                    onFocus={() => setIsCustomDuration(true)}
                    disabled={disabled}
                    className={`
                      w-20 px-3 py-2 border border-gray-300 rounded-lg
                      text-sm font-medium text-gray-900
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${conditionalClass.textLeft}
                      ${isCustomDuration ? 'ring-2 ring-blue-500 border-transparent' : ''}
                    `}
                  />
                  <span className={`text-sm text-gray-700 font-medium ${isRTL ? 'font-hebrew' : ''}`}>
                    {t('createGuide.expiration.hoursLabel', 'שעות')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Timeline Preview */}
        {activation && expiration && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                ✓
              </div>
              <h4 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'font-hebrew' : ''}`}>
                {t('createGuide.timing.preview', 'תצוגה מקדימה')}
              </h4>
            </div>

            <div className="ml-11 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 border-2 border-purple-200 rounded-xl p-6">
              {/* Timeline Visualization */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                    <div className={`text-sm font-semibold text-green-800 ${isRTL ? 'font-hebrew' : ''}`}>
                      {t('createGuide.timing.startTime', 'התחלה')}
                    </div>
                    <div className={`text-xs text-green-600 ${isRTL ? 'font-hebrew' : ''}`}>
                      {formatDateTime(activation, { weekday: undefined })}
                    </div>
                  </div>

                  <div className="flex-1 mx-4">
                    <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full"></div>
                    <div className={`text-center mt-2 text-sm text-gray-600 ${isRTL ? 'font-hebrew' : ''}`}>
                      {duration === 1 ? t('createGuide.timing.duration.hour', { count: 1 }) : t('createGuide.timing.duration.hours', { count: duration })}
                    </div>
                  </div>

                  <div className={`text-center ${isRTL ? 'text-left' : 'text-right'}`}>
                    <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto mb-2"></div>
                    <div className={`text-sm font-semibold text-purple-800 ${isRTL ? 'font-hebrew' : ''}`}>
                      {t('createGuide.timing.endTime', 'סיום')}
                    </div>
                    <div className={`text-xs text-purple-600 ${isRTL ? 'font-hebrew' : ''}`}>
                      {formatDateTime(expiration, { weekday: undefined })}
                    </div>
                  </div>
                </div>

                {/* Summary Information */}
                <div className={`text-center p-3 bg-white/70 rounded-lg border border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`text-sm text-gray-700 ${isRTL ? 'font-hebrew' : ''}`}>
                    {activationMode === 'immediate'
                      ? t('createGuide.timing.immediatePreview', 'ההכוונה תהיה זמינה מיד ותפוג בעוד {{duration}}', {
                          duration: duration === 1 ? t('createGuide.timing.duration.hour', { count: 1 }) : t('createGuide.timing.duration.hours', { count: duration })
                        })
                      : t('createGuide.timing.scheduledPreview', 'ההכוונה תהיה זמינה החל מ{{startTime}} למשך {{duration}}', {
                          startTime: formatDateTime(activation, { weekday: 'short', month: 'short', day: 'numeric' }),
                          duration: duration === 1 ? t('createGuide.timing.duration.hour', { count: 1 }) : t('createGuide.timing.duration.hours', { count: duration })
                        })
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Information */}
        <div className="border-t border-gray-200 pt-4">
          <div className={`text-xs text-gray-500 leading-relaxed ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
            <p className="flex items-start gap-2">
              <span className="text-blue-500 flex-shrink-0">ℹ️</span>
              <span>
                {t('createGuide.timing.helpText', 'המשתתפים יוכלו לגשת להכוונה רק בזמן שנקבע. לאחר תפוגת ההכוונה, רק המארגן ישמור על גישה מלאה.')}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimingSettings;
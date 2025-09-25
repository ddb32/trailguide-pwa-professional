import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import StatusDisplay from '../common/StatusDisplay/StatusDisplay';
import {
  toIsraelDateTimeLocal,
  fromIsraelDateTimeLocal,
  nowInIsraelForInput,
  formatInIsraelTimezone,
  validateScheduledDate
} from '../../utils/timezone';

const ActivationScheduler = ({
  activationDate = null,
  onActivationChange,
  disabled = false,
  className = '',
  showPreview = true
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass } = useLanguageDirection();

  // State for activation mode
  const [activationMode, setActivationMode] = useState(activationDate ? 'scheduled' : 'immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Track saved vs editing state for confirmation/cancel behavior
  const [savedActivationDate, setSavedActivationDate] = useState(activationDate);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize with proper defaults based on create vs edit mode
  useEffect(() => {
    if (activationDate) {
      // EDIT MODE: Display last saved activation time
      const date = new Date(activationDate);
      const israelDateTimeLocal = toIsraelDateTimeLocal(date);
      const [datePart, timePart] = israelDateTimeLocal.split('T');
      setScheduledDate(datePart);
      setScheduledTime(timePart);
      setSavedActivationDate(activationDate);
      setHasUnsavedChanges(false);
    } else {
      // NEW MODE: Default to current time when switching to scheduled
      if (activationMode === 'scheduled') {
        const israelNow = nowInIsraelForInput();
        const [datePart, timePart] = israelNow.split('T');
        setScheduledDate(datePart);
        setScheduledTime(timePart);

        // Immediately call onActivationChange with current time for new guides
        if (onActivationChange) {
          const activationDateTime = fromIsraelDateTimeLocal(israelNow);
          onActivationChange(activationDateTime);
        }
      }
    }
  }, [activationDate, activationMode, onActivationChange]);


  // Calculate activation date for preview (using Israel timezone)
  const getActivationDateTime = () => {
    if (activationMode === 'immediate') {
      return new Date();
    }
    if (scheduledDate && scheduledTime) {
      return fromIsraelDateTimeLocal(`${scheduledDate}T${scheduledTime}`);
    }
    return null;
  };

  // Format date for display (using Israel timezone utility)
  const formatDateTime = (date) => {
    if (!date) return '';
    return formatInIsraelTimezone(date, isRTL ? 'he-IL' : 'en-US', {
      weekday: 'short'
    });
  };

  // Handle activation mode change
  const handleActivationModeChange = (mode) => {
    setActivationMode(mode);

    if (mode === 'immediate') {
      onActivationChange && onActivationChange(null);
      setHasUnsavedChanges(true);
    } else if (mode === 'scheduled') {
      // Always use current time as default when switching to scheduled
      const israelNow = nowInIsraelForInput();
      const [newDate, newTime] = israelNow.split('T');
      setScheduledDate(newDate);
      setScheduledTime(newTime);
      onActivationChange && onActivationChange(fromIsraelDateTimeLocal(israelNow));
      setHasUnsavedChanges(true);
    }
  };

  // Handle scheduled date/time changes (convert from Israel timezone)
  const handleScheduledChange = (newDate = scheduledDate, newTime = scheduledTime) => {
    if (activationMode === 'scheduled' && newDate && newTime) {
      const activationDateTime = fromIsraelDateTimeLocal(`${newDate}T${newTime}`);

      // Validate the scheduled date
      const validation = validateScheduledDate(activationDateTime);
      if (!validation.isValid) {
        console.warn('Invalid scheduled date:', validation.error);
        // You might want to show an error message to the user here
      }

      onActivationChange && onActivationChange(activationDateTime);
      setHasUnsavedChanges(true);
    }
  };

  // Set time to current Israel time
  const setToCurrentTime = () => {
    const israelNow = nowInIsraelForInput();
    const [datePart, timePart] = israelNow.split('T');
    setScheduledDate(datePart);
    setScheduledTime(timePart);
    handleScheduledChange(datePart, timePart);
  };

  // Cancel changes - revert to saved activation date
  const cancelChanges = () => {
    if (savedActivationDate) {
      const date = new Date(savedActivationDate);
      const israelDateTimeLocal = toIsraelDateTimeLocal(date);
      const [datePart, timePart] = israelDateTimeLocal.split('T');
      setScheduledDate(datePart);
      setScheduledTime(timePart);
      setActivationMode('scheduled');
      onActivationChange && onActivationChange(savedActivationDate);
    } else {
      setActivationMode('immediate');
      onActivationChange && onActivationChange(null);
    }
    setHasUnsavedChanges(false);
  };

  // Confirm changes - update saved state
  const confirmChanges = () => {
    const currentDateTime = getActivationDateTime();
    setSavedActivationDate(currentDateTime?.toISOString() || null);
    setHasUnsavedChanges(false);
  };


  // Validation for past dates
  const isValidActivation = () => {
    if (activationMode === 'immediate') return true;
    const activation = getActivationDateTime();
    if (!activation) return false;
    return activation >= new Date();
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 ${className}`}>
      {/* Header */}
      <div className="mb-8 sm:mb-6">
        <h3 className={`text-xl sm:text-lg lg:text-xl font-bold text-gray-900 mb-3 sm:mb-2 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
          {t('createGuide.activation.title')}
        </h3>
        <p className={`text-base sm:text-sm lg:text-base text-gray-600 leading-relaxed ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
          {t('createGuide.activation.subtitle')}
        </p>
      </div>

      {/* Activation Mode Selection */}
      <div className="mb-8 sm:mb-6">
        <label className={`block text-base sm:text-sm font-semibold text-gray-800 mb-4 sm:mb-3 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
          {t('createGuide.activation.when')}
        </label>
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          <button
            type="button"
            onClick={() => handleActivationModeChange('immediate')}
            disabled={disabled}
            className={`
              relative px-6 py-5 sm:px-4 sm:py-4 rounded-xl border-2 font-semibold
              text-lg sm:text-base min-h-[60px] sm:min-h-[48px]
              transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
              shadow-sm hover:shadow-md focus:ring-4 focus:ring-blue-500/30 focus:outline-none
              ${activationMode === 'immediate'
                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isRTL ? 'font-hebrew' : ''}
            `}
          >
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="font-semibold">{t('createGuide.activation.immediate')}</div>
                <div className="text-xs text-gray-500 mt-1">{t('createGuide.activation.immediateDesc')}</div>
              </div>
            </div>
            {activationMode === 'immediate' && (
              <div className={`absolute -top-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg ${isRTL ? '-left-3' : '-right-3'}`}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleActivationModeChange('scheduled')}
            disabled={disabled}
            className={`
              relative px-6 py-5 sm:px-4 sm:py-4 rounded-xl border-2 font-semibold
              text-lg sm:text-base min-h-[60px] sm:min-h-[48px]
              transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
              shadow-sm hover:shadow-md focus:ring-4 focus:ring-blue-500/30 focus:outline-none
              ${activationMode === 'scheduled'
                ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isRTL ? 'font-hebrew' : ''}
            `}
          >
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="font-semibold">{t('createGuide.activation.scheduled')}</div>
                <div className="text-xs text-gray-500 mt-1">{t('createGuide.activation.scheduledDesc')}</div>
              </div>
            </div>
            {activationMode === 'scheduled' && (
              <div className={`absolute -top-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg ${isRTL ? '-left-3' : '-right-3'}`}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Scheduled Date/Time Inputs */}
      {activationMode === 'scheduled' && (
        <div className="mb-8 sm:mb-6">
          <label className={`block text-base sm:text-sm font-semibold text-gray-800 mb-4 sm:mb-3 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
            {t('createGuide.activation.dateTime')}
          </label>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isRTL ? 'space-x-reverse' : ''}`}>
            <div>
              <label className={`block text-sm sm:text-xs font-semibold text-gray-700 mb-3 sm:mb-2 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
                {t('createGuide.activation.date')}
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
                  block w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg
                  text-base sm:text-sm font-medium text-gray-900 min-h-[48px] sm:min-h-auto
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  ${conditionalClass.textLeft}
                  ${!isValidActivation() ? 'border-red-300 bg-red-50' : ''}
                `}
              />
            </div>
            <div>
              <label className={`block text-sm sm:text-xs font-semibold text-gray-700 mb-3 sm:mb-2 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
                {t('createGuide.activation.time')}
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
                  block w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg
                  text-base sm:text-sm font-medium text-gray-900 min-h-[48px] sm:min-h-auto
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  ${conditionalClass.textLeft}
                  ${!isValidActivation() ? 'border-red-300 bg-red-50' : ''}
                `}
              />
            </div>
          </div>
          {!isValidActivation() && (
            <p className="text-xs text-red-600 mt-2">
              {t('createGuide.activation.pastDateWarning')}
            </p>
          )}

          {/* Time Picker Controls */}
          <div className="mt-4 space-y-3">
            {/* Set to Current Time Button */}
            <button
              type="button"
              onClick={setToCurrentTime}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
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
              <span>{t('createGuide.activation.setCurrentTime', 'Set to Current Time')}</span>
            </button>

            {/* Confirmation Controls - only show if there are unsaved changes */}
            {hasUnsavedChanges && (
              <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={confirmChanges}
                  disabled={disabled}
                  className={`
                    flex-1 px-4 py-2 text-sm font-medium rounded-lg
                    bg-green-600 text-white border border-green-600
                    hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none
                    transition-colors duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isRTL ? 'font-hebrew' : ''}
                  `}
                >
                  {t('createGuide.activation.confirm', 'Confirm')}
                </button>
                <button
                  type="button"
                  onClick={cancelChanges}
                  disabled={disabled}
                  className={`
                    flex-1 px-4 py-2 text-sm font-medium rounded-lg
                    bg-gray-100 text-gray-700 border border-gray-300
                    hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:outline-none
                    transition-colors duration-200
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isRTL ? 'font-hebrew' : ''}
                  `}
                >
                  {t('createGuide.activation.cancel', 'Cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Activation Preview using StatusDisplay */}
      {showPreview && (
        <div className="space-y-4">
          <h4 className={`text-base sm:text-sm font-bold text-gray-800 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
            {t('createGuide.activation.preview', 'Activation Preview')}
          </h4>

          <StatusDisplay
            event={{
              activation_date: getActivationDateTime()?.toISOString() || null,
              expiration_date: null, // No expiration in scheduler context
              status: activationMode === 'immediate' ? 'published' : 'scheduled'
            }}
            variant="detailed"
            size="md"
            className="shadow-sm"
          />

          {/* Additional scheduling context */}
          <div className={`text-sm text-gray-600 space-y-1 ${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{t('createGuide.activation.mode', 'Activation Mode')}:</span>
              <span className="font-medium">
                {activationMode === 'immediate'
                  ? t('createGuide.activation.immediate', 'Immediate')
                  : t('createGuide.activation.scheduled', 'Scheduled')
                }
              </span>
            </div>
            {activationMode === 'scheduled' && getActivationDateTime() && (
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{t('createGuide.activation.activatesAt', 'Activates at')}:</span>
                <span className="font-medium">
                  {formatDateTime(getActivationDateTime())}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 sm:mt-4 text-sm sm:text-xs text-gray-500 leading-relaxed">
        <p className={`${isRTL ? 'font-hebrew text-right' : 'text-left'}`}>
          ℹ️ {t('createGuide.activation.startTimeHelpText')}
        </p>
      </div>
    </div>
  );
};

export default ActivationScheduler;
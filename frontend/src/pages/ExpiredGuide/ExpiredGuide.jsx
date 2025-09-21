import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const ExpiredGuide = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isRTL, conditionalClass } = useLanguageDirection();

  // Extract information from location state (if available)
  const expiredInfo = location.state || {};
  const guideName = expiredInfo.event_name || t('guide.defaultName');
  const expiredAt = expiredInfo.expired_at;

  // Format expiration date if available
  const formatExpiredDate = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: !isRTL
      }).format(date);
    } catch (error) {
      return null;
    }
  };

  const formattedExpiredDate = formatExpiredDate(expiredAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10 text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-10 h-10 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M6 18L18 6M6 6l12 12" 
                opacity="0.5"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
            {t('errors.expiredTitle')}
          </h1>

          {/* Guide Name (if available) */}
          {guideName && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {guideName}
              </h2>
              {formattedExpiredDate && (
                <p className="text-sm text-gray-600">
                  {isRTL ? 'פג תוקף בתאריך:' : 'Expired on:'} {formattedExpiredDate}
                </p>
              )}
            </div>
          )}

          {/* Main Message */}
          <p className="text-gray-600 text-base lg:text-lg leading-relaxed mb-6">
            {t('errors.expiredMessage')}
          </p>

          {/* Help Message */}
          <p className="text-gray-500 text-sm lg:text-base leading-relaxed mb-8">
            {t('errors.expiredHelp')}
          </p>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => window.open('https://google.com', '_self')}
              className="w-full max-w-xs bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('common.ok')}
            </button>
          </div>
        </div>

        {/* Additional Help Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className={`flex items-start space-x-4 ${isRTL ? 'space-x-reverse flex-row-reverse' : ''}`}>
            <div className="flex-shrink-0">
              <svg 
                className="w-6 h-6 text-blue-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">
                {isRTL ? 'מידע נוסף' : 'Additional Information'}
              </h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                {isRTL 
                  ? 'הכוונות פגות תוקף מטעמי אבטחה ולמניעת שימוש בקישורים ישנים. המארגן יכול ליצור הכוונה חדשה או לחדש את הקיימת.'
                  : 'Guides expire for security reasons and to prevent the use of outdated links. The organizer can create a new guide or renew the existing one.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            {isRTL ? 'מופעל על ידי' : 'Powered by'} TrailGuide PWA
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpiredGuide;
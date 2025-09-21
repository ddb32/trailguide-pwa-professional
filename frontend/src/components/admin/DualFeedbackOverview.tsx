import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Icon } from '../common/Icon';

// Types for dual feedback data structure
interface DualFeedbackData {
  guideFeedback: {
    totalResponses: number;
    helpfulRate: number;
    helpfulCount: number;
    notHelpfulCount: number;
    recentComments: Array<{
      id: string;
      guideId: string;
      guideName: string;
      organizerName: string;
      helpful: boolean;
      feedbackText?: string;
      submittedAt: string;
    }>;
  };
  conceptFeedback: {
    totalResponses: number;
    positiveRate: number;
    positiveCount: number;
    negativeCount: number;
    recentComments: Array<{
      id: string;
      guideId: string;
      conceptLiked: boolean;
      feedbackText?: string;
      submittedAt: string;
    }>;
  };
  combined: {
    totalResponses: number;
    thisWeekCount: number;
    activeResponseRate: number;
  };
}

interface DualFeedbackOverviewProps {
  data?: DualFeedbackData;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

// Metric card component for consistent display
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  colorClass: string;
  isLoading?: boolean;
}> = ({ title, value, subtitle, icon, colorClass, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-xl animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3"></div>
        <div className="h-8 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className={`text-center p-6 rounded-xl transition-all duration-200 hover:shadow-md ${colorClass}`}>
      <div className="flex justify-center mb-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          colorClass.includes('blue') ? 'bg-blue-100' :
          colorClass.includes('green') ? 'bg-green-100' :
          colorClass.includes('purple') ? 'bg-purple-100' : 'bg-gray-100'
        }`}>
          <Icon
            name={icon}
            size="lg"
            className={
              colorClass.includes('blue') ? 'text-blue-600' :
              colorClass.includes('green') ? 'text-green-600' :
              colorClass.includes('purple') ? 'text-purple-600' : 'text-gray-600'
            }
          />
        </div>
      </div>
      <div className={`text-3xl font-bold mb-2 ${
        colorClass.includes('blue') ? 'text-blue-600' :
        colorClass.includes('green') ? 'text-green-600' :
        colorClass.includes('purple') ? 'text-purple-600' : 'text-gray-600'
      }`}>
        {value}
      </div>
      <div className={`text-sm font-medium ${
        colorClass.includes('blue') ? 'text-blue-700' :
        colorClass.includes('green') ? 'text-green-700' :
        colorClass.includes('purple') ? 'text-purple-700' : 'text-gray-700'
      }`}>
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
};

// Recent feedback item component
const RecentFeedbackItem: React.FC<{
  type: 'guide' | 'concept';
  feedback: any;
  isRTL: boolean;
}> = ({ type, feedback, isRTL }) => {
  const { t } = useTranslation();

  const getIcon = () => {
    if (type === 'guide') {
      return feedback.helpful ? '✅' : '❌';
    } else {
      return feedback.conceptLiked ? '👍' : '👎';
    }
  };

  const getColorClass = () => {
    if (type === 'guide') {
      return feedback.helpful ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
    } else {
      return feedback.conceptLiked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorClass()}`}>
            {getIcon()}
          </span>
          {type === 'guide' && feedback.guideName && (
            <span className="text-xs text-gray-600 font-medium">
              {feedback.guideName}
            </span>
          )}
          {type === 'guide' && feedback.organizerName && (
            <span className="text-xs text-gray-500">
              • {feedback.organizerName}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {new Date(feedback.submittedAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
        </span>
      </div>
      {feedback.feedbackText && (
        <p className="text-sm text-gray-700 italic">
          "{feedback.feedbackText}"
        </p>
      )}
    </div>
  );
};

export const DualFeedbackOverview: React.FC<DualFeedbackOverviewProps> = ({
  data,
  isLoading = false,
  error = null,
  className = ''
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();

  if (error) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 border border-gray-100 ${className}`}>
        <div className="text-center py-8">
          <Icon name="alert-circle" size="xl" className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{t('admin.feedback.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('admin.feedback.dualSystem.title')}
            </h3>
            <p className="text-gray-600">
              {t('admin.feedback.dualSystem.subtitle')}
            </p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Icon name="analytics" size="xl" className="text-white" />
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Guide Quality Metrics */}
          <MetricCard
            title={t('admin.feedback.dualSystem.guideQuality')}
            value={isLoading ? '...' : data?.guideFeedback ? `${Math.round(data.guideFeedback.helpfulRate * 100)}%` : '0%'}
            subtitle={isLoading ? '' : data?.guideFeedback ?
              t('admin.feedback.dualSystem.fromResponses', { count: data.guideFeedback.totalResponses }) :
              t('admin.feedback.dualSystem.noFeedbackYet')
            }
            icon="check-circle"
            colorClass="bg-blue-50 border border-blue-100"
            isLoading={isLoading}
          />

          {/* App Concept Metrics */}
          <MetricCard
            title={t('admin.feedback.dualSystem.conceptValidation')}
            value={isLoading ? '...' : data?.conceptFeedback ? `${Math.round(data.conceptFeedback.positiveRate * 100)}%` : '0%'}
            subtitle={isLoading ? '' : data?.conceptFeedback ?
              t('admin.feedback.dualSystem.fromResponses', { count: data.conceptFeedback.totalResponses }) :
              t('admin.feedback.dualSystem.noFeedbackYet')
            }
            icon="lightbulb"
            colorClass="bg-green-50 border border-green-100"
            isLoading={isLoading}
          />

          {/* Total Responses */}
          <MetricCard
            title={t('admin.feedback.dualSystem.totalResponses')}
            value={isLoading ? '...' : data?.combined ? data.combined.totalResponses.toString() : '0'}
            subtitle={isLoading ? '' : data?.combined ?
              t('admin.feedback.thisWeek') + ': ' + data.combined.thisWeekCount :
              t('admin.feedback.dualSystem.collectingData')
            }
            icon="message-square"
            colorClass="bg-purple-50 border border-purple-100"
            isLoading={isLoading}
          />
        </div>

        {/* Recent Feedback Sections */}
        {!isLoading && data && (data.guideFeedback.recentComments.length > 0 || data.conceptFeedback.recentComments.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Guide Feedback */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin.feedback.dualSystem.guideFeedbackTitle')}
              </h4>
              <div className="space-y-3">
                {data.guideFeedback.recentComments.length > 0 ? (
                  data.guideFeedback.recentComments.slice(0, 3).map((feedback) => (
                    <RecentFeedbackItem
                      key={feedback.id}
                      type="guide"
                      feedback={feedback}
                      isRTL={isRTL}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    {t('admin.feedback.organizer.noComments')}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Concept Feedback */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {t('admin.feedback.dualSystem.conceptFeedbackTitle')}
              </h4>
              <div className="space-y-3">
                {data.conceptFeedback.recentComments.length > 0 ? (
                  data.conceptFeedback.recentComments.slice(0, 3).map((feedback) => (
                    <RecentFeedbackItem
                      key={feedback.id}
                      type="concept"
                      feedback={feedback}
                      isRTL={isRTL}
                    />
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    {t('admin.feedback.organizer.noComments')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && (!data || (data.guideFeedback.recentComments.length === 0 && data.conceptFeedback.recentComments.length === 0)) && (
          <div className="text-center py-12">
            <Icon name="message-circle" size="3xl" className="text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {t('admin.feedback.dualSystem.noFeedbackYet')}
            </h4>
            <p className="text-gray-500">
              {t('admin.feedback.insights.collectingData')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DualFeedbackOverview;
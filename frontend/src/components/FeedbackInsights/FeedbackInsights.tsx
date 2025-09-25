import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button/Button';

export interface FeedbackData {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  positiveFeedbackRate: number;
  negativeFeedbackRate: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulRate: number;
}

export interface GuideWithFeedback {
  id: string;
  name: string;
  feedbackCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionRate: number;
  lastFeedback?: string;
}

export interface FeedbackInsightsProps {
  feedbackData: FeedbackData;
  guides?: GuideWithFeedback[];
  isLoading?: boolean;
  className?: string;
  onViewDetails?: () => void;
}

// Professional Feedback Insights Component
const FeedbackInsights: React.FC<FeedbackInsightsProps> = ({
  feedbackData,
  guides = [],
  isLoading = false,
  className = '',
  onViewDetails
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [showDetails, setShowDetails] = useState(false);

  // Calculate summary metrics with safe numeric conversions
  const summaryMetrics = useMemo(() => {
    const { totalFeedback, positiveFeedback, negativeFeedback, positiveFeedbackRate } = feedbackData;
    const safeRate = Number(positiveFeedbackRate) || 0;

    return {
      totalFeedback: Number(totalFeedback) || 0,
      satisfactionRate: safeRate,
      trend: safeRate > 75 ? 'excellent' : safeRate > 50 ? 'good' : 'needs-improvement',
      mostActiveGuide: guides.length > 0 ? guides.reduce((max, guide) =>
        guide.feedbackCount > max.feedbackCount ? guide : max, guides[0]
      ) : null
    };
  }, [feedbackData, guides]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (summaryMetrics.totalFeedback === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mb-4">
            <Icon name="feedback" size="md" className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('dashboard.feedback.noFeedbackYet', 'No feedback yet')}
          </h3>
          <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
            {t('dashboard.feedback.encourageFeedback', 'Once users complete your guides, their feedback will appear here to help you improve.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <Icon name="feedback" size="md" className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.feedback.insightsTitle', 'Feedback Insights')}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('dashboard.feedback.insightsSubtitle', 'User satisfaction and feedback analysis')}
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            icon={<Icon name={showDetails ? "chevron-up" : "chevron-down"} size="sm" />}
            iconPosition="right"
            className="text-gray-600"
          >
            {showDetails ? t('common.showLess') : t('dashboard.feedback.viewDetails', 'View Details')}
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Total Feedback */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {summaryMetrics.totalFeedback}
            </div>
            <div className="text-sm text-gray-600">
              {t('dashboard.feedback.totalResponses', 'Total Responses')}
            </div>
          </div>

          {/* Satisfaction Rate */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {(Number(summaryMetrics.satisfactionRate) || 0).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">
              {t('dashboard.feedback.satisfactionRate', 'Satisfaction Rate')}
            </div>
          </div>

          {/* Trend Indicator */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              summaryMetrics.trend === 'excellent' ? 'bg-green-100 text-green-700' :
              summaryMetrics.trend === 'good' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              <Icon
                name={
                  summaryMetrics.trend === 'excellent' ? 'trending-up' :
                  summaryMetrics.trend === 'good' ? 'check' : 'alert-triangle'
                }
                size="xs"
              />
              {summaryMetrics.trend === 'excellent' ? t('dashboard.feedback.excellent', 'Excellent') :
               summaryMetrics.trend === 'good' ? t('dashboard.feedback.good', 'Good') :
               t('dashboard.feedback.needsImprovement', 'Needs Improvement')}
            </div>
          </div>
        </div>

        {/* Satisfaction Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t('dashboard.feedback.overallSatisfaction', 'Overall Satisfaction')}
            </span>
            <span className="text-sm text-gray-600">
              {feedbackData.positiveFeedback} {t('dashboard.feedback.positive', 'positive')} • {feedbackData.negativeFeedback} {t('dashboard.feedback.negative', 'negative')}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${summaryMetrics.satisfactionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Best Performing Guide */}
        {summaryMetrics.mostActiveGuide && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon name="star" size="sm" className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 mb-1">
                  {t('dashboard.feedback.topPerformer', 'Top Performing Guide')}
                </div>
                <div className="text-sm text-blue-700">
                  "{summaryMetrics.mostActiveGuide.name}" • {summaryMetrics.mostActiveGuide.feedbackCount} {t('dashboard.feedback.responses', 'responses')}
                  • {summaryMetrics.mostActiveGuide.satisfactionRate.toFixed(0)}% {t('dashboard.feedback.satisfaction', 'satisfaction')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Guide Breakdown */}
      {showDetails && guides.length > 0 && (
        <div className="border-t border-gray-100 p-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('dashboard.feedback.perGuideBreakdown', 'Per Guide Breakdown')}
          </h4>
          <div className="space-y-3">
            {guides.slice(0, 5).map((guide) => (
              <div key={guide.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {guide.name || t('dashboard.table.unnamedGuide', 'Unnamed Guide')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {guide.feedbackCount} {t('dashboard.feedback.responses', 'responses')} •
                    {guide.positiveFeedback} {t('dashboard.feedback.positive', 'positive')} •
                    {guide.negativeFeedback} {t('dashboard.feedback.negative', 'negative')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    guide.satisfactionRate >= 75 ? 'bg-green-100 text-green-700' :
                    guide.satisfactionRate >= 50 ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {guide.satisfactionRate.toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}

            {guides.length > 5 && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDetails}
                  className="text-gray-600"
                >
                  {t('dashboard.feedback.viewAllGuides', 'View All Guides')} ({guides.length - 5} {t('common.more', 'more')})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackInsights;
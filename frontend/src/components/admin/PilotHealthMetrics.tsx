import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Icon } from '../common/Icon';

// Types for pilot health metrics
interface PilotHealthData {
  engagement: {
    activeUsers: number;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionTime: number;
    guideCompletionRate: number;
    feedbackParticipationRate: number;
  };
  content: {
    totalGuides: number;
    activeGuides: number;
    averageGuideLength: number;
    guidesWithFeedback: number;
    averageRating: number;
    topPerformingGuides: Array<{
      id: string;
      name: string;
      organizerName: string;
      helpfulRate: number;
      responseCount: number;
    }>;
  };
  growth: {
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    userGrowthRate: number;
    guideCreationRate: number;
    feedbackGrowthRate: number;
  };
  health: {
    overallScore: number;
    engagementScore: number;
    contentScore: number;
    growthScore: number;
    issues: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      metric: string;
      value: number;
      threshold: number;
    }>;
  };
}

interface PilotHealthMetricsProps {
  data?: PilotHealthData;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

// Health score indicator component
const HealthScore: React.FC<{
  score: number;
  label: string;
  isLoading?: boolean;
}> = ({ score, label, isLoading = false }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return 'check-circle';
    if (score >= 60) return 'alert-triangle';
    if (score >= 40) return 'alert-circle';
    return 'x-circle';
  };

  if (isLoading) {
    return (
      <div className="text-center p-4 animate-pulse">
        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 mb-2 ${getScoreColor(score)}`}>
        <Icon name={getScoreIcon(score)} size="lg" />
      </div>
      <div className={`text-2xl font-bold ${getScoreColor(score).split(' ')[0]}`}>
        {Math.round(score)}
      </div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
    </div>
  );
};

// Metric card for engagement data
const EngagementMetric: React.FC<{
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
}> = ({ icon, label, value, subtitle, trend, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded mb-1"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'minus';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
          <Icon name={icon} size="sm" className="text-blue-600" />
        </div>
        {trend && (
          <Icon name={getTrendIcon()} size="sm" className={getTrendColor()} />
        )}
      </div>
      <div className="text-xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
};

// Health issue alert component
const HealthIssue: React.FC<{
  issue: PilotHealthData['health']['issues'][0];
  isRTL: boolean;
}> = ({ issue, isRTL }) => {
  const { t } = useTranslation();

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info': return 'border-blue-200 bg-blue-50 text-blue-800';
      default: return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return 'x-circle';
      case 'warning': return 'alert-triangle';
      case 'info': return 'info';
      default: return 'help-circle';
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getIssueColor(issue.type)}`}>
      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Icon name={getIssueIcon(issue.type)} size="sm" className="mt-0.5" />
        <div className="flex-1">
          <div className="font-medium text-sm">{issue.message}</div>
          <div className="text-xs mt-1 opacity-75">
            {t('admin.feedback.health.currentValue')}: {issue.value} |
            {t('admin.feedback.health.threshold')}: {issue.threshold}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PilotHealthMetrics: React.FC<PilotHealthMetricsProps> = ({
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
              {t('admin.feedback.health.title')}
            </h3>
            <p className="text-gray-600">
              {t('admin.feedback.health.subtitle')}
            </p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Icon name="activity" size="xl" className="text-white" />
          </div>
        </div>
      </div>

      {/* Health Score Overview */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {t('admin.feedback.health.overallHealth')}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <HealthScore
            score={isLoading ? 0 : data?.health?.overallScore || 0}
            label={t('admin.feedback.health.overall')}
            isLoading={isLoading}
          />
          <HealthScore
            score={isLoading ? 0 : data?.health?.engagementScore || 0}
            label={t('admin.feedback.health.engagement')}
            isLoading={isLoading}
          />
          <HealthScore
            score={isLoading ? 0 : data?.health?.contentScore || 0}
            label={t('admin.feedback.health.content')}
            isLoading={isLoading}
          />
          <HealthScore
            score={isLoading ? 0 : data?.health?.growthScore || 0}
            label={t('admin.feedback.health.growth')}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {t('admin.feedback.health.engagementMetrics')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EngagementMetric
            icon="users"
            label={t('admin.feedback.health.activeUsers')}
            value={isLoading ? '...' : data?.engagement?.activeUsers?.toString() || '0'}
            subtitle={t('admin.feedback.health.daily')}
            isLoading={isLoading}
          />
          <EngagementMetric
            icon="clock"
            label={t('admin.feedback.health.avgSessionTime')}
            value={isLoading ? '...' : data?.engagement?.averageSessionTime ? `${Math.round(data.engagement.averageSessionTime)}m` : '0m'}
            isLoading={isLoading}
          />
          <EngagementMetric
            icon="check-circle"
            label={t('admin.feedback.health.completionRate')}
            value={isLoading ? '...' : data?.engagement?.guideCompletionRate ? `${Math.round(data.engagement.guideCompletionRate * 100)}%` : '0%'}
            isLoading={isLoading}
          />
          <EngagementMetric
            icon="message-square"
            label={t('admin.feedback.health.feedbackRate')}
            value={isLoading ? '...' : data?.engagement?.feedbackParticipationRate ? `${Math.round(data.engagement.feedbackParticipationRate * 100)}%` : '0%'}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Content Performance */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          {t('admin.feedback.health.contentPerformance')}
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {isLoading ? '...' : data?.content?.totalGuides || 0}
                </div>
                <div className="text-sm text-blue-700 font-medium">
                  {t('admin.feedback.health.totalGuides')}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {isLoading ? '...' : data?.content?.activeGuides || 0}
                </div>
                <div className="text-sm text-green-700 font-medium">
                  {t('admin.feedback.health.activeGuides')}
                </div>
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {isLoading ? '...' : data?.content?.averageRating ? `${data.content.averageRating.toFixed(1)}/5` : 'N/A'}
              </div>
              <div className="text-sm text-purple-700 font-medium">
                {t('admin.feedback.health.avgRating')}
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-3">
              {t('admin.feedback.health.topGuides')}
            </h5>
            <div className="space-y-2">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded p-3 h-16"></div>
                ))
              ) : data?.content?.topPerformingGuides?.slice(0, 3).map(guide => (
                <div key={guide.id} className="bg-gray-50 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{guide.name}</div>
                      <div className="text-xs text-gray-600">{guide.organizerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">{Math.round(guide.helpfulRate * 100)}%</div>
                      <div className="text-xs text-gray-500">{guide.responseCount} responses</div>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {t('admin.feedback.health.noTopGuides')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Health Issues */}
      {!isLoading && data?.health?.issues && data.health.issues.length > 0 && (
        <div className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.feedback.health.issuesAndAlerts')}
          </h4>
          <div className="space-y-3">
            {data.health.issues.map((issue, index) => (
              <HealthIssue
                key={index}
                issue={issue}
                isRTL={isRTL}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Issues State */}
      {!isLoading && (!data?.health?.issues || data.health.issues.length === 0) && (
        <div className="p-6">
          <div className="text-center py-8">
            <Icon name="check-circle" size="xl" className="text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {t('admin.feedback.health.allGood')}
            </h4>
            <p className="text-gray-500">
              {t('admin.feedback.health.noIssuesDetected')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PilotHealthMetrics;
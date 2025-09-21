import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { Icon } from '../common/Icon';

// Types for organizer performance data
interface OrganizerGuidePerformance {
  guideId: string;
  guideName: string;
  organizerId: string;
  organizerName: string;
  organizerUsername: string;
  totalResponses: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulRate: number;
  recentComments: Array<{
    id: string;
    helpful: boolean;
    feedbackText?: string;
    submittedAt: string;
  }>;
  lastFeedbackAt?: string;
  guideStatus: 'active' | 'expired' | 'draft';
}

interface OrganizerPerformanceData {
  guides: OrganizerGuidePerformance[];
  summary: {
    totalOrganizers: number;
    totalGuidesWithFeedback: number;
    averageHelpfulRate: number;
    totalFeedbackResponses: number;
  };
}

interface OrganizerPerformanceProps {
  data?: OrganizerPerformanceData;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

// Performance card for individual guide
const GuidePerformanceCard: React.FC<{
  guide: OrganizerGuidePerformance;
  isRTL: boolean;
}> = ({ guide, isRTL }) => {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);

  const getHelpfulRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (rate >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expired': return 'text-gray-600 bg-gray-100';
      case 'draft': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900">{guide.guideName}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(guide.guideStatus)}`}>
              {guide.guideStatus}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {t('admin.feedback.organizer.organizerName')}: {guide.organizerName}
          </p>
        </div>
        <div className={`text-right ${isRTL ? 'text-left' : ''}`}>
          <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${getHelpfulRateColor(guide.helpfulRate)}`}>
            <span className="text-lg font-bold">
              {Math.round(guide.helpfulRate * 100)}%
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('admin.feedback.organizer.responseCount', { count: guide.totalResponses })}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{guide.helpfulCount}</div>
          <div className="text-xs text-green-700 font-medium">{t('feedback.helpful')}</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{guide.notHelpfulCount}</div>
          <div className="text-xs text-orange-700 font-medium">{t('feedback.notHelpful')}</div>
        </div>
      </div>

      {/* Recent Feedback Toggle */}
      {guide.recentComments.length > 0 && (
        <div>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <span>{t('admin.feedback.organizer.recentComments')} ({guide.recentComments.length})</span>
            <Icon
              name={showComments ? 'chevron-up' : 'chevron-down'}
              size="sm"
              className="transition-transform duration-200"
            />
          </button>

          {showComments && (
            <div className="mt-3 space-y-2">
              {guide.recentComments.slice(0, 3).map((comment, index) => (
                <div key={index} className="bg-gray-50 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      comment.helpful ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {comment.helpful ? '✅' : '❌'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.submittedAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
                    </span>
                  </div>
                  {comment.feedbackText && (
                    <p className="text-xs text-gray-700 italic">
                      "{comment.feedbackText}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last Activity */}
      {guide.lastFeedbackAt && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {t('admin.feedback.organizer.recentComments')}: {new Date(guide.lastFeedbackAt).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
          </div>
        </div>
      )}
    </div>
  );
};

export const OrganizerPerformance: React.FC<OrganizerPerformanceProps> = ({
  data,
  isLoading = false,
  error = null,
  className = ''
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'responses'>('performance');

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

  const sortedGuides = data?.guides ? [...data.guides].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.guideName.localeCompare(b.guideName);
      case 'performance':
        return b.helpfulRate - a.helpfulRate;
      case 'responses':
        return b.totalResponses - a.totalResponses;
      default:
        return 0;
    }
  }) : [];

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
        <div className="p-6 border-b border-gray-100">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
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
              {t('admin.feedback.organizer.title')}
            </h3>
            <p className="text-gray-600">
              {t('admin.feedback.organizer.subtitle')}
            </p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Icon name="users" size="xl" className="text-white" />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{data.summary.totalOrganizers}</div>
              <div className="text-sm text-gray-600">{t('admin.feedback.organizer.organizerName')}s</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{data.summary.totalGuidesWithFeedback}</div>
              <div className="text-sm text-gray-600">{t('admin.feedback.organizer.guideName')}s</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(data.summary.averageHelpfulRate * 100)}%
              </div>
              <div className="text-sm text-gray-600">{t('admin.feedback.dualSystem.helpfulRate')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{data.summary.totalFeedbackResponses}</div>
              <div className="text-sm text-gray-600">{t('admin.feedback.dualSystem.totalResponses')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {data ? t('admin.feedback.organizer.responseCount', { count: data.guides.length }) : ''}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="performance">{t('admin.feedback.dualSystem.helpfulRate')}</option>
              <option value="responses">{t('admin.feedback.dualSystem.totalResponses')}</option>
              <option value="name">{t('admin.feedback.organizer.guideName')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guide Performance Grid */}
      <div className="p-6">
        {sortedGuides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedGuides.map((guide) => (
              <GuidePerformanceCard
                key={guide.guideId}
                guide={guide}
                isRTL={isRTL}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Icon name="folder" size="3xl" className="text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {t('admin.feedback.organizer.noGuides')}
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

export default OrganizerPerformance;
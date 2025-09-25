import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { useAdminAnalytics } from '../../../hooks/useAdminAnalytics';
import { Icon } from '../../common/Icon';
import { Button } from '../../common/Button/Button';

interface Organizer {
  organizer_id: string;
  username: string;
  name: string;
  email: string;
  joined_at: string;
  metrics: {
    total_guides: number;
    published_guides: number;
    active_guides: number;
    total_feedback_received: number;
    guide_feedback_count: number;
    founder_feedback_count: number;
    avg_helpful_rate: number;
    avg_like_rate: number;
    total_views: number;
    total_completions: number;
    avg_completion_rate: number;
    last_feedback_received: string | null;
  };
}

interface Guide {
  guide_id: string;
  guide_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  activation_date: string | null;
  expiration_date: string | null;
  steps_count: number;
  analytics: {
    total_views: number;
    unique_visitors: number;
    total_completions: number;
    completion_rate: number;
    total_feedback: number;
    guide_feedback_count: number;
    founder_feedback_count: number;
    helpful_count: number;
    not_helpful_count: number;
    liked_count: number;
    disliked_count: number;
    helpful_rate: number;
    like_rate: number;
    last_feedback_at: string | null;
  };
}

interface DetailedGuideAnalytics {
  guide: {
    id: string;
    name: string;
    status: string;
    created_at: string;
    organizer: {
      id: string;
      username: string;
      name: string;
    };
    performance: {
      total_views: number;
      unique_visitors: number;
      total_completions: number;
      completion_rate: number;
    };
  };
  feedback_overview: {
    total_feedback: number;
    guide_feedback_count: number;
    founder_feedback_count: number;
    unique_respondents: number;
    text_feedback_count: number;
    feedback_period: {
      first_feedback_at: string | null;
      last_feedback_at: string | null;
      active_feedback_days: number;
    };
  };
  guide_feedback_metrics: {
    helpful_stats: {
      total_responses: number;
      helpful_count: number;
      not_helpful_count: number;
      helpful_rate: number;
    };
    like_stats: {
      total_responses: number;
      liked_count: number;
      disliked_count: number;
      like_rate: number;
    };
  };
  founder_feedback_metrics: {
    rating_counts: {
      overall_rating_count: number;
      concept_rating_count: number;
      presentation_rating_count: number;
    };
    rating_averages: {
      avg_overall_rating: number | null;
      avg_concept_rating: number | null;
      avg_presentation_rating: number | null;
    };
    recommendation: {
      recommend_yes_count: number;
      recommend_total_count: number;
      recommend_rate: number;
    };
  };
  recent_feedback: Array<{
    id: string;
    feedback_type: string;
    liked: boolean | null;
    helpful: boolean | null;
    overall_rating: string | null;
    concept_rating: string | null;
    presentation_rating: string | null;
    recommend_rating: string | null;
    feedback_text: string | null;
    submitted_at: string;
    visitor_info: {
      visitor_id: string;
      device_type: string | null;
      browser_name: string | null;
      country_code: string | null;
      guide_completed: boolean;
    };
  }>;
  daily_breakdown: Array<{
    date: string;
    total_count: number;
    guide_count: number;
    founder_count: number;
    helpful_count: number;
    liked_count: number;
  }>;
}

type ViewMode = 'organizers' | 'guides' | 'detailed';

const UserFocusedAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();

  // Admin analytics for recent feedback comments
  const { feedbackStats } = useAdminAnalytics({ days: 30 });

  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('organizers');
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  // Data state
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [detailedAnalytics, setDetailedAnalytics] = useState<DetailedGuideAnalytics | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [days, setDays] = useState(30);

  // Fetch organizers list
  const fetchOrganizers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        search: searchTerm.trim(),
        limit: '50'
      });

      const response = await fetch(`/api/v1/admin/analytics/organizers?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizers');
      }

      const result = await response.json();
      setOrganizers(result.data.organizers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizers');
      setOrganizers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch guides for selected organizer
  const fetchOrganizerGuides = async (organizerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        status: 'all'
      });

      const response = await fetch(`/api/v1/admin/analytics/organizer/${organizerId}/guides?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizer guides');
      }

      const result = await response.json();
      setGuides(result.data.guides);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guides');
      setGuides([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch detailed analytics for selected guide
  const fetchDetailedAnalytics = async (guideId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        feedback_type: 'all'
      });

      const response = await fetch(`/api/v1/admin/analytics/guide/${guideId}/feedback-detailed?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch detailed analytics');
      }

      const result = await response.json();
      setDetailedAnalytics(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detailed analytics');
      setDetailedAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle organizer selection
  const handleSelectOrganizer = (organizer: Organizer) => {
    setSelectedOrganizer(organizer);
    setSelectedGuide(null);
    setDetailedAnalytics(null);
    setViewMode('guides');
    fetchOrganizerGuides(organizer.organizer_id);
  };

  // Handle guide selection
  const handleSelectGuide = (guide: Guide) => {
    setSelectedGuide(guide);
    setViewMode('detailed');
    fetchDetailedAnalytics(guide.guide_id);
  };

  // Handle navigation back
  const handleNavigateBack = () => {
    if (viewMode === 'detailed') {
      setViewMode('guides');
      setSelectedGuide(null);
      setDetailedAnalytics(null);
    } else if (viewMode === 'guides') {
      setViewMode('organizers');
      setSelectedOrganizer(null);
      setGuides([]);
    }
  };

  // Initialize data
  useEffect(() => {
    if (viewMode === 'organizers') {
      fetchOrganizers();
    }
  }, [viewMode, searchTerm, days]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common.never');
    return new Date(dateString).toLocaleDateString();
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {viewMode !== 'organizers' && (
              <Button
                onClick={handleNavigateBack}
                variant="secondary"
                size="sm"
                className="flex items-center"
              >
                <Icon
                  name={isRTL ? "arrow-right" : "arrow-left"}
                  size="sm"
                  className={isRTL ? "ml-1" : "mr-1"}
                />
                {t('common.back')}
              </Button>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {viewMode === 'organizers' && t('admin.userFocused.title')}
                {viewMode === 'guides' && t('admin.userFocused.guidesTitle', { organizer: selectedOrganizer?.username })}
                {viewMode === 'detailed' && t('admin.userFocused.detailsTitle', { guide: selectedGuide?.guide_name })}
              </h2>
              <p className="text-sm text-gray-600">
                {viewMode === 'organizers' && t('admin.userFocused.subtitle')}
                {viewMode === 'guides' && t('admin.userFocused.guidesSubtitle')}
                {viewMode === 'detailed' && t('admin.userFocused.detailsSubtitle')}
              </p>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className={viewMode === 'organizers' ? 'text-gray-900 font-medium' : 'cursor-pointer hover:text-gray-700'}
                  onClick={() => viewMode !== 'organizers' && setViewMode('organizers')}>
              {t('admin.userFocused.allOrganizers')}
            </span>
            {selectedOrganizer && (
              <>
                <Icon name="chevron-right" size="xs" />
                <span className={viewMode === 'guides' ? 'text-gray-900 font-medium' : 'cursor-pointer hover:text-gray-700'}
                      onClick={() => viewMode === 'detailed' && setViewMode('guides')}>
                  {selectedOrganizer.username}
                </span>
              </>
            )}
            {selectedGuide && (
              <>
                <Icon name="chevron-right" size="xs" />
                <span className="text-gray-900 font-medium">
                  {selectedGuide.guide_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        {viewMode === 'organizers' && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('admin.userFocused.searchOrganizers')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder={t('admin.userFocused.searchPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('admin.userFocused.timePeriod')}
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={7}>{t('admin.userFocused.last7Days')}</option>
                <option value={30}>{t('admin.userFocused.last30Days')}</option>
                <option value={90}>{t('admin.userFocused.last90Days')}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <Icon name="warning" size="sm" className="text-red-400 mr-2 mt-0.5" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span className="text-sm text-gray-600">{t('common.loading')}</span>
          </div>
        </div>
      ) : (
        <>
          {/* Organizers View */}
          {viewMode === 'organizers' && (
            <>
            <div className="space-y-4">
              {organizers.length > 0 ? (
                organizers.map((organizer) => (
                  <div
                    key={organizer.organizer_id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectOrganizer(organizer)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {organizer.name || organizer.username}
                          </h3>
                          <span className="text-sm text-gray-500">
                            @{organizer.username}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.totalGuides')}</span>
                            <p className="text-sm font-medium">{organizer.metrics.total_guides}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.totalFeedback')}</span>
                            <p className="text-sm font-medium">{organizer.metrics.total_feedback_received}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.helpfulRate')}</span>
                            <p className="text-sm font-medium">{formatPercentage(organizer.metrics.avg_helpful_rate)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.totalViews')}</span>
                            <p className="text-sm font-medium">{organizer.metrics.total_views.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <Icon name="chevron-right" size="sm" className="text-gray-400 mt-1" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Icon name="users" size="2xl" className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('admin.userFocused.noOrganizers')}</p>
                </div>
              )}
            </div>

            {/* Global Idea Feedback Overview */}
            {feedbackStats?.statistics && (
              <div className="mt-8 bg-white rounded-xl shadow-desktop p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('admin.feedback.conceptFeedback.title')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {t('admin.feedback.conceptFeedback.subtitle')}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Icon name="feedback" size="xl" className="text-white" ariaHidden />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Positive Feedback */}
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {feedbackStats.statistics.like_stats?.likes || '0'}
                    </div>
                    <div className="text-sm text-green-700 font-medium">
                      {t('admin.feedback.conceptFeedback.likeIdea')}
                    </div>
                  </div>

                  {/* Negative Feedback */}
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {feedbackStats.statistics.like_stats?.dislikes || '0'}
                    </div>
                    <div className="text-sm text-red-700 font-medium">
                      {t('admin.feedback.conceptFeedback.dislikeIdea')}
                    </div>
                  </div>

                  {/* Approval Rate */}
                  <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {feedbackStats.statistics.like_stats?.like_rate
                        ? `${Math.round(feedbackStats.statistics.like_stats.like_rate * 100)}%`
                        : '0%'}
                    </div>
                    <div className="text-sm text-purple-700 font-medium">
                      {t('admin.feedback.conceptFeedback.approvalRate')}
                    </div>
                  </div>
                </div>

                {/* Additional Statistics */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {(feedbackStats.statistics.like_stats?.likes || 0) + (feedbackStats.statistics.like_stats?.dislikes || 0)}
                      </div>
                      <div className="text-xs text-gray-600">{t('admin.feedback.conceptFeedback.totalResponses')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {feedbackStats.statistics.helpful_stats?.helpful || '0'}
                      </div>
                      <div className="text-xs text-gray-600">{t('admin.feedback.guideFeedback.helpful')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {feedbackStats.statistics.helpful_stats?.not_helpful || '0'}
                      </div>
                      <div className="text-xs text-gray-600">{t('admin.feedback.guideFeedback.notHelpful')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        {feedbackStats.statistics.helpful_stats?.helpful_rate
                          ? `${Math.round(feedbackStats.statistics.helpful_stats.helpful_rate * 100)}%`
                          : '0%'}
                      </div>
                      <div className="text-xs text-gray-600">{t('admin.feedback.guideFeedback.helpfulRate')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Feedback Comments - Global View */}
            {feedbackStats?.feedback && feedbackStats.feedback.length > 0 && (
              <div className="mt-8 bg-white rounded-xl shadow-desktop p-6 border border-gray-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">
                  {t('admin.feedback.recentComments.title')}
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {feedbackStats.feedback.slice(0, 6).map((feedback, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      {/* Header with badges and date */}
                      <div className="flex flex-col space-y-2 mb-3">
                        {/* Date - Always on top for mobile */}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(feedback.submitted_at).toLocaleDateString('he-IL')}
                          </span>
                        </div>

                        {/* Badges - Stack on mobile, inline on desktop */}
                        <div className="flex flex-wrap gap-1.5">
                          {feedback.helpful !== null && (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              feedback.helpful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {feedback.helpful ? t('admin.feedback.labels.helpful') : t('admin.feedback.labels.notHelpful')}
                            </span>
                          )}
                          {feedback.liked !== null && (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              feedback.liked ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {feedback.liked ? t('admin.feedback.labels.likeIdea') : t('admin.feedback.labels.dislikeIdea')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Feedback text */}
                      {feedback.feedback_text && (
                        <p className="text-sm text-gray-700 italic leading-relaxed mb-2">
                          "{feedback.feedback_text}"
                        </p>
                      )}

                      {/* Guide reference */}
                      {feedback.guide && (
                        <p className="text-xs text-gray-500 truncate">
                          <span className="font-medium">{t('admin.feedback.labels.guide')}</span> {feedback.guide.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
          )}

          {/* Guides View */}
          {viewMode === 'guides' && selectedOrganizer && (
            <div className="space-y-4">
              {guides.length > 0 ? (
                guides.map((guide) => (
                  <div
                    key={guide.guide_id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectGuide(guide)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {guide.guide_name}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(guide.status)}`}>
                            {t(`admin.guides.status.${guide.status}`)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.views')}</span>
                            <p className="text-sm font-medium">{guide.analytics.total_views}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.feedback')}</span>
                            <p className="text-sm font-medium">{guide.analytics.total_feedback}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.helpfulRate')}</span>
                            <p className="text-sm font-medium">{formatPercentage(guide.analytics.helpful_rate)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.likeRate')}</span>
                            <p className="text-sm font-medium">{formatPercentage(guide.analytics.like_rate)}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">{t('admin.userFocused.completionRate')}</span>
                            <p className="text-sm font-medium">{formatPercentage(guide.analytics.completion_rate)}</p>
                          </div>
                        </div>
                      </div>

                      <Icon name="chevron-right" size="sm" className="text-gray-400 mt-1" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Icon name="book" size="2xl" className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('admin.userFocused.noGuides')}</p>
                </div>
              )}
            </div>
          )}

          {/* Detailed Analytics View */}
          {viewMode === 'detailed' && detailedAnalytics && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    {t('admin.userFocused.performance')}
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-600">{t('admin.userFocused.views')}</span>
                      <span className="text-sm font-medium text-blue-900">
                        {detailedAnalytics.guide.performance.total_views}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-600">{t('admin.userFocused.completions')}</span>
                      <span className="text-sm font-medium text-blue-900">
                        {detailedAnalytics.guide.performance.total_completions}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-600">{t('admin.userFocused.completionRate')}</span>
                      <span className="text-sm font-medium text-blue-900">
                        {formatPercentage(detailedAnalytics.guide.performance.completion_rate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">
                    {t('admin.userFocused.guideFeedback')}
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-green-600">{t('admin.userFocused.helpful')}</span>
                      <span className="text-sm font-medium text-green-900">
                        {detailedAnalytics.guide_feedback_metrics.helpful_stats.helpful_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-green-600">{t('admin.userFocused.notHelpful')}</span>
                      <span className="text-sm font-medium text-green-900">
                        {detailedAnalytics.guide_feedback_metrics.helpful_stats.not_helpful_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-green-600">{t('admin.userFocused.helpfulRate')}</span>
                      <span className="text-sm font-medium text-green-900">
                        {formatPercentage(detailedAnalytics.guide_feedback_metrics.helpful_stats.helpful_rate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">
                    {t('admin.userFocused.conceptFeedback')}
                  </h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-purple-600">{t('admin.userFocused.liked')}</span>
                      <span className="text-sm font-medium text-purple-900">
                        {detailedAnalytics.guide_feedback_metrics.like_stats.liked_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-purple-600">{t('admin.userFocused.disliked')}</span>
                      <span className="text-sm font-medium text-purple-900">
                        {detailedAnalytics.guide_feedback_metrics.like_stats.disliked_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-purple-600">{t('admin.userFocused.likeRate')}</span>
                      <span className="text-sm font-medium text-purple-900">
                        {formatPercentage(detailedAnalytics.guide_feedback_metrics.like_stats.like_rate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Feedback */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {t('admin.userFocused.recentFeedback')}
                </h4>
                {detailedAnalytics.recent_feedback.length > 0 ? (
                  <div className="space-y-3">
                    {detailedAnalytics.recent_feedback.slice(0, 10).map((feedback) => (
                      <div key={feedback.id} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            feedback.feedback_type === 'guide' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {feedback.feedback_type === 'guide' ? t('admin.userFocused.guide') : t('admin.userFocused.founder')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(feedback.submitted_at)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          {feedback.helpful !== null && (
                            <span className={feedback.helpful ? 'text-green-600' : 'text-red-600'}>
                              {feedback.helpful ? '👍 ' + t('admin.userFocused.helpful') : '👎 ' + t('admin.userFocused.notHelpful')}
                            </span>
                          )}
                          {feedback.liked !== null && (
                            <span className={feedback.liked ? 'text-green-600' : 'text-red-600'}>
                              {feedback.liked ? '❤️ ' + t('admin.userFocused.liked') : '💔 ' + t('admin.userFocused.disliked')}
                            </span>
                          )}
                        </div>

                        {feedback.feedback_text && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            "{feedback.feedback_text}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    {t('admin.userFocused.noRecentFeedback')}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserFocusedAnalytics;
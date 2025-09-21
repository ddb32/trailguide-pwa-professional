import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { useAdminAnalytics } from '../../hooks/useAdminAnalytics';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button/Button';

// Types and Interfaces
interface PlatformStats {
  totalGuides: number;
  totalUsers: number;
  totalViews: number;
  avgCompletionRate: number;
  [key: string]: any;
}


interface FeedbackStats {
  totalFeedback: number;
  avgRating: number;
  likeRate: number;
  [key: string]: any;
}

interface UsageStats {
  dailyActiveUsers: number;
  peakHours: string[];
  [key: string]: any;
}

interface AdminAnalyticsData {
  platformStats: PlatformStats | null;
  feedbackStats: FeedbackStats | null;
  usageStats: UsageStats | null;
  isLoading: boolean;
  error: string | null;
  refreshAnalytics: () => Promise<void>;
}

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  onBack?: () => void;
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

// Enhanced Admin Header Component
const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onBack
}) => {
  const { t } = useTranslation();
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-purple-50 to-indigo-100 rounded-xl sm:rounded-2xl shadow-sm border border-primary-100 p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8">
      {/* Background Decoration - Simplified for mobile */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 to-purple-600/5"></div>
      <div className="hidden sm:block absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-2xl sm:blur-3xl"></div>
      <div className="hidden sm:block absolute bottom-0 left-0 w-24 sm:w-36 lg:w-48 h-24 sm:h-36 lg:h-48 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-xl sm:blur-2xl"></div>

      <div className="relative z-10">
        {/* Back Button - Mobile optimized */}
        {onBack && (
          <div className="mb-4 sm:mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 hover:bg-white rounded-lg shadow-sm border border-white/20 transition-all duration-200 text-gray-700 hover:text-gray-900 min-h-[44px]"
            >
              <Icon name="arrow-left" size="sm" />
              <span className="text-sm font-medium">{t('admin.navigation.backToDashboard')}</span>
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="analytics" size="lg" className="text-white sm:hidden" ariaHidden />
                <Icon name="analytics" size="xl" className="text-white hidden sm:block lg:hidden" ariaHidden />
                <Icon name="analytics" size="2xl" className="text-white hidden lg:block" ariaHidden />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 leading-tight">
                  <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                    {title}
                  </span>
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed mt-1 sm:mt-2">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Error State Component
const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-desktop p-8 text-center border border-error-200">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-error-100 to-error-200 rounded-2xl mb-6">
            <Icon name="warning" size="3xl" className="text-error-600" ariaHidden />
          </div>
          
          <h3 className="text-2xl font-bold text-error-900 mb-4">
            {t('admin.error.loadFailed')}
          </h3>
          <p className="text-error-700 mb-6 leading-relaxed">
            {error}
          </p>
          <Button 
            onClick={onRetry}
            variant="secondary"
            size="lg"
            className="px-8 py-4"
            icon={<Icon name="refresh" size="lg" />}
            iconPosition="left"
          >
            {t('admin.error.tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  );
};


const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL, languageClasses } = useLanguageDirection();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const {
    platformStats,
    feedbackStats,
    usageStats,
    isLoading,
    error,
    refreshAnalytics
  } = useAdminAnalytics({ days: 30 }) as AdminAnalyticsData;

  const handleRetry = () => {
    refreshAnalytics();
  };

  const handleBackToDashboard = () => {
    navigate('/app/dashboard');
  };

  if (error) {
    return (
      <div className={languageClasses}>
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${languageClasses}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Enhanced Header */}
        <AdminHeader
          title={t('admin.dashboard.title')}
          subtitle={t('admin.dashboard.subtitle')}
          onBack={handleBackToDashboard}
        />

        {/* Tab Navigation - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-desktop border border-gray-100 mb-4 sm:mb-6 lg:mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex px-4 sm:px-6 lg:px-8" aria-label={t('admin.tabs.ariaLabel')}>
              {[
                { id: 'overview', label: t('admin.tabs.overview'), icon: 'dashboard' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors min-h-[48px] ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 active:bg-gray-50'
                  }`}
                >
                  <Icon name={tab.icon} size="sm" />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content - Mobile Optimized Spacing */}
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 xl:space-y-12">
          {activeTab === 'overview' && (
            <>
          {/* Pilot-Focused Overview Cards */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-desktop p-4 sm:p-6 lg:p-8 border border-gray-100">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                    {t('admin.pilot.overview.title')}
                  </h2>
                  <p className="text-gray-600 mt-2">
                    {t('admin.pilot.overview.subtitle')}
                  </p>
                </div>
                <div className="hidden lg:flex items-center space-x-3 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                  <span>{t('admin.dashboard.liveData')}</span>
                </div>
              </div>

              {/* Key Pilot Questions - Mobile Optimized */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-center sm:text-center">
                  <div className="text-xs sm:text-sm font-medium text-blue-800 mb-1 leading-tight">
                    {t('admin.pilot.questions.organizersCreating')}
                  </div>
                  <div className="text-xs text-blue-600">
                    {t('admin.pilot.totalOrganizers')}
                  </div>
                </div>
                <div className="text-center sm:text-center">
                  <div className="text-xs sm:text-sm font-medium text-blue-800 mb-1 leading-tight">
                    {t('admin.pilot.questions.peopleUsing')}
                  </div>
                  <div className="text-xs text-blue-600">
                    {t('admin.pilot.uniqueVisitors')}
                  </div>
                </div>
                <div className="text-center sm:text-center">
                  <div className="text-xs sm:text-sm font-medium text-blue-800 mb-1 leading-tight">
                    {t('admin.pilot.questions.wasHelpful')}
                  </div>
                  <div className="text-xs text-blue-600">
                    {t('admin.pilot.positiveFeedbackRate')}
                  </div>
                </div>
              </div>
            </div>

            {/* Four Key Pilot Metrics - Mobile Optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              {/* 1. Total Organizers who created guides */}
              <div className="transform transition-all duration-200 active:scale-95 sm:hover:scale-105">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-blue-200 min-h-[120px] sm:min-h-[140px]">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <Icon name="users" size="lg" className="text-white sm:hidden" ariaHidden />
                      <Icon name="users" size="xl" className="text-white hidden sm:block" ariaHidden />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
                    {isLoading ? '...' : (platformStats?.totalOrganizers || '0')}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-blue-700 leading-tight">
                    {t('admin.pilot.totalOrganizers')}
                  </div>
                </div>
              </div>

              {/* 2. Total Guides Published */}
              <div className="transform transition-all duration-200 active:scale-95 sm:hover:scale-105">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-green-200 min-h-[120px] sm:min-h-[140px]">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <Icon name="guides" size="lg" className="text-white sm:hidden" ariaHidden />
                      <Icon name="guides" size="xl" className="text-white hidden sm:block" ariaHidden />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-900 mb-1 sm:mb-2">
                    {isLoading ? '...' : (platformStats?.publishedGuides || '0')}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-green-700 leading-tight">
                    {t('admin.pilot.totalGuidesPublished')}
                  </div>
                </div>
              </div>

              {/* 3. Total Users (unique visitors) */}
              <div className="transform transition-all duration-200 active:scale-95 sm:hover:scale-105">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-purple-200 min-h-[120px] sm:min-h-[140px]">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <Icon name="analytics" size="lg" className="text-white sm:hidden" ariaHidden />
                      <Icon name="analytics" size="xl" className="text-white hidden sm:block" ariaHidden />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-900 mb-1 sm:mb-2">
                    {isLoading ? '...' : (platformStats?.uniqueVisitors || '0')}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-purple-700 leading-tight">
                    {t('admin.pilot.uniqueVisitors')}
                  </div>
                </div>
              </div>

              {/* 4. % Positive Feedback */}
              <div className="transform transition-all duration-200 active:scale-95 sm:hover:scale-105">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-orange-200 min-h-[120px] sm:min-h-[140px]">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <Icon name="feedback" size="lg" className="text-white sm:hidden" ariaHidden />
                      <Icon name="feedback" size="xl" className="text-white hidden sm:block" ariaHidden />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-900 mb-1 sm:mb-2">
                    {isLoading ? '...' : (
                      feedbackStats?.statistics?.likeRate
                        ? `${Math.round(feedbackStats.statistics.likeRate * 100)}%`
                        : '0%'
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-orange-700 leading-tight">
                    {t('admin.pilot.positiveFeedbackRate')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pilot Feedback Analysis - Mobile Optimized */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Guide Feedback Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-desktop p-4 sm:p-6 lg:p-8 border border-gray-100">
              <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                    {t('admin.feedback.guideFeedback.title')}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-tight">
                    {t('admin.feedback.guideFeedback.subtitle')}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Icon name="guides" size="lg" className="text-white sm:hidden" ariaHidden />
                  <Icon name="guides" size="xl" className="text-white hidden sm:block" ariaHidden />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Helpful */}
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                    {feedbackStats?.statistics?.helpful_stats?.helpful || '0'}
                  </div>
                  <div className="text-xs sm:text-sm text-green-700 font-medium leading-tight">
                    {t('admin.feedback.guideFeedback.helpful')}
                  </div>
                </div>

                {/* Not Helpful */}
                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
                    {feedbackStats?.statistics?.helpful_stats?.not_helpful || '0'}
                  </div>
                  <div className="text-xs sm:text-sm text-red-700 font-medium leading-tight">
                    {t('admin.feedback.guideFeedback.notHelpful')}
                  </div>
                </div>
              </div>

              {/* Helpful Rate */}
              <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                  {feedbackStats?.statistics?.helpful_stats?.helpful_rate
                    ? `${Math.round(feedbackStats.statistics.helpful_stats.helpful_rate * 100)}%`
                    : '0%'}
                </div>
                <div className="text-xs sm:text-sm text-blue-700 font-medium leading-tight">
                  {t('admin.feedback.guideFeedback.helpfulRate')}
                </div>
              </div>
            </div>

            {/* Concept Feedback Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-desktop p-4 sm:p-6 lg:p-8 border border-gray-100">
              <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                    {t('admin.feedback.conceptFeedback.title')}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-tight">
                    {t('admin.feedback.conceptFeedback.subtitle')}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <Icon name="feedback" size="lg" className="text-white sm:hidden" ariaHidden />
                  <Icon name="feedback" size="xl" className="text-white hidden sm:block" ariaHidden />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Positive */}
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                    {feedbackStats?.statistics?.like_stats?.likes || '0'}
                  </div>
                  <div className="text-xs sm:text-sm text-green-700 font-medium leading-tight">
                    {t('admin.feedback.conceptFeedback.likeIdea')}
                  </div>
                </div>

                {/* Negative */}
                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 mb-1 sm:mb-2">
                    {feedbackStats?.statistics?.like_stats?.dislikes || '0'}
                  </div>
                  <div className="text-xs sm:text-sm text-red-700 font-medium leading-tight">
                    {t('admin.feedback.conceptFeedback.dislikeIdea')}
                  </div>
                </div>
              </div>

              {/* Like Rate */}
              <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">
                  {feedbackStats?.statistics?.like_stats?.like_rate
                    ? `${Math.round(feedbackStats.statistics.like_stats.like_rate * 100)}%`
                    : '0%'}
                </div>
                <div className="text-xs sm:text-sm text-purple-700 font-medium leading-tight">
                  {t('admin.feedback.conceptFeedback.approvalRate')}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Feedback Comments - Mobile Optimized */}
          {feedbackStats?.feedback && feedbackStats.feedback.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-desktop p-4 sm:p-6 lg:p-8 border border-gray-100">
              <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                {t('admin.feedback.recentComments.title')}
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                {feedbackStats.feedback.slice(0, 6).map((feedback, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    {/* Header with badges and date */}
                    <div className="flex flex-col space-y-2 mb-3">
                      {/* Date - Always on top for mobile */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(feedback.submitted_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>

                      {/* Badges - Stack on mobile, inline on desktop */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
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


        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
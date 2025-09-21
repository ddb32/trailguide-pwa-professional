import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';

const AdminFeedbackAnalytics = ({ 
  feedbackStats = null, 
  isLoading = false,
  period = 30 
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [selectedType, setSelectedType] = useState('all');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin.feedback.title')}
          </h2>
        </div>
        
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="mt-6 h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!feedbackStats || !feedbackStats.statistics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin.feedback.title')}
          </h2>
        </div>
        
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-gray-500">
            {t('admin.feedback.noData')}
          </p>
        </div>
      </div>
    );
  }

  const { statistics, feedback = [], totalCount = 0 } = feedbackStats;
  const { 
    like_stats, 
    helpful_stats, 
    text_feedback_count,
    guide_feedback_count = 0,
    founder_feedback_count = 0,
    founder_stats = {}
  } = statistics;

  // Filter feedback by type
  const filteredFeedback = selectedType === 'all' 
    ? feedback 
    : feedback.filter(item => item.feedback_type === selectedType);

  // Get stats based on selected type
  const getDisplayStats = () => {
    if (selectedType === 'founder') {
      return {
        totalFeedback: founder_feedback_count,
        specificStats: founder_stats
      };
    } else if (selectedType === 'guide') {
      return {
        totalFeedback: guide_feedback_count,
        specificStats: { like_stats, helpful_stats }
      };
    } else {
      return {
        totalFeedback: statistics.total_feedback,
        specificStats: { like_stats, helpful_stats, founder_stats }
      };
    }
  };

  const displayStats = getDisplayStats();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin.feedback.title')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('admin.feedback.subtitle', { period, count: displayStats.totalFeedback })}
            </p>
          </div>
          
          {/* Feedback Type Filter */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedType === 'all'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setSelectedType('guide')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedType === 'guide'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('admin.feedback.dualTypes.guide')}
            </button>
            <button
              onClick={() => setSelectedType('founder')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedType === 'founder'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('admin.feedback.dualTypes.founder')}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Feedback Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  {selectedType === 'guide' ? t('admin.feedback.stats.guideFeedback') :
                   selectedType === 'founder' ? t('admin.feedback.stats.founderFeedback') :
                   t('admin.feedback.stats.totalFeedback')}
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {displayStats.totalFeedback.toLocaleString()}
                </p>
              </div>
              <div className="text-blue-600">💬</div>
            </div>
          </div>

          {/* Guide Feedback Stats */}
          {(selectedType === 'all' || selectedType === 'guide') && displayStats.specificStats.like_stats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">
                    {t('admin.feedback.stats.likeRate')}
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {Math.round((displayStats.specificStats.like_stats?.like_rate || 0) * 100)}%
                  </p>
                  <p className="text-xs text-green-600">
                    {displayStats.specificStats.like_stats?.likes || 0} / {displayStats.specificStats.like_stats?.total_ratings || 0}
                  </p>
                </div>
                <div className="text-green-600">👍</div>
              </div>
            </div>
          )}

          {(selectedType === 'all' || selectedType === 'guide') && displayStats.specificStats.helpful_stats && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    {t('admin.feedback.stats.helpfulRate')}
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    {Math.round((displayStats.specificStats.helpful_stats?.helpful_rate || 0) * 100)}%
                  </p>
                  <p className="text-xs text-purple-600">
                    {displayStats.specificStats.helpful_stats?.helpful || 0} / {displayStats.specificStats.helpful_stats?.total_ratings || 0}
                  </p>
                </div>
                <div className="text-purple-600">✅</div>
              </div>
            </div>
          )}

          {/* Founder Feedback Stats */}
          {(selectedType === 'all' || selectedType === 'founder') && displayStats.specificStats.founder_stats && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">
                    {t('admin.feedback.stats.overallRating')}
                  </p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {displayStats.specificStats.founder_stats.avg_overall_rating || 'N/A'}
                  </p>
                  <p className="text-xs text-indigo-600">
                    {displayStats.specificStats.founder_stats.overall_rating_count || 0} ratings
                  </p>
                </div>
                <div className="text-indigo-600">🌟</div>
              </div>
            </div>
          )}

          {(selectedType === 'all' || selectedType === 'founder') && displayStats.specificStats.founder_stats && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-pink-600">
                    {t('admin.feedback.stats.recommendRate')}
                  </p>
                  <p className="text-2xl font-bold text-pink-900">
                    {Math.round((displayStats.specificStats.founder_stats.recommend_rate || 0) * 100)}%
                  </p>
                  <p className="text-xs text-pink-600">
                    {displayStats.specificStats.founder_stats.recommend_yes || 0} / {displayStats.specificStats.founder_stats.recommend_total || 0}
                  </p>
                </div>
                <div className="text-pink-600">💯</div>
              </div>
            </div>
          )}

          {/* Text Feedback (always show) */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  {t('admin.feedback.stats.textFeedback')}
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {filteredFeedback.filter(f => f.feedback_text && f.feedback_text.trim()).length.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600">
                  {Math.round((filteredFeedback.filter(f => f.feedback_text && f.feedback_text.trim()).length / (displayStats.totalFeedback || 1)) * 100)}%
                </p>
              </div>
              <div className="text-orange-600">📝</div>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        {filteredFeedback && filteredFeedback.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('admin.feedback.recentFeedback')}
              {selectedType !== 'all' && (
                <span className="text-sm text-gray-500 ml-2">
                  ({selectedType === 'guide' ? t('admin.feedback.dualTypes.guide') : t('admin.feedback.dualTypes.founder')})
                </span>
              )}
            </h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredFeedback.slice(0, 10).map((item, index) => (
                <div 
                  key={item.id || index} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {item.guide?.name || t('admin.feedback.unknownGuide')}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {item.organizer?.name || item.organizer?.username}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        {/* Feedback Type Badge */}
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          item.feedback_type === 'founder'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.feedback_type === 'founder' ? '🚀' : '📖'} 
                          {item.feedback_type === 'founder' ? t('admin.feedback.dualTypes.founder') : t('admin.feedback.dualTypes.guide')}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-2">
                        {/* Guide Feedback Ratings */}
                        {item.feedback_type === 'guide' && (
                          <>
                            {item.liked !== null && (
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                item.liked 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.liked ? '👍' : '👎'} {item.liked ? t('admin.feedback.liked') : t('admin.feedback.disliked')}
                              </span>
                            )}
                            
                            {item.helpful !== null && (
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                item.helpful 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {item.helpful ? '✅' : '❌'} {item.helpful ? t('admin.feedback.helpful') : t('admin.feedback.notHelpful')}
                              </span>
                            )}
                          </>
                        )}
                        
                        {/* Founder Feedback Ratings */}
                        {item.feedback_type === 'founder' && (
                          <>
                            {item.overall_rating && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                🌟 {t(`feedback.${item.overall_rating}`)}
                              </span>
                            )}
                            {item.recommend_rating && (
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                item.recommend_rating === 'yes'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.recommend_rating === 'yes' ? '✅' : '❌'} {t(`feedback.${item.recommend_rating}`)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      {item.feedback_text && (
                        <blockquote className="text-sm text-gray-600 italic bg-gray-50 border-l-4 border-gray-300 pl-3 py-2 mt-2">
                          "{item.feedback_text}"
                        </blockquote>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 ml-4">
                      {new Date(item.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredFeedback.length > 10 && (
              <div className="text-center mt-4">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  {t('admin.feedback.viewMore')} ({filteredFeedback.length - 10} more)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFeedbackAnalytics;
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { Icon } from '../../common/Icon';
import { Button } from '../../common/Button/Button';
import AdminConfirmDialog from '../AdminConfirmDialog/AdminConfirmDialog';

interface FeedbackEntry {
  id: string;
  event_id: string;
  feedback_type: 'guide' | 'founder';
  liked?: boolean;
  helpful?: boolean;
  overall_rating?: string;
  concept_rating?: string;
  presentation_rating?: string;
  recommend_rating?: string;
  feedback_text?: string;
  submitted_at: string;
  visitor_id: string;
  ip_address?: string;
  event_name?: string;
  event_status?: string;
  organizer_username?: string;
  organizer_name?: string;
}

interface SearchCriteria {
  visitor_id: string;
  event_id: string;
  feedback_type: 'guide' | 'founder' | '';
  start_date: string;
  end_date: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
  current_page: number;
}

interface AdminFeedbackService {
  searchFeedback: (criteria: Partial<SearchCriteria>, limit?: number, offset?: number) => Promise<{
    feedback: FeedbackEntry[];
    pagination: PaginationInfo;
  }>;
  deleteUserFeedback: (visitorId: string) => Promise<{ deleted_count: number }>;
  bulkDeleteFeedback: (criteria: any) => Promise<{ deleted_count: number }>;
}

// Service implementation would be in a separate file
const adminFeedbackService: AdminFeedbackService = {
  async searchFeedback(criteria, limit = 50, offset = 0) {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await fetch(`/api/v1/admin/feedback/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to search feedback');
    }

    const result = await response.json();
    return result.data;
  },

  async deleteUserFeedback(visitorId: string) {
    const response = await fetch(`/api/v1/admin/feedback/delete-by-user/${visitorId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete user feedback');
    }

    const result = await response.json();
    return result.data;
  },

  async bulkDeleteFeedback(criteria: any) {
    const params = new URLSearchParams({ ...criteria, confirm: 'true' });
    const response = await fetch(`/api/v1/admin/feedback/bulk-delete?${params}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to bulk delete feedback');
    }

    const result = await response.json();
    return result.data;
  }
};

const FeedbackManagement: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();

  // State management
  const [searchCriteria, setSearchCriteria] = useState<Partial<SearchCriteria>>({});
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [deleteUserDialog, setDeleteUserDialog] = useState<{
    isOpen: boolean;
    visitorId: string;
    feedbackCount: number;
  }>({ isOpen: false, visitorId: '', feedbackCount: 0 });

  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    isOpen: boolean;
    criteria: any;
    previewCount: number;
  }>({ isOpen: false, criteria: {}, previewCount: 0 });

  // Search feedback
  const handleSearch = async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * 50;
      const result = await adminFeedbackService.searchFeedback(searchCriteria, 50, offset);
      setFeedback(result.feedback);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setFeedback([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user feedback
  const handleDeleteUser = async () => {
    try {
      await adminFeedbackService.deleteUserFeedback(deleteUserDialog.visitorId);
      setDeleteUserDialog({ isOpen: false, visitorId: '', feedbackCount: 0 });
      await handleSearch(); // Refresh results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Bulk delete feedback
  const handleBulkDelete = async () => {
    try {
      await adminFeedbackService.bulkDeleteFeedback(bulkDeleteDialog.criteria);
      setBulkDeleteDialog({ isOpen: false, criteria: {}, previewCount: 0 });
      await handleSearch(); // Refresh results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk delete failed');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get feedback rating display
  const getRatingDisplay = (entry: FeedbackEntry) => {
    if (entry.feedback_type === 'guide') {
      const ratings = [];
      if (entry.liked !== undefined) {
        ratings.push(`${t('feedback.liked')}: ${entry.liked ? '👍' : '👎'}`);
      }
      if (entry.helpful !== undefined) {
        ratings.push(`${t('feedback.helpful')}: ${entry.helpful ? '✅' : '❌'}`);
      }
      return ratings.join(', ') || t('admin.feedback.noRating');
    } else {
      const ratings = [];
      if (entry.overall_rating) ratings.push(`${t('feedback.overall')}: ${entry.overall_rating}`);
      if (entry.concept_rating) ratings.push(`${t('feedback.concept')}: ${entry.concept_rating}`);
      if (entry.presentation_rating) ratings.push(`${t('feedback.presentation')}: ${entry.presentation_rating}`);
      if (entry.recommend_rating) ratings.push(`${t('feedback.recommend')}: ${entry.recommend_rating}`);
      return ratings.join(', ') || t('admin.feedback.noRating');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t('admin.feedback.management.title')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('admin.feedback.management.description')}
        </p>
      </div>

      {/* Search Form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t('admin.feedback.search.title')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Visitor ID Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('admin.feedback.search.visitorId')}
            </label>
            <input
              type="text"
              value={searchCriteria.visitor_id || ''}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, visitor_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter visitor ID..."
            />
          </div>

          {/* Event ID Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('admin.feedback.search.eventId')}
            </label>
            <input
              type="text"
              value={searchCriteria.event_id || ''}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, event_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter event ID..."
            />
          </div>

          {/* Feedback Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('admin.feedback.search.type')}
            </label>
            <select
              value={searchCriteria.feedback_type || ''}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, feedback_type: e.target.value as any }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">{t('admin.feedback.search.allTypes')}</option>
              <option value="guide">{t('admin.feedback.search.guide')}</option>
              <option value="founder">{t('admin.feedback.search.founder')}</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('admin.feedback.search.startDate')}
            </label>
            <input
              type="date"
              value={searchCriteria.start_date || ''}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t('admin.feedback.search.endDate')}
            </label>
            <input
              type="date"
              value={searchCriteria.end_date || ''}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <Button
              onClick={() => handleSearch(1)}
              variant="primary"
              size="sm"
              loading={isLoading}
              className="w-full"
            >
              <Icon name="search" size="sm" className="mr-2" />
              {t('admin.feedback.search.button')}
            </Button>
          </div>
        </div>
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

      {/* Results */}
      {pagination && (
        <div className="mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {t('admin.feedback.results.showing', {
              start: pagination.offset + 1,
              end: Math.min(pagination.offset + pagination.limit, pagination.total),
              total: pagination.total
            })}
          </span>

          {pagination.pages > 1 && (
            <div className="flex space-x-1">
              <Button
                onClick={() => handleSearch(pagination.current_page - 1)}
                variant="secondary"
                size="xs"
                disabled={pagination.current_page <= 1 || isLoading}
              >
                {t('common.previous')}
              </Button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {pagination.current_page} / {pagination.pages}
              </span>
              <Button
                onClick={() => handleSearch(pagination.current_page + 1)}
                variant="secondary"
                size="xs"
                disabled={pagination.current_page >= pagination.pages || isLoading}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Feedback List */}
      {feedback.length > 0 ? (
        <div className="space-y-4">
          {feedback.map((entry) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-medium rounded-full
                      ${entry.feedback_type === 'guide' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}
                    `}>
                      {entry.feedback_type === 'guide' ? t('admin.feedback.type.guide') : t('admin.feedback.type.founder')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.submitted_at)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-900 mb-1">
                    <strong>{t('admin.feedback.guide')}:</strong> {entry.event_name || 'Unknown'}
                    {entry.organizer_name && (
                      <span className="text-gray-600 ml-2">
                        ({t('admin.feedback.organizer')}: {entry.organizer_name})
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-700 mb-2">
                    {getRatingDisplay(entry)}
                  </div>

                  {entry.feedback_text && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded italic">
                      "{entry.feedback_text}"
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    {t('admin.feedback.visitorId')}: {entry.visitor_id}
                    {entry.ip_address && ` • IP: ${entry.ip_address}`}
                  </div>
                </div>

                <div className="ml-4">
                  <Button
                    onClick={() => {
                      const userFeedback = feedback.filter(f => f.visitor_id === entry.visitor_id);
                      setDeleteUserDialog({
                        isOpen: true,
                        visitorId: entry.visitor_id,
                        feedbackCount: userFeedback.length
                      });
                    }}
                    variant="danger"
                    size="xs"
                  >
                    <Icon name="trash" size="xs" className="mr-1" />
                    {t('admin.feedback.deleteUser')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isLoading && pagination && (
        <div className="text-center py-8">
          <Icon name="search" size="2xl" className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {t('admin.feedback.noResults')}
          </p>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={deleteUserDialog.isOpen}
        onClose={() => setDeleteUserDialog({ isOpen: false, visitorId: '', feedbackCount: 0 })}
        onConfirm={handleDeleteUser}
        title={t('admin.feedback.deleteUser.title')}
        message={t('admin.feedback.deleteUser.message', {
          visitorId: deleteUserDialog.visitorId,
          count: deleteUserDialog.feedbackCount
        })}
        confirmText={t('admin.feedback.deleteUser.confirm')}
        type="danger"
        requiresTyping={true}
        confirmationText="DELETE"
        details={[
          t('admin.feedback.deleteUser.detail1'),
          t('admin.feedback.deleteUser.detail2'),
          t('admin.feedback.deleteUser.detail3')
        ]}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={bulkDeleteDialog.isOpen}
        onClose={() => setBulkDeleteDialog({ isOpen: false, criteria: {}, previewCount: 0 })}
        onConfirm={handleBulkDelete}
        title={t('admin.feedback.bulkDelete.title')}
        message={t('admin.feedback.bulkDelete.message', { count: bulkDeleteDialog.previewCount })}
        confirmText={t('admin.feedback.bulkDelete.confirm')}
        type="danger"
        requiresTyping={true}
        confirmationText="BULK DELETE"
      />
    </div>
  );
};

export default FeedbackManagement;
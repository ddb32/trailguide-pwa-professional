import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../../hooks/useLanguageDirection';
import { useCopyLink } from '../../../hooks/useCopyLink';
import StatusDisplay from '../../common/StatusDisplay/StatusDisplay';
import { Icon } from '../../common/Icon';
import type { FormattedEvent } from '../../../types/global';

// Types and Interfaces
export interface TableEvent {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'expired' | 'draft' | 'published' | 'scheduled' | 'archived';
  views?: number;
  steps?: number;
  stepsCount?: number;
  expiration_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DataTableProps {
  data?: FormattedEvent[];
  columns?: string[];
  isLoading?: boolean;
  className?: string;
  onDelete?: ((event: FormattedEvent) => void) | null;
  deleteLoading?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
}

export interface SortConfig {
  key: keyof FormattedEvent | null;
  direction: 'asc' | 'desc' | null;
}

export interface FilterConfig {
  status: string[];
  search: string;
}

// Main DataTable Component - Professional Enterprise-Grade Design
const DataTable: React.FC<DataTableProps> = ({ 
  data = [], 
  columns: _columns = [],
  isLoading = false,
  className = '',
  onDelete = null,
  deleteLoading = false,
  sortable = true
}) => {
  const { t } = useTranslation();
  const { isRTL, conditionalClass, language } = useLanguageDirection();
  const { copyGuideLink } = useCopyLink();

  // State for sorting and filtering
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle undefined values safely
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // For now, use sortedData directly (no filtering)
  const filteredData = sortedData;

  // Sort handler
  const handleSort = useCallback((key: keyof FormattedEvent) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return { key: null, direction: null };
        }
      }
      return { key, direction: 'asc' };
    });
  }, []);


  // Legacy StatusBadge component (unused - replaced by StatusDisplay)

  // Legacy ExpirationDisplay component (unused - replaced by StatusDisplay)

  // Legacy ActivationDisplay component (unused - replaced by StatusDisplay)

  // Sortable header component
  const SortableHeader: React.FC<{
    children: React.ReactNode;
    sortKey?: keyof FormattedEvent;
    className?: string;
  }> = ({ children, sortKey, className = '' }) => {
    if (!sortKey || !sortable) {
      return (
        <th className={`py-4 px-6 text-sm font-medium text-gray-600 uppercase tracking-wide ${className}`}>
          {children}
        </th>
      );
    }

    const isActive = sortConfig.key === sortKey;
    const direction = isActive ? sortConfig.direction : null;

    return (
      <th
        className={`
          py-4 px-6 text-sm font-medium uppercase tracking-wide cursor-pointer select-none
          transition-all duration-200 hover:bg-gray-50 group
          ${isActive ? 'text-gray-900' : 'text-gray-600 hover:text-gray-700'}
          ${className}
        `}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <span>{children}</span>
          <div className="flex flex-col">
            <Icon
              name="chevron-up"
              size="xs"
              className={`
                transition-all duration-200 transform
                ${direction === 'asc'
                  ? 'text-gray-900'
                  : 'text-gray-400 group-hover:text-gray-500'
                }
              `}
            />
            <Icon
              name="chevron-down"
              size="xs"
              className={`
                transition-all duration-200 transform -mt-1
                ${direction === 'desc'
                  ? 'text-gray-900'
                  : 'text-gray-400 group-hover:text-gray-500'
                }
              `}
            />
          </div>
        </div>
      </th>
    );
  };

  // Mobile Card Component with enhanced interactions
  const MobileCard: React.FC<{ event: FormattedEvent; index: number }> = ({ event, index: _ }) => {
    const locale = language === 'he' ? 'he-IL' : 'en-US';

    // Format creation date in Israeli timezone with validation
    const createdDate = event.created_at ? new Date(event.created_at) : null;
    const isValidDate = createdDate && !isNaN(createdDate.getTime());
    const formattedCreatedDate = isValidDate ? new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Jerusalem'
    }).format(createdDate) : t('dashboard.table.noDate');

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 hover:shadow-md active:shadow-lg transition-all duration-200 touch-manipulation">
        {/* Header: Guide Name and Status - Tappable area for mobile - RTL Optimized */}
        <div className="flex items-start justify-between">
          <Link to={`/app/edit/${event.id}`} className="flex-1 min-w-0 block">
            <div className="touch-manipulation">
              <h3 className={`font-medium text-gray-900 text-base leading-tight truncate hover:text-blue-600 transition-colors duration-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                {event.name || t('dashboard.table.unnamedGuide')}
              </h3>
              <p className={`text-sm text-gray-500 mt-1 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {event.description ||
                  (event.stepsCount
                    ? t('dashboard.table.stepsCount', { count: event.stepsCount })
                    : event.steps && event.steps > 0
                    ? t('dashboard.table.stepsCount', { count: event.steps })
                    : t('dashboard.table.stepsCount', { count: 0 }))}
              </p>
            </div>
          </Link>
          <div className={`${isRTL ? 'mr-3' : 'ml-3'} flex-shrink-0`}>
            <StatusDisplay event={event} variant="compact" size="sm" />
          </div>
        </div>

        {/* Info Section: Clean Information Display - RTL Optimized */}
        <div className="space-y-2 border-t border-gray-100 pt-3">
          {/* Created Date */}
          <div className={`flex items-center justify-between py-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={`text-xs font-medium text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.table.labels.created')}
            </span>
            <span className={`text-sm text-gray-700 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>
              {formattedCreatedDate}
            </span>
          </div>

          {/* Views Count */}
          <div className={`flex items-center justify-between py-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={`text-xs font-medium text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard.table.labels.views')}
            </span>
            <span className="text-sm text-gray-700 font-medium">
              {event.views || 0}
            </span>
          </div>
        </div>

        {/* Actions Row - Touch-optimized with minimum 44px touch targets */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className={`flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
            {/* Preview Button - Enhanced touch target */}
            <Link
              to={`/app/preview/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button
                className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={t('dashboard.actions.preview')}
              >
                <Icon name="eye" size="sm" />
              </button>
            </Link>

            {/* Copy Link Button - Enhanced touch target */}
            <button
              onClick={() => copyGuideLink(event.id, event.name, event.status)}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={t('dashboard.actions.copyLink')}
            >
              <Icon name="external-link" size="sm" />
            </button>

            {/* Edit Button - Enhanced touch target */}
            <Link
              to={`/app/edit/${event.id}`}
              className="block"
            >
              <button
                className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={t('dashboard.actions.edit')}
              >
                <Icon name="edit" size="sm" />
              </button>
            </Link>

            {/* Delete Button - Enhanced touch target */}
            {onDelete && (
              <button
                onClick={() => onDelete(event)}
                disabled={deleteLoading}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                aria-label={t('dashboard.actions.delete')}
              >
                <Icon name="delete" size="sm" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className}`}>
        {/* Mobile Loading Skeleton */}
        <div className="lg:hidden space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <div className="flex space-x-2">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Loading Skeleton */}
        <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.headers.guideName')}
                  </th>
                  <th className={`py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.headers.status')}
                  </th>
                  <th className={`py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.headers.views')}
                  </th>
                  <th className={`py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.headers.expiry')}
                  </th>
                  <th className={`py-3 px-4 text-xs font-medium text-gray-600 uppercase tracking-wide ${conditionalClass.textLeft}`}>
                    {t('dashboard.table.headers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...Array(3)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="py-6 px-6">
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-40"></div>
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="h-5 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="h-5 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="py-6 px-6">
                      <div className="flex space-x-3">
                        <div className="h-10 bg-gray-200 rounded-xl w-10"></div>
                        <div className="h-10 bg-gray-200 rounded-xl w-10"></div>
                        <div className="h-10 bg-gray-200 rounded-xl w-10"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 ${className}`}>
        <div className="px-4 py-12 sm:px-6 sm:py-16 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <Icon name="guides" size="xl" className="text-blue-600" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
            {t('dashboard.table.noData.title')}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto px-2">
            {t('dashboard.table.noData.description')}
          </p>
          <Link
            to="/app/create"
            className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 text-sm sm:text-base"
          >
            <Icon name="create" size="sm" className="mr-2" />
            {t('dashboard.table.noData.createFirst')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Mobile Card Layout - Hidden on desktop (lg:hidden) */}
      <div className="lg:hidden space-y-4">
        {filteredData.map((event, index) => (
          <MobileCard key={event.id} event={event} index={index} />
        ))}
      </div>

      {/* Desktop Table Layout - Hidden on mobile (hidden lg:block) */}
      <div className="hidden lg:block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortableHeader sortKey="name" className={conditionalClass.textLeft}>
                  {t('dashboard.table.headers.guideName')}
                </SortableHeader>
                <SortableHeader sortKey="status" className={conditionalClass.textLeft}>
                  {t('dashboard.table.headers.status')}
                </SortableHeader>
                <SortableHeader sortKey="views" className={conditionalClass.textLeft}>
                  {t('dashboard.table.headers.views')}
                </SortableHeader>
                <SortableHeader sortKey="created_at" className={conditionalClass.textLeft}>
                  {t('dashboard.table.headers.created')}
                </SortableHeader>
                <SortableHeader className={conditionalClass.textLeft}>
                  {t('dashboard.table.headers.actions')}
                </SortableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((event, _) => (
                <tr
                  key={event.id}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-all duration-200"
                >
                  {/* Guide Name */}
                  <td className="py-6 px-6">
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900 text-base lg:text-lg leading-tight">
                        {event.name || t('dashboard.table.unnamedGuide')}
                      </div>
                      <div className="text-sm text-gray-500 font-normal">
                        {(event.stepsCount !== undefined && event.stepsCount > 0)
                          ? t('dashboard.table.stepsCount', { count: event.stepsCount })
                          : event.steps && event.steps > 0
                          ? t('dashboard.table.stepsCount', { count: event.steps })
                          : t('dashboard.table.stepsCount', { count: 0 })}
                      </div>
                    </div>
                  </td>

                  {/* Unified Status & Timing Display */}
                  <td className="py-6 px-6">
                    <StatusDisplay event={event} variant="detailed" size="md" />
                  </td>

                  {/* Views */}
                  <td className="py-6 px-6">
                    <span className="text-base lg:text-lg text-gray-600 font-normal">
                      {event.views || 0}
                    </span>
                  </td>

                  {/* Created Date */}
                  <td className="py-6 px-6">
                    <span className="text-base lg:text-lg text-gray-600 font-normal">
                      {(() => {
                        const createdDate = event.created_at ? new Date(event.created_at) : null;
                        const isValidDate = createdDate && !isNaN(createdDate.getTime());
                        return isValidDate ? new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'Asia/Jerusalem'
                        }).format(createdDate) : t('dashboard.table.noDate');
                      })()}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-6 px-6">
                    <div className={`flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
                      {/* Preview Button */}
                      <Link to={`/app/preview/${event.id}`} target="_blank" rel="noopener noreferrer">
                        <button
                          className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          aria-label={t('dashboard.actions.preview')}
                        >
                          <Icon name="eye" size="md" />
                        </button>
                      </Link>

                      {/* Copy Link Button */}
                      <button
                        onClick={() => copyGuideLink(event.id, event.name, event.status)}
                        className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        aria-label={t('dashboard.actions.copyLink')}
                      >
                        <Icon name="external-link" size="md" />
                      </button>

                      {/* Edit Button */}
                      <Link to={`/app/edit/${event.id}`}>
                        <button
                          className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          aria-label={t('dashboard.actions.edit')}
                        >
                          <Icon name="edit" size="md" />
                        </button>
                      </Link>

                      {/* Delete Button */}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(event)}
                          disabled={deleteLoading}
                          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={t('dashboard.actions.delete')}
                        >
                          <Icon name="delete" size="md" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
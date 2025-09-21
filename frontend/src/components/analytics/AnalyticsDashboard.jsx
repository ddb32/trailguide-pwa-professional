/**
 * Analytics Dashboard Component
 * Comprehensive analytics dashboard for organizers and entrepreneurs
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '../../hooks/useAnalytics';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button/Button';

const AnalyticsDashboard = ({ className = '' }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('organizer'); // 'organizer' or 'entrepreneur'

  const {
    loading,
    error,
    timeRange,
    overview,
    guides,
    selectedGuide,
    entrepreneurData,
    changeTimeRange,
    refreshAll,
    setSelectedGuide,
    formatNumber,
    formatPercentage,
    getTimeRangeOptions,
    clearError
  } = useAnalytics();

  const handleTimeRangeChange = (newTimeRange) => {
    changeTimeRange(newTimeRange);
  };

  const handleGuideSelect = (guideId) => {
    setSelectedGuide(guideId);
  };

  const timeRangeOptions = getTimeRangeOptions();

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <Icon name="ExclamationTriangleIcon" className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Analytics Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
          >
            {t('common:dismiss')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={refreshAll}
            disabled={loading}
          >
            {t('common:retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              📊 {t('analytics:dashboard.title')}
            </h2>
            <p className="text-gray-600">
              {t('analytics:dashboard.subtitle')}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('organizer')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'organizer'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('analytics:viewMode.organizer')}
              </button>
              <button
                onClick={() => setViewMode('entrepreneur')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'entrepreneur'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('analytics:viewMode.entrepreneur')}
              </button>
            </div>

            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white"
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.labelHe || option.label}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Icon
                name="ArrowPathIcon"
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              {t('common:refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Icon name="ArrowPathIcon" className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('analytics:loading.title')}
            </h3>
            <p className="text-gray-600">
              {t('analytics:loading.subtitle')}
            </p>
          </div>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && overview && (
        <>
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title={t('analytics:stats.totalGuides')}
              value={formatNumber(overview.overview?.total_guides)}
              icon="DocumentTextIcon"
              variant="primary"
              subtitle={`${formatNumber(overview.overview?.published_guides)} ${t('analytics:stats.published')}`}
            />
            <StatsCard
              title={t('analytics:stats.totalViews')}
              value={formatNumber(overview.overview?.total_views)}
              icon="EyeIcon"
              variant="success"
              subtitle={`${formatNumber(overview.overview?.unique_visitors)} ${t('analytics:stats.uniqueVisitors')}`}
            />
            <StatsCard
              title={t('analytics:stats.completionRate')}
              value={formatPercentage(overview.overview?.completion_rate)}
              icon="CheckCircleIcon"
              variant="info"
              subtitle={`${formatNumber(overview.overview?.completed_views)} ${t('analytics:stats.completions')}`}
            />
            <StatsCard
              title={t('analytics:stats.deviceTypes')}
              value={formatNumber(overview.overview?.device_types_count)}
              icon="DevicePhoneMobileIcon"
              variant="secondary"
              subtitle={t('analytics:stats.devicesUsed')}
            />
          </div>

          {/* Device Breakdown */}
          {overview.deviceBreakdown && overview.deviceBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📱 {t('analytics:devices.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {overview.deviceBreakdown.map((device) => (
                  <div key={device.device_type} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {device.device_type}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatNumber(device.views)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(device.unique_visitors)} {t('analytics:stats.uniqueVisitors')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guides List */}
          {guides && guides.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  📈 {t('analytics:guides.title')}
                </h3>
                <span className="text-sm text-gray-500">
                  {t('analytics:guides.timeRange', { range: timeRange })}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-right font-medium text-gray-600 pb-3">
                        {t('analytics:table.guideName')}
                      </th>
                      <th className="text-center font-medium text-gray-600 pb-3">
                        {t('analytics:table.views')}
                      </th>
                      <th className="text-center font-medium text-gray-600 pb-3">
                        {t('analytics:table.uniqueVisitors')}
                      </th>
                      <th className="text-center font-medium text-gray-600 pb-3">
                        {t('analytics:table.completionRate')}
                      </th>
                      <th className="text-center font-medium text-gray-600 pb-3">
                        {t('analytics:table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {guides.map((guide) => (
                      <tr
                        key={guide.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 text-right">
                          <div>
                            <div className="font-medium text-gray-900">
                              {guide.event_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {guide.slug}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <span className="font-semibold text-gray-900">
                            {formatNumber(guide.total_views)}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="font-semibold text-blue-600">
                            {formatNumber(guide.unique_visitors)}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`font-semibold ${
                            parseFloat(guide.completion_rate) > 50
                              ? 'text-green-600'
                              : parseFloat(guide.completion_rate) > 20
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}>
                            {formatPercentage(guide.completion_rate)}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGuideSelect(guide.id)}
                            className="text-xs"
                          >
                            {t('analytics:actions.viewDetails')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Entrepreneur Analytics */}
          {viewMode === 'entrepreneur' && selectedGuide && entrepreneurData && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                🚀 {t('analytics:entrepreneur.title')}
              </h3>

              {/* Market Validation Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {formatNumber(entrepreneurData.marketValidation?.unique_interest_level)}
                  </div>
                  <div className="text-sm font-medium text-blue-800">
                    {t('analytics:entrepreneur.interestLevel')}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {formatPercentage(entrepreneurData.marketValidation?.conversion_rate)}
                  </div>
                  <div className="text-sm font-medium text-green-800">
                    {t('analytics:entrepreneur.conversionRate')}
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {formatNumber(entrepreneurData.marketValidation?.repeat_interest)}
                  </div>
                  <div className="text-sm font-medium text-purple-800">
                    {t('analytics:entrepreneur.repeatInterest')}
                  </div>
                </div>
              </div>

              {/* Device Preferences */}
              {entrepreneurData.devicePreferences && entrepreneurData.devicePreferences.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {t('analytics:entrepreneur.devicePreferences')}
                  </h4>
                  <div className="space-y-3">
                    {entrepreneurData.devicePreferences.map((device) => (
                      <div key={device.device_type} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 capitalize">
                            {device.device_type}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {formatNumber(device.unique_users)} {t('analytics:stats.users')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatPercentage(device.completion_rate_by_device)} {t('analytics:stats.completion')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !overview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Icon name="ChartBarIcon" className="w-16 h-16 text-gray-400 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {t('analytics:empty.title')}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {t('analytics:empty.description')}
            </p>
            <Button
              variant="primary"
              onClick={refreshAll}
              className="flex items-center gap-2"
            >
              <Icon name="ArrowPathIcon" className="w-4 h-4" />
              {t('analytics:empty.action')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// StatsCard component (if not already imported)
const StatsCard = ({ title, value, icon, variant, subtitle }) => {
  const variantClasses = {
    primary: 'bg-blue-50 text-blue-600 border-blue-200',
    secondary: 'bg-gray-50 text-gray-600 border-gray-200',
    success: 'bg-green-50 text-green-600 border-green-200',
    warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    error: 'bg-red-50 text-red-600 border-red-200',
    info: 'bg-cyan-50 text-cyan-600 border-cyan-200'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${variantClasses[variant]}`}>
          <Icon name={icon} className="w-6 h-6" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-600">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-500">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
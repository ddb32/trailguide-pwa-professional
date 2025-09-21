/**
 * AdminAnalyticsDashboard Component
 * Enhanced admin analytics dashboard with interactive charts
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { LineChart, BarChart, PieChart, AreaChart } from '../charts';
import { Icon } from '../common/Icon';
import { Button } from '../common/Button/Button';

const AdminAnalyticsDashboard = ({
  usageStats = null,
  isLoading = false,
  period = 30
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const [selectedView, setSelectedView] = useState('overview');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin.usage.title')}
          </h2>
        </div>

        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="mt-6 h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!usageStats || !usageStats.daily_usage) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('admin.usage.title')}
          </h2>
        </div>

        <div className="text-center py-8">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">
            {t('admin.usage.noData')}
          </p>
        </div>
      </div>
    );
  }

  const { daily_usage = [], device_stats = [], geographic_stats = [] } = usageStats;

  // Calculate totals
  const totalViews = daily_usage.reduce((sum, day) => sum + day.total_views, 0);
  const totalUniqueVisitors = daily_usage.reduce((sum, day) => sum + day.unique_visitors, 0);
  const avgCompletionRate = daily_usage.length > 0
    ? daily_usage.reduce((sum, day) => sum + day.completion_rate, 0) / daily_usage.length
    : 0;

  // Prepare chart data
  const dailyChartData = daily_usage.slice(-14).map(day => ({
    date: new Date(day.date).toLocaleDateString('he-IL'),
    views: day.total_views,
    visitors: day.unique_visitors,
    completions: day.completions || (day.total_views * day.completion_rate)
  }));

  const deviceChartData = device_stats.slice(0, 5).map(device => ({
    name: device.device_type,
    value: device.usage_count,
    percentage: device.percentage || 0
  }));

  const geographicChartData = geographic_stats.slice(0, 10).map(country => ({
    name: country.country_code || 'Unknown',
    value: country.usage_count,
    country: country.country_name || 'Unknown'
  }));

  // Chart configurations
  const dailyTrendLines = [
    { dataKey: 'views', name: t('admin.usage.views'), color: '#3B82F6' },
    { dataKey: 'visitors', name: t('admin.usage.visitors'), color: '#10B981' },
    { dataKey: 'completions', name: t('admin.usage.completions'), color: '#F59E0B' }
  ];

  const usageAreaData = dailyChartData.map(day => ({
    ...day,
    totalEngagement: day.views + day.visitors + day.completions
  }));

  const usageAreas = [
    { dataKey: 'views', name: t('admin.usage.views'), color: '#3B82F6', stackId: 'usage' },
    { dataKey: 'visitors', name: t('admin.usage.visitors'), color: '#10B981', stackId: 'usage' },
    { dataKey: 'completions', name: t('admin.usage.completions'), color: '#F59E0B', stackId: 'usage' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin.usage.title')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('admin.usage.subtitle', { period })}
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['overview', 'trends', 'devices', 'geographic'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedView === view
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(`admin.usage.views.${view}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {totalViews.toLocaleString()}
            </div>
            <div className="text-sm text-blue-700">
              {t('admin.usage.totalViews')}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {totalUniqueVisitors.toLocaleString()}
            </div>
            <div className="text-sm text-green-700">
              {t('admin.usage.uniqueVisitors')}
            </div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(avgCompletionRate * 100)}%
            </div>
            <div className="text-sm text-orange-700">
              {t('admin.usage.avgCompletionRate')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {selectedView === 'overview' && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              📊 {t('admin.usage.overviewChart')}
            </h3>
            <AreaChart
              data={usageAreaData}
              areas={usageAreas}
              height={350}
              showGrid={true}
              showLegend={true}
              yAxisLabel={t('admin.usage.usageCount')}
            />
          </>
        )}

        {selectedView === 'trends' && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              📈 {t('admin.usage.dailyTrend')}
            </h3>
            <LineChart
              data={dailyChartData}
              lines={dailyTrendLines}
              height={350}
              showGrid={true}
              showLegend={true}
              yAxisLabel={t('admin.usage.count')}
            />
          </>
        )}

        {selectedView === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                📱 {t('admin.usage.deviceDistribution')}
              </h3>
              <PieChart
                data={deviceChartData}
                height={300}
                showLabels={true}
                showLegend={true}
                labelFormatter={(value, entry) => `${value} (${entry.payload.value})`}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                📊 {t('admin.usage.deviceStats')}
              </h3>
              <BarChart
                data={deviceChartData}
                bars={[{ dataKey: 'value', name: t('admin.usage.usage'), color: '#3B82F6' }]}
                height={300}
                layout="vertical"
                showGrid={true}
                showLegend={false}
              />
            </div>
          </div>
        )}

        {selectedView === 'geographic' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                🌍 {t('admin.usage.geographicDistribution')}
              </h3>
              <BarChart
                data={geographicChartData}
                bars={[{ dataKey: 'value', name: t('admin.usage.usage'), color: '#10B981' }]}
                height={300}
                layout="vertical"
                showGrid={true}
                showLegend={false}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                🗺️ {t('admin.usage.topRegions')}
              </h3>
              <div className="space-y-3">
                {geographicChartData.map((country, index) => (
                  <div key={country.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{country.country || country.name}</div>
                        <div className="text-sm text-gray-500">{country.name}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {country.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insights Panel */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon name="LightBulbIcon" className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.usage.insights.title')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-md font-medium text-green-900">
              📈 {t('admin.usage.insights.trends')}
            </h4>
            <ul className="space-y-2 text-sm text-green-800">
              <li>• {totalViews > 1000 ? t('admin.usage.insights.highTraffic') : t('admin.usage.insights.growingTraffic')}</li>
              <li>• {avgCompletionRate > 0.7 ? t('admin.usage.insights.goodEngagement') : t('admin.usage.insights.improvementNeeded')}</li>
              <li>• {device_stats.find(d => d.device_type === 'mobile')?.usage_count > totalViews * 0.6 ? t('admin.usage.insights.mobileFirst') : t('admin.usage.insights.desktopDominant')}</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-md font-medium text-blue-900">
              💡 {t('admin.usage.insights.recommendations')}
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• {t('admin.usage.insights.rec1')}</li>
              <li>• {t('admin.usage.insights.rec2')}</li>
              <li>• {t('admin.usage.insights.rec3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;